import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import schemas, cache, emotion_pipeline, llm_service
from .config import settings
from .logging_setup import logger, REQUEST_COUNTER, REQUEST_LATENCY, start_metrics_server

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")
    start_metrics_server()
    await cache.init_redis_pool()
    emotion_pipeline.load_emotion_model()
    llm_service.configure_genai()
    try:
        redis = await cache.get_redis()
        await redis.flushdb()
        logger.info("Redis cache cleared on startup.")
    except Exception as e:
        logger.warning(f"Failed to clear Redis cache: {e}")
    logger.info("Startup complete.")
    yield
    logger.info("Shutting down...")
    await cache.close_redis_pool()
    logger.info("Shutdown complete.")

app = FastAPI(
    title="Ultra-Emotional LLM API",
    version="1.2.0",
    description="Delivers deeply emotional, human-like responses with advanced emotion analysis.",
    lifespan=lifespan,
)

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_request_id(request: Request) -> str:
    return request.headers.get("X-Request-ID", f"req_{uuid.uuid4().hex[:8]}")

@app.get("/health", tags=["System"], response_model=schemas.HealthStatus)
async def health_check():
    service_status = {"redis": "unavailable", "llm_api": "unknown", "emotion_model": "not_loaded"}
    overall_status = "unhealthy"
    try:
        redis = await cache.get_redis()
        await redis.ping()
        service_status["redis"] = "ok"
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")

    if hasattr(emotion_pipeline, '_emotion_pipeline') and emotion_pipeline._emotion_pipeline is not None:
        service_status["emotion_model"] = "loaded"
    
    service_status["llm_api"] = "configured"
    if service_status["redis"] == "ok" and service_status["emotion_model"] == "loaded":
        overall_status = "ok"

    code = status.HTTP_200_OK if overall_status == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content={"status": overall_status, "services": service_status})

@app.post("/chat", tags=["Chat"], response_model=schemas.ChatResponse)
async def chat_endpoint(req: schemas.ChatRequest, request_id: str = Depends(get_request_id)):
    start = time.perf_counter()
    logger.info(f"[ReqID: {request_id}] Chat request: '{req.message[:50]}...'")

    cache_key = f"chat_resp_v1.2:{uuid.uuid5(uuid.NAMESPACE_OID, req.message).hex}"
    try:
        cached = await cache.get_cached_data(cache_key)
        if cached:
            response = schemas.ChatResponse.model_validate(cached)
            response.from_cache = True
            REQUEST_COUNTER.labels(status="cache_hit").inc()
            lat = time.perf_counter() - start
            REQUEST_LATENCY.observe(lat)
            logger.info(f"[ReqID: {request_id}] Cache hit in {lat:.4f}s.")
            return response
    except Exception as e:
        logger.warning(f"[ReqID: {request_id}] Cache check error: {e}")

    try:
        emo_res = await emotion_pipeline.analyze_emotions(req.message, req.user_id)
        if emo_res is None:
            logger.error(f"[ReqID: {request_id}] Emotion analysis returned None.")
            REQUEST_COUNTER.labels(status="pipeline_error").inc()
            raise HTTPException(status_code=503, detail="Emotion analysis unavailable.")
        if emo_res.primary_emotion == "neutral" and emo_res.primary_score <= 0.5:
            logger.warning(f"[ReqID: {request_id}] Low-confidence emotion detected.")
    except Exception as e:
        logger.error(f"[ReqID: {request_id}] Emotion analysis error: {e}", exc_info=True)
        REQUEST_COUNTER.labels(status="pipeline_error").inc()
        raise HTTPException(status_code=500, detail=f"Emotion analysis error: {str(e)}")

    try:
        llm_res = await llm_service.generate_emotional_response(
            user_text=req.message,
            emotions=emo_res,
            model_name=settings.MODEL_NAME,
            user_id=req.user_id
        )
    except Exception as e:
        logger.error(f"[ReqID: {request_id}] LLM error: {e}", exc_info=True)
        REQUEST_COUNTER.labels(status="llm_error").inc()
        raise HTTPException(status_code=500, detail=f"AI response generation error: {str(e)}")

    final = schemas.ChatResponse(
        ai_response=llm_res,
        user_emotion_analysis=emo_res,
        response_id=request_id,
        model_used=settings.MODEL_NAME,
        from_cache=False
    )
    try:
        if emo_res.primary_score > 0.6:
            await cache.set_cached_data(cache_key, final.model_dump(), ttl_seconds=settings.CACHE_TTL)
            logger.info(f"[ReqID: {request_id}] Response cached.")
        else:
            logger.info(f"[ReqID: {request_id}] Skipped caching due to low-confidence emotion (score: {emo_res.primary_score}).")
    except Exception as e:
        logger.warning(f"[ReqID: {request_id}] Cache set error: {e}")

    elapsed = time.perf_counter() - start
    REQUEST_LATENCY.observe(elapsed)
    REQUEST_COUNTER.labels(status="success").inc()
    logger.info(f"[ReqID: {request_id}] Processed in {elapsed:.4f}s.")
    return final