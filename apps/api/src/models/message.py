"""
Pydantic models for WhatsApp messages.
Story 2.1: Basic Text Messaging Endpoint
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID
from enum import Enum
import re


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])


class SendTextRequest(BaseModel):
    """Request to send a text message"""
    model_config = ConfigDict(populate_by_name=True)
    
    to: str = Field(description="Phone number in international format")
    message: str = Field(min_length=1, max_length=4096, description="Message text")
    session_id: UUID | None = Field(None, alias="sessionId", description="Optional session ID (uses default if not provided)")
    
    @field_validator('to')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Remove common formatting
        phone = re.sub(r'[^\d+]', '', v)
        
        # Must start with + or be 10-15 digits
        if not (phone.startswith('+') or (len(phone) >= 10 and len(phone) <= 15)):
            raise ValueError('Invalid phone number format. Use international format like +1234567890')
        
        return phone


class SendMediaRequest(BaseModel):
    """Request to send an image or video message"""
    model_config = ConfigDict(populate_by_name=True)
    
    to: str = Field(description="Phone number in international format")
    media_url: str = Field(alias="mediaUrl", description="URL of the media file to send")
    media_type: MessageType = Field(alias="mediaType", description="Type of media: image or video")
    caption: str | None = Field(None, max_length=1024, description="Optional caption for the media")
    session_id: UUID | None = Field(None, alias="sessionId", description="Optional session ID")
    
    @field_validator('to')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone = re.sub(r'[^\d+]', '', v)
        if not (phone.startswith('+') or (len(phone) >= 10 and len(phone) <= 15)):
            raise ValueError('Invalid phone number format. Use international format like +1234567890')
        return phone
    
    @field_validator('media_type')
    @classmethod
    def validate_media_type(cls, v: MessageType) -> MessageType:
        if v not in (MessageType.IMAGE, MessageType.VIDEO):
            raise ValueError('media_type must be "image" or "video"')
        return v
    
    @field_validator('media_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('media_url must be a valid HTTP or HTTPS URL')
        return v


class SendAudioRequest(BaseModel):
    """Request to send an audio file or voice note"""
    model_config = ConfigDict(populate_by_name=True)
    
    to: str = Field(description="Phone number in international format")
    audio_url: str = Field(alias="audioUrl", description="URL of the audio file to send")
    ptt: bool = Field(False, description="Push-to-talk: if true, sends as Voice Note with waveform")
    session_id: UUID | None = Field(None, alias="sessionId", description="Optional session ID")
    
    @field_validator('to')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone = re.sub(r'[^\d+]', '', v)
        if not (phone.startswith('+') or (len(phone) >= 10 and len(phone) <= 15)):
            raise ValueError('Invalid phone number format. Use international format like +1234567890')
        return phone
    
    @field_validator('audio_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('audio_url must be a valid HTTP or HTTPS URL')
        return v


class MessageResponse(BaseModel):
    """Message response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    id: UUID
    to_phone: str
    type: MessageType
    status: MessageStatus
    whatsapp_message_id: str | None = None
    error_message: str | None = None
    sent_at: datetime | None = None
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime


class MessageListResponse(BaseModel):
    """List of messages with pagination"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    messages: list[MessageResponse]
    total: int
    limit: int
    offset: int
