import pytest
import json
from unittest.mock import AsyncMock, patch
from src.core.stream_producer import StreamProducer
from src.models.commands import CommandType

@pytest.mark.asyncio
async def test_publish_command_success():
    """Test that publish_command calls xadd with correct arguments"""
    mock_redis = AsyncMock()
    mock_redis.xadd.return_value = "1000-0"
    
    producer = StreamProducer(mock_redis)
    payload = {"session_id": "test_sess", "to": "123", "message": "hello"}
    
    msg_id = await producer.publish_command(
        CommandType.SEND_TEXT,
        payload,
        stream_name="test:commands"
    )
    
    assert msg_id == "1000-0"
    mock_redis.xadd.assert_called_once()
    
    # Verify envelope structure
    call_args = mock_redis.xadd.call_args
    stream_name = call_args[0][0]
    data = call_args[0][1]
    
    assert stream_name == "test:commands"
    assert "data" in data
    
    envelope = json.loads(data["data"])
    assert envelope["type"] == CommandType.SEND_TEXT
    assert envelope["payload"] == payload
    assert "timestamp" in envelope
    assert "id" in envelope

@pytest.mark.asyncio
async def test_publish_command_failure_logs_to_error_stream():
    """Test that producer logs to error stream if publishing fails"""
    mock_redis = AsyncMock()
    # First call (command) raises exception
    mock_redis.xadd.side_effect = [Exception("Redis error"), "error-id"]
    
    producer = StreamProducer(mock_redis)
    payload = {"test": "data"}
    
    with pytest.raises(Exception, match="Redis error"):
        await producer.publish_command("TEST_CMD", payload)
    
    # Should have called xadd twice: once for command (failed), once for error
    assert mock_redis.xadd.call_count == 2
    
    # Check error stream call
    error_call = mock_redis.xadd.call_args
    stream_name = error_call[0][0]
    assert stream_name == "whatsapp:errors"
