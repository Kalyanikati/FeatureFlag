import json
import logging
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from ..config import settings

logger = logging.getLogger(__name__)
PUBSUB_CHANNEL = "flag_updates"


class CacheService:
    _redis: Optional[aioredis.Redis] = None

    @classmethod
    async def get_redis(cls) -> aioredis.Redis:
        if cls._redis is None:
            cls._redis = await aioredis.from_url(settings.REDIS_URL)
        return cls._redis

    @classmethod
    async def close(cls):
        if cls._redis:
            await cls._redis.close()

    @classmethod
    async def set_flag(cls, flag_key: str, flag_data: Dict[str, Any]):
        """Write flag snapshot to Redis (write-through pattern)."""
        try:
            redis = await cls.get_redis()
            cache_key = f"flag:{flag_key}:current"
            await redis.set(cache_key, json.dumps(flag_data))
            logger.info(f"Cached flag {flag_key}")
        except Exception as e:
            logger.error(f"Failed to cache flag {flag_key}: {e}")

    @classmethod
    async def get_flag(cls, flag_key: str) -> Optional[Dict[str, Any]]:
        """Fetch flag from cache."""
        try:
            redis = await cls.get_redis()
            cache_key = f"flag:{flag_key}:current"
            data = await redis.get(cache_key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get flag {flag_key} from cache: {e}")
        return None

    @classmethod
    async def delete_flag(cls, flag_key: str):
        """Remove flag from cache."""
        try:
            redis = await cls.get_redis()
            cache_key = f"flag:{flag_key}:current"
            await redis.delete(cache_key)
            logger.info(f"Deleted cached flag {flag_key}")
        except Exception as e:
            logger.error(f"Failed to delete flag {flag_key} from cache: {e}")

    @classmethod
    async def publish_update(cls, flag_key: str, action: str = "updated"):
        """Publish flag update event to Redis pub/sub."""
        try:
            redis = await cls.get_redis()
            message = json.dumps({
                "key": flag_key,
                "action": action,
            })
            await redis.publish(PUBSUB_CHANNEL, message)
            logger.info(f"Published {action} event for flag {flag_key}")
        except Exception as e:
            logger.error(f"Failed to publish update for flag {flag_key}: {e}")

    @classmethod
    async def get_all_flags(cls) -> Dict[str, Dict[str, Any]]:
        """Fetch all flag snapshots from Redis."""
        try:
            redis = await cls.get_redis()
            keys = await redis.keys("flag:*:current")
            result = {}
            for k in keys:
                key_str = k.decode() if isinstance(k, bytes) else k
                parts = key_str.split(":")
                if len(parts) >= 2:
                    flag_key = parts[1]
                    data = await redis.get(key_str)
                    if data:
                        result[flag_key] = json.loads(data)
            return result
        except Exception as e:
            logger.error(f"Failed to get all flags from cache: {e}")
            return {}
