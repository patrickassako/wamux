from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


class SupportTicketRequest(BaseModel):
    """Request model for creating a support ticket"""
    subject: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., pattern="^(general|technical|billing|api|feature)$")
    message: str = Field(..., min_length=10)


class SupportTicketResponse(BaseModel):
    """Response model for support ticket"""
    id: str
    user_id: str
    subject: str
    category: str
    message: str
    status: str  # open, in_progress, resolved
    created_at: str
    updated_at: str | None = None
