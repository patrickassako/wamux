from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import UUID, uuid4
from enum import Enum

class EventType(str, Enum):
    """Available event types from WhatsApp Engine"""
    SESSION_CONNECTED = "SESSION_CONNECTED"
    SESSION_DISCONNECTED = "SESSION_DISCONNECTED"
    QR_CODE_UPDATED = "QR_CODE_UPDATED"
    MESSAGE_SENT = "MESSAGE_SENT"
    MESSAGE_RECEIVED = "MESSAGE_RECEIVED"
    ERROR_OCCURRED = "ERROR_OCCURRED"

class EventEnvelope(BaseModel):
    """Standard event envelope for Redis Streams"""
    id: UUID = Field(default_factory=uuid4)
    type: EventType
    version: str = "1.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: dict

class SessionConnectedPayload(BaseModel):
    """Payload for SESSION_CONNECTED event"""
    session_id: str
    phone_number: str
    push_name: str | None = None

class SessionDisconnectedPayload(BaseModel):
    """Payload for SESSION_DISCONNECTED event"""
    session_id: str
    reason: str

class QrCodeUpdatedPayload(BaseModel):
    """Payload for QR_CODE_UPDATED event"""
    session_id: str
    qr_code: str  # Base64 or raw string

class MessageReceivedPayload(BaseModel):
    """Payload for MESSAGE_RECEIVED event"""
    session_id: str
    from_number: str
    message_type: str
    content: str | dict
    message_id: str
    timestamp: datetime

class ErrorOccurredPayload(BaseModel):
    """Payload for ERROR_OCCURRED event"""
    session_id: str | None = None
    error: str
    context: dict | None = None
