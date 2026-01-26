"""
Billing models for subscription management
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PlanType(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    PLUS = "plus"
    BUSINESS = "business"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class BillingPeriod(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


# Plan configurations
PLAN_LIMITS = {
    PlanType.FREE: {
        "sessions_limit": 1,
        "message_limit": 100,  # 100 messages per day (or total, depending on logic)
        "rate_limit_per_minute": 10,
        "price_monthly": 0,
        "price_yearly": 0,
        "features": [
            "1 Connected WhatsApp Number",
            "100 Messages per day",
            "Rate limit: 10 msg/min",
            "Community Support"
        ]
    },
    PlanType.BASIC: {
        "sessions_limit": 1,
        "message_limit": 0,  # No daily cap
        "rate_limit_per_minute": 30,
        "price_monthly": 4,
        "price_yearly": 3,  # per month when billed yearly
        "features": [
            "1 Connected WhatsApp Number",
            "Unlimited Contacts",
            "No Daily Message Cap",
            "MCP Server Integration",
            "Send to Users, Groups & Channels",
            "Send Text, Images, Videos & Audio",
            "Send Documents, Contacts & Locations",
            "Full API Access",
            "Real-time Webhooks",
            "Priority Support"
        ]
    },
    PlanType.PRO: {
        "sessions_limit": 3,
        "message_limit": 0,
        "rate_limit_per_minute": 60,
        "price_monthly": 11,
        "price_yearly": 9,
        "features": [
            "3 Connected WhatsApp Numbers",
            "Unlimited Contacts",
            "No Daily Message Cap",
            "MCP Server Integration",
            "Send to Users, Groups & Channels",
            "Send Text, Images, Videos & Audio",
            "Send Documents, Contacts & Locations",
            "Full API Access",
            "Real-time Webhooks",
            "Priority Support"
        ]
    },
    PlanType.PLUS: {
        "sessions_limit": 6,
        "message_limit": 0,
        "rate_limit_per_minute": 90,
        "price_monthly": 23,
        "price_yearly": 20,
        "features": [
            "6 Connected WhatsApp Numbers",
            "Unlimited Contacts",
            "No Daily Message Cap",
            "MCP Server Integration",
            "Send to Users, Groups & Channels",
            "Send Text, Images, Videos & Audio",
            "Send Documents, Contacts & Locations",
            "Full API Access",
            "Real-time Webhooks",
            "Priority Support"
        ]
    },
    PlanType.BUSINESS: {
        "sessions_limit": 10,
        "message_limit": 0,
        "rate_limit_per_minute": 120,
        "price_monthly": 40,
        "price_yearly": 35,
        "features": [
            "10 Connected WhatsApp Numbers",
            "Unlimited Contacts",
            "No Daily Message Cap",
            "MCP Server Integration",
            "Send to Users, Groups & Channels",
            "Send Text, Images, Videos & Audio",
            "Send Documents, Contacts & Locations",
            "Full API Access",
            "Real-time Webhooks",
            "Priority Support"
        ]
    }
}


class SubscriptionResponse(BaseModel):
    """Response model for subscription data"""
    id: str
    user_id: str = Field(alias="userId")
    plan: PlanType
    status: SubscriptionStatus
    message_limit: int = Field(alias="messageLimit")
    messages_used: int = Field(alias="messagesUsed")
    rate_limit_per_minute: int = Field(alias="rateLimitPerMinute")
    current_period_start: Optional[datetime] = Field(None, alias="currentPeriodStart")
    current_period_end: Optional[datetime] = Field(None, alias="currentPeriodEnd")
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class CheckoutRequest(BaseModel):
    """Request to create a checkout session"""
    plan: PlanType
    success_url: Optional[str] = Field(None, alias="successUrl")
    cancel_url: Optional[str] = Field(None, alias="cancelUrl")

    class Config:
        populate_by_name = True


class CheckoutResponse(BaseModel):
    """Response with checkout URL"""
    checkout_url: str = Field(alias="checkoutUrl")
    session_id: str = Field(alias="sessionId")

    class Config:
        populate_by_name = True


class PortalResponse(BaseModel):
    """Response with customer portal URL"""
    portal_url: str = Field(alias="portalUrl")

    class Config:
        populate_by_name = True


class UsageResponse(BaseModel):
    """Current usage statistics"""
    messages_used: int = Field(alias="messagesUsed")
    message_limit: int = Field(alias="messageLimit")
    usage_percent: float = Field(alias="usagePercent")
    remaining: int

    class Config:
        populate_by_name = True


class PlanInfo(BaseModel):
    """Plan information for display"""
    name: PlanType
    sessions_limit: int = Field(alias="sessionsLimit")
    message_limit: int = Field(alias="messageLimit")
    rate_limit_per_minute: int = Field(alias="rateLimitPerMinute")
    price_monthly: int = Field(alias="priceMonthly")
    price_yearly: int = Field(alias="priceYearly")
    features: list[str]

    class Config:
        populate_by_name = True
