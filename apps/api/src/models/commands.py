from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import UUID, uuid4
from enum import Enum

class CommandType(str, Enum):
    """Available command types for WhatsApp Engine"""
    INIT_SESSION = "INIT_SESSION"
    SEND_TEXT = "SEND_TEXT"
    SEND_IMAGE = "SEND_IMAGE"
    SEND_AUDIO = "SEND_AUDIO"
    SEND_VIDEO = "SEND_VIDEO"
    LOGOUT = "LOGOUT"
    GET_STATUS = "GET_STATUS"

class CommandEnvelope(BaseModel):
    """Standard command envelope for Redis Streams"""
    id: UUID = Field(default_factory=uuid4)
    type: CommandType
    version: str = "1.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: dict

class InitSessionPayload(BaseModel):
    """Payload for INIT_SESSION command"""
    session_id: str
    user_id: UUID
    webhook_url: str | None = None

class SendTextPayload(BaseModel):
    """Payload for SEND_TEXT command"""
    session_id: str
    to: str  # Phone number in WhatsApp format
    message: str
    
class SendImagePayload(BaseModel):
    """Payload for SEND_IMAGE command"""
    session_id: str
    to: str
    image_url: str
    caption: str | None = None

class SendAudioPayload(BaseModel):
    """Payload for SEND_AUDIO command"""
    session_id: str
    to: str
    audio_url: str
    ptt: bool = False  # Push-to-talk (voice note)

class SendVideoPayload(BaseModel):
    """Payload for SEND_VIDEO command"""
    session_id: str
    to: str
    video_url: str
    caption: str | None = None

class LogoutPayload(BaseModel):
    """Payload for LOGOUT command"""
    session_id: str

class GetStatusPayload(BaseModel):
    """Payload for GET_STATUS command"""
    session_id: str
