import redis.asyncio as redis
from typing import Optional
from .config import settings

class RedisClient:
    """Singleton Redis client for stream operations"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    async def get_client(cls) -> redis.Redis:
        """Get or create Redis client instance"""
        if cls._instance is None:
            cls._instance = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50
            )
        return cls._instance
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None

async def get_redis() -> redis.Redis:
    """Dependency for FastAPI routes"""
    return await RedisClient.get_client()
