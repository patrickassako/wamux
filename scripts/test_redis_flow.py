import asyncio
import logging
from src.core.redis_client import RedisClient
from src.core.stream_producer import StreamProducer
from src.models.commands import CommandType

logging.basicConfig(level=logging.INFO)

async def main():
    print("🚀 Connecting to Redis...")
    redis = await RedisClient.get_client()
    
    producer = StreamProducer(redis)
    
    payload = {
        "session_id": "test_session_1",
        "to": "1234567890",
        "message": "Hello form Python Integration Test"
    }
    
    print(f"📦 Publishing command: {CommandType.SEND_TEXT}")
    try:
        msg_id = await producer.publish_command(
            CommandType.SEND_TEXT,
            payload
        )
        print(f"✅ Published successfully! Msg ID: {msg_id}")
        print("Now check Node.js logs for consumption.")
        
    except Exception as e:
        print(f"❌ Failed to publish: {e}")
    finally:
        await RedisClient.close()

if __name__ == "__main__":
    asyncio.run(main())
