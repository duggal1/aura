import sys
from loguru import logger
from prometheus_client import Counter, Histogram, start_http_server, REGISTRY, PROCESS_COLLECTOR, PLATFORM_COLLECTOR
from .config import settings
import time

# Remove default Python metrics to avoid label conflicts
REGISTRY.unregister(PROCESS_COLLECTOR)
REGISTRY.unregister(PLATFORM_COLLECTOR)

REQUEST_COUNTER = Counter(
    "chat_requests_total",
    "Total number of chat requests processed",
    ["status"]
)

REQUEST_LATENCY = Histogram(
    "chat_request_latency_seconds",
    "Histogram of chat request latency in seconds",
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, float('inf')]
)

EMOTION_ANALYSIS_LATENCY = Histogram(
    "emotion_analysis_latency_seconds",
    "Histogram of emotion analysis latency in seconds",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, float('inf')]
)

LLM_CALL_LATENCY = Histogram(
    "llm_call_latency_seconds",
    "Histogram of LLM API call latency in seconds",
    buckets=[0.5, 1.0, 2.0, 3.0, 5.0, 10.0, float('inf')]
)

EMOTION_PRIMARY_COUNTER = Counter(
    "emotion_primary_detected_total",
    "Count of primary emotions detected in user input",
    ["emotion_label"]
)

RESPONSE_ALIGNMENT_SUCCESS = Counter(
    "response_emotional_alignment_total",
    "Count of responses that align with detected user emotion",
    ["aligned"]
)

logger.remove()

logger.add(
    sys.stderr,
    level=settings.LOG_LEVEL.upper(),
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    colorize=True,
    backtrace=True,
    diagnose=True
)

logger.add(
    settings.LOG_FILE_PATH,
    rotation=settings.LOG_ROTATION,
    retention=settings.LOG_RETENTION,
    compression="zip",
    level=settings.LOG_LEVEL.upper(),
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
    serialize=False,
    backtrace=True,
    diagnose=True,
    enqueue=True,
    catch=True
)

def start_metrics_server():
    """Starts the Prometheus metrics server in a separate thread."""
    try:
        start_http_server(settings.PROMETHEUS_PORT)
        logger.info(f"Prometheus metrics server started on port {settings.PROMETHEUS_PORT}")
    except OSError as e:
        logger.warning(f"Could not start Prometheus server on port {settings.PROMETHEUS_PORT} (maybe already running?): {e}")
    except Exception as e:
        logger.error(f"Failed to start Prometheus metrics server: {e}", exc_info=True)