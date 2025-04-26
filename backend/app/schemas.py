# schemas.py
from pydantic import BaseModel, Field, field_validator, ConfigDict, ValidationError
from typing import Dict, Any, List

# --- Import the config module itself, not the settings object directly ---
from . import config
# --- Import logger at top level ---
from .logging_setup import logger


class EmotionDistribution(BaseModel):
    root: Dict[str, float]
    model_config = ConfigDict(protected_namespaces=()) # Allow 'root'

    @field_validator("root", mode="before")
    @classmethod
    def ensure_valid_labels_and_values(cls, v):
        """
        Validates that the input is a dictionary, all keys are known friendly labels,
        and all values are valid floats (probabilities).
        Uses config.settings to access configuration.
        """
        # No local imports needed now

        if not isinstance(v, dict):
            raise TypeError("Input distribution must be a dictionary.")

        # --- Access settings via the imported config module ---
        valid_labels = config.settings.VALID_FRIENDLY_LABELS
        invalid_keys = set()
        value_errors = {}

        for key, score in v.items():
            if key not in valid_labels:
                invalid_keys.add(key)
            try:
                float_score = float(score)
                # Optional range check
                # if not (0.0 <= float_score <= 1.0):
                #    value_errors[key] = f"Score {float_score} out of range [0, 1]"
            except (ValueError, TypeError):
                value_errors[key] = f"Score '{score}' is not a valid float"

        error_messages = []
        if invalid_keys:
            msg = f"Invalid emotion label(s) found: {invalid_keys}. Valid options are: {valid_labels}"
            logger.error(msg) # Use logger imported at top
            error_messages.append(msg)
        if value_errors:
            msg = f"Invalid score value(s): {value_errors}"
            logger.error(msg) # Use logger imported at top
            error_messages.append(msg)

        if error_messages:
            raise ValueError(". ".join(error_messages))

        return v

class EmotionAnalysisResult(BaseModel):
    distribution: EmotionDistribution
    primary_emotion: str
    primary_score: float
    intensity: float
    secondary_emotions: List[Dict[str, Any]]
    model_used: str
    model_config = ConfigDict(protected_namespaces=())

    @field_validator('primary_emotion')
    @classmethod
    def primary_emotion_must_be_in_distribution(cls, v, values):
        # Pydantic v2 uses 'values.data' to access already validated fields
        if 'distribution' in values.data and v not in values.data['distribution'].root:
             raise ValueError(f"Primary emotion '{v}' not found in distribution keys: {values.data['distribution'].root.keys()}")
        return v

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    user_id: str = Field(default="default")

class ChatResponse(BaseModel):
    ai_response: str
    user_emotion_analysis: EmotionAnalysisResult
    response_id: str
    model_used: str
    from_cache: bool
    model_config = ConfigDict(protected_namespaces=())

class HealthStatus(BaseModel):
    status: str
    services: Dict[str, str]
    model_config = ConfigDict(protected_namespaces=())