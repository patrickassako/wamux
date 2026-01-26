"""
Session settings models for behavior configuration.
"""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])


class SessionSettingsUpdate(BaseModel):
    """Request to update session settings"""
    model_config = ConfigDict(populate_by_name=True)
    
    always_online: bool | None = Field(None, alias="alwaysOnline", description="Emit presence='available' periodically")
    auto_read_messages: bool | None = Field(None, alias="autoReadMessages", description="Mark incoming messages as read")
    reject_calls: bool | None = Field(None, alias="rejectCalls", description="Reject incoming calls instantly")
    typing_indicator: bool | None = Field(None, alias="typingIndicator", description="Show typing when sending")
    link_preview: bool | None = Field(None, alias="linkPreview", description="Generate link previews")
    rate_limit_per_minute: int | None = Field(None, alias="rateLimitPerMinute", ge=1, le=3000, description="Max messages per minute")


class SessionSettingsResponse(BaseModel):
    """Session settings response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    session_id: UUID
    always_online: bool
    auto_read_messages: bool
    reject_calls: bool
    typing_indicator: bool
    link_preview: bool
    rate_limit_per_minute: int = 60
    updated_at: datetime
