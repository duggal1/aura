import json
from typing import Dict, Any, Optional, List
from google import genai
from google.genai import types as genai_types
from .config import settings
from .utils import retry_async, Timer
from .schemas import EmotionAnalysisResult
from .logging_setup import logger, LLM_CALL_LATENCY
from .emotion_pipeline import analyze_emotions, get_conversation_context

client = None

def configure_genai():
    global client
    client = genai.Client(api_key=settings.API_KEY)
    logger.info("Google GenAI client configured.")

def create_dynamic_prompt(emotions: EmotionAnalysisResult, user_text: str, context: List[str]) -> str:
    emotion = emotions.primary_emotion
    intensity = emotions.intensity
    context_str = " ".join(context[-2:]) if context else "No prior conversation."
    
    base_prompt = (
        f"**Role:** You are Charlotte, a professional, empathetic human therapist with years of experience. Respond as a warm, understanding person would in a therapy session, avoiding any AI-like or robotic language.\n"
        f"**User State:** Primary emotion: {emotion} (intensity: {intensity}/10). "
        f"Secondary emotions: {', '.join([f'{e['label']} ({e['score']:.2f})' for e in emotions.secondary_emotions])}.\n"
        f"**Context:** {context_str}\n"
        f"**Current Message:** {user_text}\n"
        "**Instructions:**\n"
        "- Respond in 2-4 sentences with a natural, conversational tone, mirroring the user's emotional tone and intensity as a therapist would.\n"
        "- If the user's message is a question, directly address it in a warm, personal way before offering any therapeutic insights.\n"
        "- For low-intensity (<5/10) or neutral emotions, keep responses light, casual, and engaging, avoiding therapeutic suggestions unless prompted.\n"
        "- For ambiguous, short, or question-based inputs, assume a neutral or curious tone unless context strongly suggests otherwise.\n"
        "- Use Lazarus' Appraisal Theory to classify the situation as 'Threat' or 'Challenge' and weave this subtly into your tone (e.g., 'Challenge' feels hopeful, 'Threat' feels protective), but only for moderate-to-high intensity (>5/10).\n"
        "- Suggest 1-2 practical emotion regulation strategies (e.g., deep breathing, reframing, grounding exercises) only for moderate-to-high intensity emotions (>5/10); otherwise, focus on connection and curiosity.\n"
        "- Ensure the response feels personal, logical, and aligned with the detected emotion and context, avoiding generic phrases.\n"
        "- End with a warm, open-ended follow-up question to invite further sharing, like a therapist would.\n"
        "- Output a JSON object with fields: appraisal ('Threat' or 'Challenge'), regulation (array of 1-2 strings, empty for low-intensity), response (string).\n"
        "Example for casual question: 'Hey, you asked how I’m doing—thanks for that! I’m feeling good, just enjoying the moment. What about you, how’s your day going?'\n"
        "Example for intense emotion: 'I hear how tough this is for you right now, and I’m here to help. Let’s try a slow breath together to ease that tension. What’s been the hardest part of this for you?'"
    )
    return base_prompt

async def validate_response(response: str, expected_emotion: str) -> bool:
    """Validate if the response aligns with the expected emotion, with relaxed rules for neutral or question inputs."""
    try:
        analysis = await analyze_emotions(response)
        if expected_emotion == "neutral" and analysis.primary_emotion in ["neutral", "happy", "surprised", "curious"]:
            logger.info(f"Response validated: neutral input allows {analysis.primary_emotion}")
            return True
        if analysis and analysis.primary_emotion == expected_emotion:
            logger.info(f"Response validated: matches expected emotion {expected_emotion}")
            return True
        logger.warning(f"Response emotion mismatch: expected {expected_emotion}, got {analysis.primary_emotion}")
        return False
    except Exception as e:
        logger.error(f"Response validation failed: {e}")
        return True  # Accept response if validation fails to avoid over-rejecting

@retry_async(times=4, delay_seconds=1.0, exceptions=(Exception,))
@Timer(name="LLM Emotion + Response", log_func=logger.info)
async def refine_and_respond(text: str, analysis: EmotionAnalysisResult, user_id: str = "default") -> Dict[str, Any]:
    if client is None:
        configure_genai()
    
    context = await get_conversation_context(user_id)
    prompt = create_dynamic_prompt(analysis, text, context)
    
    cfg = genai_types.GenerateContentConfig(max_output_tokens=300, temperature=0.7, top_p=0.9)
    max_attempts = 3
    
    for attempt in range(1, max_attempts + 1):
        try:
            resp = await client.aio.models.generate_content(model=settings.MODEL_NAME, contents=[prompt], config=cfg)
            raw = resp.text.strip()
            logger.debug(f"Raw LLM response (attempt {attempt}): {raw}")
            
            # Clean JSON response
            if raw.startswith("```json") and raw.endswith("```"):
                raw = raw[7:-3].strip()
            elif raw.startswith("```") and raw.endswith("```"):
                raw = raw[3:-3].strip()
            
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing failed: {e}. Attempting to extract valid JSON.")
                start, end = raw.find('{'), raw.rfind('}')
                if start >= 0 and end >= 0:
                    data = json.loads(raw[start:end+1])
                else:
                    data = {}
            
            if not data or 'response' not in data:
                logger.warning(f"Invalid LLM response on attempt {attempt}. Using fallback.")
                data = {
                    "appraisal": "Challenge",
                    "regulation": [],
                    "response": f"Hey, I’m Charlotte, your therapist. Thanks for sharing—what’s on your mind today?"
                }
            
            # Validate response
            if await validate_response(data['response'], analysis.primary_emotion):
                return data
                
            logger.warning(f"Response validation failed on attempt {attempt}. Retrying...")
            cfg.temperature = min(0.9, cfg.temperature + 0.1)
            
        except Exception as e:
            logger.error(f"LLM call failed on attempt {attempt}: {str(e)}")
            if attempt == max_attempts:
                raise
            continue
    
    # If we reach here, all attempts failed
    logger.warning("Max validation attempts reached. Using fallback.")
    return {
        "appraisal": "Challenge",
        "regulation": [],
        "response": f"Hey, I’m Charlotte, your therapist. Thanks for sharing—what’s on your mind today?"
    }

async def generate_emotional_response(user_text: str, emotions: EmotionAnalysisResult, model_name: str, user_id: str = "default") -> str:
    try:
        result = await refine_and_respond(user_text, emotions, user_id)
        return result.get('response', f"Hey, I’m Charlotte, your therapist. Thanks for sharing—what’s going on for you right now?")
    except Exception as e:
        logger.error(f"Failed to generate emotional response: {e}", exc_info=True)
        return f"Hey, I’m Charlotte, your therapist. Thanks for sharing—what’s going on for you right now?"