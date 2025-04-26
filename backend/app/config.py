# config.py
from pydantic_settings import BaseSettings
from loguru import logger # Keep this top-level import for the warning logs inside __init__
from typing import Dict, Set

class Settings(BaseSettings):
    MODEL_NAME: str = "gemini-2.0-flash"
    EMO_MODEL: str = "j-hartmann/emotion-english-distilroberta-base"
    SARCASM_MODEL: str = "jkhan447/sarcasm-detection-RoBerta-base-POS"
    API_KEY: str = "YOUR_API_KEY_HERE" # Default or load from .env

    # --- Corrected EMOTION_LABELS ---
    _RAW_TO_FRIENDLY_MAP: Dict[str, str] = {
        "anger": "angry",
        "disgust": "disgusted",
        "fear": "fearful",
        "joy": "happy",
        "neutral": "neutral",
        "sadness": "sad",
        "surprise": "surprised",
        "sarcasm": "sarcastic",
        "label_1": "sarcastic", # Example if sarcasm model uses LABEL_1
        "label_0": "not_sarcastic", # Example
    }
    VALID_FRIENDLY_LABELS: Set[str] = set(_RAW_TO_FRIENDLY_MAP.values()) | {"neutral", "sarcastic"}

    @property
    def EMOTION_LABELS(self) -> Dict[str, str]:
        return self._RAW_TO_FRIENDLY_MAP
    # --- End of Corrected EMOTION_LABELS ---

    REDIS_URL: str = "redis://localhost:6379/0"
    RETRY_ATTEMPTS: int = 3
    RETRY_DELAY_SECONDS: float = 1.0
    LOG_LEVEL: str = "INFO"
    LOG_ROTATION: str = "10 MB"
    LOG_RETENTION: str = "7 days"
    LOG_FILE_PATH: str = "backend_logs/app_{time}.log"
    PROMETHEUS_PORT: int = 8001
    CACHE_TTL: int = 3600 # Cache responses for 1 hour

    def __init__(self, **values):
        super().__init__(**values)
        # Use the logger imported at the top for these warnings during init
        if not self.API_KEY or self.API_KEY == "YOUR_API_KEY_HERE":
            logger.warning("API_KEY is not set or is using the default placeholder in config.py or .env file. LLM calls will likely fail.")
        if not self.REDIS_URL:
            logger.warning("REDIS_URL is empty. Redis caching and history will be disabled.")
        elif not self.REDIS_URL.startswith(("redis://", "rediss://", "unix://")):
            logger.error(f"Invalid REDIS_URL scheme: {self.REDIS_URL}. Must start with redis://, rediss://, or unix://.")

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Instantiate the settings object
settings = Settings()

# --- REMOVED THE LOGGER CALL FROM HERE ---
# logger.info(f"Valid friendly emotion labels configured: {settings.VALID_FRIENDLY_LABELS}") # <- REMOVE THIS LINE