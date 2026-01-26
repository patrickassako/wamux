"""
Pydantic data models for authentication and user profiles.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID
import re

def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    return ''.join(word.capitalize() if i else word for i, word in enumerate(string.split('_')))

class RegisterRequest(BaseModel):
    """User registration request."""
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    display_name: str | None = Field(default=None, alias="displayName")
    company: str | None = None
    phone: str | None = None
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class LoginRequest(BaseModel):
    """User login request."""
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr
    password: str

class ProfileResponse(BaseModel):
    """User profile response."""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        from_attributes=True
    )
    
    id: UUID
    email: EmailStr
    display_name: str | None = None
    company: str | None = None
    phone: str | None = None
    subscription_status: str
    subscription_expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class ProfileUpdateRequest(BaseModel):
    """User profile update request."""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    display_name: str | None = None
    company: str | None = None
    phone: str | None = None

class AuthResponse(BaseModel):
    """Authentication response with JWT token."""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    access_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None
    user: ProfileResponse

class ForgotPasswordRequest(BaseModel):
    """Forgot password request by email."""
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Reset password request used with recovery token."""
    model_config = ConfigDict(populate_by_name=True)
    
    password: str = Field(min_length=8, description="New password")
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v
