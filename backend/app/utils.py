import asyncio
import time
from functools import wraps
from typing import Callable, Any, Coroutine
from .config import settings
from .logging_setup import logger

# --- Circuit Breaker ---
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.last_failure_time = None
        self.is_open = False

    @wraps(lambda x: x)  # Apply wraps to the method itself
    async def __call__(self, func: Callable[..., Coroutine[Any, Any, Any]]):
        async def wrapper(*args, **kwargs):
            if self.is_open:
                if self.last_failure_time and (time.time() - self.last_failure_time) > self.reset_timeout:
                    logger.info(f"Circuit breaker resetting for {func.__name__}")
                    self.is_open = False
                    self.failures = 0
                else:
                    logger.error(f"Circuit breaker open for {func.__name__}. Service unavailable.")
                    raise RuntimeError("Service temporarily unavailable due to repeated failures.")
            
            try:
                result = await func(*args, **kwargs)
                self.failures = 0  # Reset on success
                return result
            except Exception as e:
                self.failures += 1
                self.last_failure_time = time.time()
                logger.error(f"Failure {self.failures}/{self.failure_threshold} in {func.__name__}: {e}")
                if self.failures >= self.failure_threshold:
                    self.is_open = True
                    logger.error(f"Circuit breaker opened for {func.__name__} after {self.failures} failures.")
                raise
        return wrapper

# --- Retry Decorator ---
def retry_async(
    times: int = settings.RETRY_ATTEMPTS,
    delay_seconds: float = settings.RETRY_DELAY_SECONDS,
    backoff_factor: float = 1.5,
    exceptions: tuple = (Exception,)
):
    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        circuit_breaker = CircuitBreaker()
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay_seconds
            last_exception = None
            for attempt in range(1, times + 1):
                try:
                    # Apply circuit breaker
                    wrapped_func = await circuit_breaker(func)
                    return await wrapped_func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    logger.warning(
                        f"Attempt {attempt}/{times} failed for {func.__name__}. "
                        f"Error: {type(e).__name__}: {e}. Retrying in {current_delay:.2f}s..."
                    )
                    if attempt < times:
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff_factor
                    else:
                        logger.error(
                            f"All {times} retry attempts failed for {func.__name__}. Last error: {type(e).__name__}: {e}"
                        )
            if last_exception:
                raise last_exception
            return None
        return wrapper
    return decorator

# --- Timing Decorator/Context Manager ---
class Timer:
    """Context manager and decorator for timing code blocks or functions."""
    def __init__(self, name: str = "Operation", log_func=logger.debug):
        self.name = name
        self.log_func = log_func
        self._start_time = None

    async def __aenter__(self):
        self._start_time = time.perf_counter()
        self.log_func(f"Starting '{self.name}'...")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._start_time is None:
            return

        elapsed_time = time.perf_counter() - self._start_time
        status = "completed successfully" if exc_type is None else f"failed with {exc_type.__name__}"
        self.log_func(f"'{self.name}' {status} in {elapsed_time:.4f} seconds.")
        self._start_time = None

    def __call__(self, func: Callable[..., Coroutine[Any, Any, Any]]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            timer_name = self.name if self.name != "Operation" else func.__name__
            start_time = time.perf_counter()
            self.log_func(f"Starting '{timer_name}'...")
            try:
                result = await func(*args, **kwargs)
                status = "completed successfully"
                return result
            except Exception as e:
                status = f"failed with {type(e).__name__}"
                raise
            finally:
                elapsed_time = time.perf_counter() - start_time
                self.log_func(f"'{timer_name}' {status} in {elapsed_time:.4f} seconds.")
        return wrapper