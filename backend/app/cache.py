# cache.py
import redis.asyncio as redis
from redis.asyncio import Redis
from .logging_setup import logger
from typing import Optional, Any
import json
import asyncio

# Global Redis connection pool (initialized on app startup)
redis_pool: Optional[Redis] = None

async def init_redis_pool():
    """Initializes the Redis connection pool with retry logic."""
    from .config import settings  # Import here to avoid circular import
    global redis_pool
    if redis_pool is None:
        if not settings.REDIS_URL:
            logger.info("REDIS_URL is empty. Skipping Redis initialization.")
            return
        for attempt in range(1, settings.RETRY_ATTEMPTS + 1):
            try:
                # Ensure decode_responses=True for automatic decoding
                redis_pool = redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True, # Strings will be decoded automatically
                )
                await redis_pool.ping()
                redis_host_info = settings.REDIS_URL.split('@')[-1] if '@' in settings.REDIS_URL else settings.REDIS_URL
                logger.info(f"Successfully connected to Redis at {redis_host_info}")
                return
            except Exception as e:
                redis_host_info = settings.REDIS_URL.split('@')[-1] if '@' in settings.REDIS_URL else settings.REDIS_URL
                logger.warning(
                    f"Attempt {attempt}/{settings.RETRY_ATTEMPTS} failed to connect to Redis at "
                    f"{redis_host_info}: {e}"
                )
                if attempt < settings.RETRY_ATTEMPTS:
                    await asyncio.sleep(settings.RETRY_DELAY_SECONDS)
                else:
                     logger.error(f"Failed to initialize Redis connection after {settings.RETRY_ATTEMPTS} attempts.")
                     redis_pool = None
                     return

async def close_redis_pool():
    """Closes the Redis connection pool."""
    global redis_pool
    if redis_pool:
        try:
            # Call close() to release connections
            await redis_pool.close()
            # --- Removed await redis_pool.wait_closed() ---
            logger.info("Redis connection pool closed.")
        except Exception as e:
            logger.error(f"Error closing Redis connection pool: {e}", exc_info=True)
        finally:
             redis_pool = None


async def get_redis() -> Redis:
    """Returns the active Redis connection pool, raising an error if unavailable."""
    if redis_pool is None:
        logger.error("Attempted to get Redis connection, but the pool is not initialized or connection failed.")
        raise ConnectionError("Redis service is unavailable.")
    return redis_pool

async def get_cached_data(key: str) -> Optional[Any]:
    """Retrieves data from cache, deserializing from JSON if necessary."""
    try:
        redis_conn: Redis = await get_redis()
        cached_value = await redis_conn.get(key) # Returns string due to decode_responses=True
        if cached_value:
            logger.debug(f"Cache hit for key: {key}")
            try:
                # Attempt to parse as JSON, as complex data is stored as JSON strings
                return json.loads(cached_value)
            except json.JSONDecodeError:
                logger.warning(f"Cached value for key {key} is not valid JSON. Returning raw string: {cached_value[:100]}...")
                return cached_value # Return the raw string if not JSON
            except TypeError: # Handle case where cached_value might not be string-like (shouldn't happen with decode_responses=True)
                 logger.warning(f"Unexpected type retrieved from cache for key {key}. Type: {type(cached_value)}. Returning as is.")
                 return cached_value
        else:
            logger.debug(f"Cache miss for key: {key}")
            return None
    except ConnectionError:
        return None
    except Exception as e:
        logger.error(f"Error retrieving cache for key {key}: {e}", exc_info=True)
        return None

async def set_cached_data(key: str, value: Any, ttl_seconds: Optional[int] = None):
    """Stores data in cache, serializing to JSON if it's not a string or bytes."""
    from .config import settings

    effective_ttl = ttl_seconds if ttl_seconds is not None else settings.CACHE_TTL
    if effective_ttl <= 0:
        logger.debug(f"Skipping cache set for key {key} due to zero/negative TTL.")
        return

    try:
        redis_conn: Redis = await get_redis()
        # Serialize non-string/bytes values to JSON
        if not isinstance(value, (str, bytes)):
            try:
                value_to_store = json.dumps(value)
            except TypeError as e:
                 logger.error(f"Failed to serialize value for cache key {key}. Value type: {type(value)}. Error: {e}", exc_info=True)
                 return # Don't cache unserializable data
        else:
            value_to_store = value # Already string or bytes

        await redis_conn.set(key, value_to_store, ex=effective_ttl)
        logger.debug(f"Cached data for key: {key} with TTL: {effective_ttl}s")
    except ConnectionError:
        pass
    except Exception as e:
        logger.error(f"Error setting cache for key {key}: {e}", exc_info=True)