import orjson
from uuid import uuid4
from datetime import datetime, timezone
from redis.asyncio import Redis
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class StreamProducer:
    """Publishes commands and events to Redis Streams"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def publish_command(
        self,
        command_type: str,
        payload: Dict[str, Any],
        stream_name: str = "whatsapp:commands"
    ) -> str:
        """
        Publish a command to Redis Stream.
        
        Args:
            command_type: Type of command (e.g., "SEND_TEXT")
            payload: Command-specific payload (snake_case)
            stream_name: Target stream name
        
        Returns:
            Message ID from Redis
        """
        envelope = {
            "id": str(uuid4()),
            "type": command_type,
            "version": "1.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload
        }
        
        try:
            # Serialize to JSON
            message_json = orjson.dumps(envelope).decode()
            
            # Publish to stream (XADD)
            message_id = await self.redis.xadd(
                stream_name,
                {"data": message_json},
                maxlen=10000  # Keep last 10k messages
            )
            
            logger.info(
                f"Published command: {command_type} to {stream_name}",
                extra={"message_id": message_id, "envelope_id": envelope["id"]}
            )
            
            return message_id
            
        except Exception as e:
            logger.error(
                f"Failed to publish command: {command_type}",
                extra={"error": str(e), "payload": payload}
            )
            # Publish to error stream
            await self._publish_error(command_type, str(e), payload)
            raise
    
    async def publish_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        stream_name: str = "whatsapp:events"
    ) -> str:
        """Publish an event to Redis Stream (same logic as commands)"""
        return await self.publish_command(event_type, payload, stream_name)
    
    async def _publish_error(
        self,
        operation: str,
        error: str,
        context: Dict[str, Any]
    ):
        """Publish error to error stream for monitoring"""
        error_payload = {
            "operation": operation,
            "error": error,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            await self.redis.xadd(
                "whatsapp:errors",
                {"data": orjson.dumps(error_payload).decode()},
                maxlen=1000
            )
        except Exception as e:
            # Last resort logging
            logger.critical(f"Failed to log error to stream: {e}")
