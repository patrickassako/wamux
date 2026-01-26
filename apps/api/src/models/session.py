"""
Session models for WhatsApp session management.
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID
from enum import Enum
from typing import Optional


class SessionStatus(str, Enum):
    """Session status states"""
    INITIALIZING = "initializing"
    QR_READY = "qr_ready"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])


class CreateSessionRequest(BaseModel):
    """Request to create a new WhatsApp session"""
    model_config = ConfigDict(populate_by_name=True)
    
    session_key: str = Field(
        min_length=1,
        max_length=100,
        description="User-friendly session identifier"
    )


class UpdateSessionRequest(BaseModel):
    """Request to update a session"""
    model_config = ConfigDict(populate_by_name=True)
    
    session_key: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="New session name"
    )


class SessionResponse(BaseModel):
    """Session response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    id: UUID
    session_key: str
    status: SessionStatus
    phone_number: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_activity_at: datetime
    created_at: datetime


class SessionCreatedResponse(SessionResponse):
    """Response when creating a session (includes stream URL)"""
    stream_url: str = Field(description="SSE endpoint for QR code stream")


class SessionListResponse(BaseModel):
    """List of sessions"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    sessions: list[SessionResponse]
    total: int


class QRCodeEvent(BaseModel):
    """QR code event payload"""
    session_id: UUID
    qr_data: str  # Base64 image data
    generation_count: int
    timestamp: datetime


class SessionConnectedEvent(BaseModel):
    """Session connected event payload"""
    session_id: UUID
    phone_number: str
    timestamp: datetime
