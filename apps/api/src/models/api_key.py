from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID

def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    words = string.split('_')
    return words[0] + ''.join(word.capitalize() for word in words[1:])

class CreateKeyRequest(BaseModel):
    """Request to create a new API key"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    name: str = Field(min_length=1, max_length=100, description="Friendly name for the key")
    description: str | None = Field(None, max_length=500, description="Optional description")
    expires_in_days: int | None = Field(None, ge=1, le=365, description="Optional expiration (1-365 days)")

class KeyResponse(BaseModel):
    """API key response (without full key)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    id: UUID
    name: str
    description: str | None = None
    key_prefix: str  # e.g., "sk_live_a1b2****"
    request_count: int
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class KeyCreatedResponse(KeyResponse):
    """Response when creating a new key (includes full key - shown once!)"""
    api_key: str = Field(description="Full API key - save this, it won't be shown again!")

class KeyListResponse(BaseModel):
    """List of API keys"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    keys: list[KeyResponse]
    total: int

class KeyUsageStats(BaseModel):
    """API key usage statistics"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    key_id: UUID
    request_count: int
    last_used_at: datetime | None
    created_at: datetime
    days_since_creation: int
    is_expired: bool
    expires_at: datetime | None
