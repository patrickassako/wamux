"""
Webhook models for webhook configuration and management.
"""
from pydantic import BaseModel, Field, ConfigDict, HttpUrl
from datetime import datetime
from uuid import UUID
from typing import Optional
from enum import Enum


class WebhookEventType(str, Enum):
    """Webhook event types"""
    # Messages
    MESSAGE_RECEIVED = "message.received"
    MESSAGE_RECEIVED_PERSONAL = "message.received.personal"
    MESSAGE_RECEIVED_GROUP = "message.received.group"
    MESSAGE_SENT = "message.sent"
    MESSAGE_DELIVERED = "message.delivered"
    MESSAGE_READ = "message.read"
    MESSAGE_FAILED = "message.failed"
    MESSAGE_UPDATED = "message.updated"
    MESSAGE_DELETED = "message.deleted"
    MESSAGE_REACTION = "message.reaction"

    # Sessions
    SESSION_CONNECTED = "session.connected"
    SESSION_DISCONNECTED = "session.disconnected"
    SESSION_QR_UPDATED = "session.qr.updated"
    SESSION_RECONNECTING = "session.reconnecting"

    # Chats
    CHAT_CREATED = "chat.created"
    CHAT_UPDATED = "chat.updated"
    CHAT_DELETED = "chat.deleted"
    CHAT_ARCHIVED = "chat.archived"

    # Groups
    GROUP_CREATED = "group.created"
    GROUP_UPDATED = "group.updated"
    GROUP_PARTICIPANT_ADDED = "group.participant.added"
    GROUP_PARTICIPANT_REMOVED = "group.participant.removed"
    GROUP_PARTICIPANT_PROMOTED = "group.participant.promoted"
    GROUP_PARTICIPANT_DEMOTED = "group.participant.demoted"

    # Contacts
    CONTACT_CREATED = "contact.created"
    CONTACT_UPDATED = "contact.updated"

    # Calls
    CALL_INCOMING = "call.incoming"
    CALL_MISSED = "call.missed"


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])


class WebhookCreate(BaseModel):
    """Request to create a new webhook"""
    model_config = ConfigDict(populate_by_name=True)
    
    url: str = Field(description="URL to receive webhook events")
    session_id: UUID | None = Field(None, alias="sessionId", description="Optional: limit to specific session")
    events: list[WebhookEventType] = Field(
        default=[
            WebhookEventType.MESSAGE_RECEIVED,
            WebhookEventType.MESSAGE_SENT,
            WebhookEventType.SESSION_CONNECTED,
            WebhookEventType.SESSION_DISCONNECTED
        ],
        description="Events to subscribe to"
    )


class WebhookUpdate(BaseModel):
    """Request to update a webhook"""
    model_config = ConfigDict(populate_by_name=True)
    
    url: str | None = Field(None, description="New URL")
    events: list[WebhookEventType] | None = Field(None, description="New events list")
    enabled: bool | None = Field(None, description="Enable/disable webhook")


class WebhookResponse(BaseModel):
    """Webhook response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    id: UUID
    url: str
    session_id: UUID | None = None
    events: list[str]
    enabled: bool
    last_triggered_at: datetime | None = None
    failure_count: int
    created_at: datetime


class WebhookListResponse(BaseModel):
    """List of webhooks"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    webhooks: list[WebhookResponse]
    total: int


class WebhookSecretResponse(BaseModel):
    """Response when creating webhook (includes secret)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    id: UUID
    url: str
    secret: str = Field(description="Secret for HMAC signature verification (only shown once)")
    session_id: UUID | None = None
    events: list[str]
    enabled: bool
    created_at: datetime
