# emotion_pipeline.py

import torch
from typing import List, Optional, Dict, Any
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
from pydantic import ValidationError
from .config import settings
from .utils import retry_async, Timer
from .schemas import EmotionAnalysisResult, EmotionDistribution
from .logging_setup import logger, EMOTION_PRIMARY_COUNTER
from .cache import get_redis

_emotion_pipeline = None
_sentiment_pipeline = None
_sarcasm_pipeline = None

def load_models():
    """Loads the emotion, sentiment, and sarcasm models."""
    global _emotion_pipeline, _sentiment_pipeline, _sarcasm_pipeline
    if _emotion_pipeline:
        logger.info("Models already loaded.")
        return
    device = 0 if torch.cuda.is_available() else -1
    logger.info(f"Attempting to load models on device: {'cuda:0' if device == 0 else 'cpu'}")

    try:
        emo_tok = AutoTokenizer.from_pretrained(settings.EMO_MODEL)
        emo_mod = AutoModelForSequenceClassification.from_pretrained(settings.EMO_MODEL)
        _emotion_pipeline = pipeline(
            "text-classification",
            model=emo_mod,
            tokenizer=emo_tok,
            device=device,
            top_k=None
        )
        logger.info(f"Successfully loaded emotion model: {settings.EMO_MODEL}")
        if hasattr(emo_mod.config, 'id2label'):
            logger.info(f"Loaded emotion model labels from config: {list(emo_mod.config.id2label.values())}")
        else:
            logger.warning("Could not retrieve labels directly from emotion model config.")
    except Exception as e:
        logger.error(f"Failed to load emotion model {settings.EMO_MODEL}: {e}", exc_info=True)
        _emotion_pipeline = None

    try:
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=device
        )
        logger.info("Successfully loaded sentiment model.")
    except Exception as e:
        logger.error(f"Failed to load sentiment model: {e}", exc_info=True)
        _sentiment_pipeline = None

    try:
        sar_tok = AutoTokenizer.from_pretrained(settings.SARCASM_MODEL)
        sar_mod = AutoModelForSequenceClassification.from_pretrained(settings.SARCASM_MODEL)
        _sarcasm_pipeline = pipeline(
            "text-classification",
            model=sar_mod,
            tokenizer=sar_tok,
            device=device,
            top_k=None
        )
        logger.info(f"Successfully loaded sarcasm model: {settings.SARCASM_MODEL}")
        if hasattr(sar_mod.config, 'id2label'):
            logger.info(f"Loaded sarcasm model labels from config: {list(sar_mod.config.id2label.values())}")
        else:
            logger.warning("Could not retrieve labels directly from sarcasm model config.")
    except Exception as e:
        logger.warning(f"Sarcasm pipeline load failed for {settings.SARCASM_MODEL}: {e}", exc_info=True)
        _sarcasm_pipeline = None

load_emotion_model = load_models

async def get_conversation_context(user_id: str, max_messages: int = 2) -> List[str]:
    """Fetches recent chat messages for a user from Redis."""
    try:
        redis_conn = await get_redis()
        messages_bytes = await redis_conn.lrange(f"chat_history:{user_id}", 0, max_messages - 1)
        return [msg.decode('utf-8') if isinstance(msg, bytes) else str(msg) for msg in messages_bytes]
    except ConnectionError:
        logger.warning(f"Redis connection error fetching history for user {user_id}.")
        return []
    except Exception as e:
        logger.warning(f"Failed to fetch conversation history for user {user_id}: {type(e).__name__} - {e}")
        return []

def preprocess_text(text: str, context: List[str]) -> str:
    """Prepares text for analysis, adding context only for emotionally significant short inputs."""
    text = text.strip().lower()
    if len(text.split()) < 5 and context:
        emotional_keywords = {"sad", "happy", "angry", "fear", "died", "love", "hate"}
        # Only include context if the current message has emotional cues
        if any(kw in text for kw in emotional_keywords):
            relevant_context = [msg for msg in context if any(kw in msg.lower() for kw in emotional_keywords)]
            if relevant_context:
                context_str = " ".join(relevant_context[-2:])
                logger.debug(f"Adding context for short input: {context_str}")
                return f"Conversation context: {context_str} Current message: {text}"
    return text

def map_emotions(dist: Dict[str, float]) -> Dict[str, float]:
    """Maps raw model emotion labels to friendly names and normalizes scores."""
    friendly: Dict[str, float] = {}
    valid_friendly_labels = settings.VALID_FRIENDLY_LABELS
    raw_to_friendly_map = settings.EMOTION_LABELS
    total_score = sum(dist.values())

    if total_score == 0:
        logger.warning(f"Total score of raw distribution is zero: {dist}. Cannot normalize.")
        for label, score in dist.items():
            mapped = raw_to_friendly_map.get(label.lower(), label.lower())
            if mapped in valid_friendly_labels:
                friendly[mapped] = 0.0
    else:
        for label, score in dist.items():
            mapped = raw_to_friendly_map.get(label.lower(), label.lower())
            if mapped in valid_friendly_labels:
                normalized_score = round(score / total_score, 5)
                friendly[mapped] = friendly.get(mapped, 0) + normalized_score
            else:
                logger.debug(f"Ignoring label '{label}' mapped to '{mapped}' (score: {score}) as '{mapped}' is not in valid friendly labels: {valid_friendly_labels}")

    if not friendly:
        logger.warning(f"No valid emotions mapped from distribution: {dist}. Falling back to neutral.")
        friendly = {"neutral": 0.5}

    final_total = sum(friendly.values())
    if final_total > 0 and abs(final_total - 1.0) > 1e-5:
        logger.debug(f"Renormalizing friendly distribution. Initial sum: {final_total:.5f}")
        try:
            friendly = {k: round(v / final_total, 5) for k, v in friendly.items()}
        except ZeroDivisionError:
            logger.error("Division by zero during final renormalization, returning original friendly map.")

    logger.info(f"Raw distribution: {dist}")
    logger.info(f"Mapped distribution: {friendly}")
    return friendly

@retry_async(times=settings.RETRY_ATTEMPTS, delay_seconds=settings.RETRY_DELAY_SECONDS, exceptions=(RuntimeError, ConnectionError))
@Timer(name="Advanced Emotion Analysis", log_func=logger.info)
async def analyze_emotions(text: str, user_id: str = "default") -> Optional[EmotionAnalysisResult]:
    """Analyzes text for emotions, optionally considering context and sarcasm."""
    load_emotion_model()

    if not text or not text.strip():
        logger.warning("Empty input provided for emotion analysis.")
        return EmotionAnalysisResult(
            distribution=EmotionDistribution(root={"neutral": 1.0}),
            primary_emotion="neutral", primary_score=1.0, intensity=5.0,
            secondary_emotions=[], model_used=settings.EMO_MODEL + " (empty input)"
        )

    context = await get_conversation_context(user_id)
    processed_text = preprocess_text(text, context)
    logger.debug(f"Context used: {context}")
    logger.debug(f"Processed text: {processed_text}")

    if not _emotion_pipeline:
        logger.error("Emotion analysis pipeline is not initialized. Cannot process request.")
        return EmotionAnalysisResult(
            distribution=EmotionDistribution(root={"neutral": 0.5}),
            primary_emotion="neutral", primary_score=0.5, intensity=5.0,
            secondary_emotions=[], model_used="unavailable (pipeline load failed)"
        )

    dist = {}
    try:
        raw_output = _emotion_pipeline(processed_text)
        logger.debug(f"Raw output from emotion pipeline: {raw_output}")

        if not raw_output or not isinstance(raw_output, list) or not raw_output[0]:
            logger.error(f"Unexpected output format from emotion pipeline (expected List[List[Dict]]): {raw_output}")
            scores_list = []
        elif isinstance(raw_output[0], list) and all(isinstance(item, dict) for item in raw_output[0]):
            scores_list = raw_output[0]
        elif isinstance(raw_output[0], dict) and all(isinstance(item, dict) for item in raw_output):
            logger.warning(f"Pipeline returned List[Dict] instead of List[List[Dict]]. Adapting.")
            scores_list = raw_output
        else:
            logger.error(f"Unexpected inner element type in pipeline output: {type(raw_output[0])}. Output: {raw_output}")
            scores_list = []

        if not all('label' in item and 'score' in item for item in scores_list):
            logger.error(f"Inner list contains invalid elements (missing 'label' or 'score'): {scores_list}")
            scores_list = [item for item in scores_list if 'label' in item and 'score' in item]
            if not scores_list:
                logger.error("No valid scores found after filtering.")

        dist = {item['label'].lower(): float(item['score']) for item in scores_list}
    except RuntimeError as rte:
        logger.error(f"RuntimeError during emotion pipeline inference: {rte}", exc_info=True)
        dist = {}
    except Exception as e:
        logger.error(f"Error during emotion pipeline inference: {type(e).__name__} - {e}", exc_info=True)
        dist = {}

    if _sarcasm_pipeline and len(text) >= 10:
        try:
            sarcasm_raw_output = _sarcasm_pipeline(text)
            logger.debug(f"Raw output from sarcasm pipeline: {sarcasm_raw_output}")

            sarcasm_scores_list = []
            if not sarcasm_raw_output or not isinstance(sarcasm_raw_output, list) or not sarcasm_raw_output[0]:
                logger.warning(f"Unexpected output format from sarcasm pipeline: {sarcasm_raw_output}")
            elif isinstance(sarcasm_raw_output[0], list) and all(isinstance(item, dict) for item in sarcasm_raw_output[0]):
                sarcasm_scores_list = sarcasm_raw_output[0]
            elif isinstance(sarcasm_raw_output[0], dict) and all(isinstance(item, dict) for item in sarcasm_raw_output):
                logger.warning(f"Sarcasm pipeline returned List[Dict]. Adapting.")
                sarcasm_scores_list = sarcasm_raw_output
            else:
                logger.warning(f"Unexpected inner element type in sarcasm pipeline output: {type(sarcasm_raw_output[0])}.")

            if sarcasm_scores_list:
                if not all('label' in item and 'score' in item for item in sarcasm_scores_list):
                    logger.warning(f"Sarcasm pipeline returned invalid elements: {sarcasm_scores_list}")
                else:
                    sarcasm_score = 0.0
                    detected_sarcasm_label = None
                    possible_sarcasm_raw_labels = {k for k, v in settings.EMOTION_LABELS.items() if v == 'sarcastic'} | {'label_1'}

                    for item in sarcasm_scores_list:
                        raw_label = item.get('label', '').lower()
                        if raw_label in possible_sarcasm_raw_labels:
                            score = item.get('score', 0.0)
                            if score > sarcasm_score:
                                sarcasm_score = score
                                detected_sarcasm_label = raw_label

                    if detected_sarcasm_label and sarcasm_score > 0.7:
                        logger.info(f"Sarcasm detected (Label: {detected_sarcasm_label}, Score: {sarcasm_score:.3f}). Adding 'sarcasm' score.")
                        dist['sarcasm'] = dist.get('sarcasm', 0) + sarcasm_score
        except Exception as e:
            logger.warning(f"Sarcasm detection step failed: {type(e).__name__} - {e}", exc_info=True)

    if not dist:
        logger.warning("Emotion distribution is empty after inference attempt(s). Using neutral fallback.")
        friendly_distribution = {"neutral": 0.7}
    else:
        friendly_distribution = map_emotions(dist)

    # Boost neutral for short inputs or conversational questions
    if len(text.split()) < 5 or any(q in text.lower() for q in ["how", "what", "why", "where", "when"]):
        max_score = max(friendly_distribution.values())
        if max_score < 0.7:
            logger.debug(f"Short or question input with low-confidence scores (max: {max_score}). Boosting neutral probability.")
            friendly_distribution['neutral'] = max(friendly_distribution.get('neutral', 0), 0.7)
            # Renormalize
            total = sum(friendly_distribution.values())
            if total > 0:
                friendly_distribution = {k: v / total for k, v in friendly_distribution.items()}

    result: Optional[EmotionAnalysisResult] = None
    try:
        dist_model = EmotionDistribution(root=friendly_distribution)
        validated_distribution = dist_model.root

        if not validated_distribution:
            primary_emotion = "neutral"
            primary_score = 0.7
            logger.error("Validated distribution is unexpectedly empty, defaulting to neutral.")
        else:
            primary_emotion, primary_score = max(validated_distribution.items(), key=lambda item: item[1])

        # Re-analyze without context if score is too high
        if primary_score > 0.75 and context:
            logger.debug("High confidence score detected, re-analyzing without context.")
            raw_output = _emotion_pipeline(text)
            dist = {item['label'].lower(): float(item['score']) for item in raw_output[0]}
            friendly_distribution = map_emotions(dist)
            dist_model = EmotionDistribution(root=friendly_distribution)
            validated_distribution = dist_model.root
            primary_emotion, primary_score = max(dist_model.root.items(), key=lambda item: item[1])

        intensity = round(min(primary_score * 7, 7), 2)  # Cap intensity at 7 to avoid overreaction
        EMOTION_PRIMARY_COUNTER.labels(emotion_label=primary_emotion).inc()

        secondary_emotions = [
            {"label": k, "score": round(v, 5)}
            for k, v in validated_distribution.items()
            if k != primary_emotion
        ]
        secondary_emotions.sort(key=lambda x: x['score'], reverse=True)

        result = EmotionAnalysisResult(
            distribution=dist_model,
            primary_emotion=primary_emotion,
            primary_score=primary_score,
            intensity=intensity,
            secondary_emotions=secondary_emotions,
            model_used=settings.EMO_MODEL
        )
        logger.info(f"Emotion analysis successful: Primary={primary_emotion} ({primary_score:.3f})")
    except (ValidationError, ValueError) as val_err:
        logger.error(f"Validation Error creating emotion result: {val_err}", exc_info=True)
        logger.warning(f"Input distribution leading to error: {friendly_distribution}")
    except Exception as e:
        logger.error(f"Unexpected error finalizing emotion result: {type(e).__name__} - {e}", exc_info=True)
        logger.warning(f"Input distribution leading to error: {friendly_distribution}")

    if result is None:
        logger.warning("Using neutral fallback due to error during emotion result creation.")
        try:
            result = EmotionAnalysisResult(
                distribution=EmotionDistribution(root={"neutral": 0.7}),
                primary_emotion="neutral",
                primary_score=0.7,
                intensity=4.9,
                secondary_emotions=[],
                model_used=settings.EMO_MODEL + " (fallback)"
            )
        except Exception as fallback_e:
            logger.critical(f"CRITICAL: Failed to create even the fallback EmotionAnalysisResult: {fallback_e}", exc_info=True)
            return None

    try:
        redis_conn = await get_redis()
        await redis_conn.lpush(f"chat_history:{user_id}", text)
        await redis_conn.ltrim(f"chat_history:{user_id}", 0, 9)
    except ConnectionError:
        logger.warning(f"Redis connection error updating history for user {user_id}.")
    except Exception as e:
        logger.warning(f"Failed to update chat history for user {user_id}: {type(e).__name__} - {e}")

    return result