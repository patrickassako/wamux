"""
Admin API endpoints for platform management
Story 4.4: Admin Dashboard & Kill Switch
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client
from ...core.redis_client import RedisClient
from ...core.stream_producer import StreamProducer

router = APIRouter(prefix="/admin", tags=["Admin"])


# Models
class UserListItem(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = Field(None, alias="fullName")
    is_admin: bool = Field(False, alias="isAdmin")
    is_banned: bool = Field(False, alias="isBanned")
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        populate_by_name = True


class UserDetail(UserListItem):
    subscription_plan: str = Field("free", alias="subscriptionPlan")
    messages_used: int = Field(0, alias="messagesUsed")
    message_limit: int = Field(100, alias="messageLimit")
    active_sessions: int = Field(0, alias="activeSessions")
    
    class Config:
        populate_by_name = True


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    limit: int
    offset: int


class BanResponse(BaseModel):
    success: bool
    message: str
    sessions_disconnected: int = Field(alias="sessionsDisconnected")
    
    class Config:
        populate_by_name = True


async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to require admin access"""
    supabase = get_supabase_service_client()
    
    result = supabase.table("profiles")\
        .select("is_admin")\
        .eq("id", current_user["id"])\
        .limit(1)\
        .execute()
    
    if not result.data or not result.data[0].get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(require_admin)
):
    """List all users (admin only)"""
    supabase = get_supabase_service_client()
    
    query = supabase.table("profiles").select("*", count="exact")
    
    if search:
        query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%")
    
    result = query.order("created_at", desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    return UserListResponse(
        users=[UserListItem(**u) for u in result.data],
        total=result.count or 0,
        limit=limit,
        offset=offset
    )


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Get detailed user info including stats (admin only)"""
    supabase = get_supabase_service_client()
    
    # Get profile
    profile_result = supabase.table("profiles")\
        .select("*")\
        .eq("id", user_id)\
        .single()\
        .execute()
    
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = profile_result.data
    
    # Get subscription
    sub_result = supabase.table("subscriptions")\
        .select("plan, messages_used, message_limit")\
        .eq("user_id", user_id)\
        .limit(1)\
        .execute()
    
    sub = sub_result.data[0] if sub_result.data else {}
    
    # Get active sessions count
    sessions_result = supabase.table("sessions")\
        .select("id", count="exact")\
        .eq("user_id", user_id)\
        .eq("status", "connected")\
        .execute()
    
    return UserDetail(
        id=profile["id"],
        email=profile["email"],
        full_name=profile.get("full_name"),
        is_admin=profile.get("is_admin", False),
        is_banned=profile.get("is_banned", False),
        created_at=profile["created_at"],
        subscription_plan=sub.get("plan", "free"),
        messages_used=sub.get("messages_used", 0),
        message_limit=sub.get("message_limit", 100),
        active_sessions=sessions_result.count or 0
    )


@router.post("/users/{user_id}/ban", response_model=BanResponse)
async def ban_user(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Ban a user and disconnect all their sessions (admin only).
    This is the "Kill Switch" functionality.
    """
    supabase = get_supabase_service_client()
    
    # Verify user exists and is not already banned
    profile_result = supabase.table("profiles")\
        .select("id, is_banned")\
        .eq("id", user_id)\
        .single()\
        .execute()
    
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile_result.data.get("is_banned"):
        raise HTTPException(status_code=400, detail="User is already banned")
    
    # Get all active sessions
    sessions_result = supabase.table("sessions")\
        .select("id")\
        .eq("user_id", user_id)\
        .eq("status", "connected")\
        .execute()
    
    session_ids = [s["id"] for s in sessions_result.data] if sessions_result.data else []
    
    # Ban the user
    supabase.table("profiles")\
        .update({"is_banned": True})\
        .eq("id", user_id)\
        .execute()
    
    # Disconnect all sessions via Redis commands
    if session_ids:
        redis_client = await RedisClient.get_client()
        producer = StreamProducer(redis_client)
        
        for session_id in session_ids:
            await producer.publish_command("DISCONNECT_SESSION", {
                "session_id": session_id,
                "reason": "User banned by admin"
            })
        
        # Mark sessions as disconnected in DB
        supabase.table("sessions")\
            .update({"status": "disconnected"})\
            .eq("user_id", user_id)\
            .execute()
    
    # Revoke all API keys
    supabase.table("api_keys")\
        .update({"is_revoked": True})\
        .eq("user_id", user_id)\
        .execute()
    
    return BanResponse(
        success=True,
        message=f"User banned successfully. {len(session_ids)} session(s) disconnected.",
        sessions_disconnected=len(session_ids)
    )


@router.post("/users/{user_id}/unban", response_model=BanResponse)
async def unban_user(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Unban a user (admin only)"""
    supabase = get_supabase_service_client()
    
    # Verify user exists and is banned
    profile_result = supabase.table("profiles")\
        .select("id, is_banned")\
        .eq("id", user_id)\
        .single()\
        .execute()
    
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not profile_result.data.get("is_banned"):
        raise HTTPException(status_code=400, detail="User is not banned")
    
    # Unban the user
    supabase.table("profiles")\
        .update({"is_banned": False})\
        .eq("id", user_id)\
        .execute()
    
    return BanResponse(
        success=True,
        message="User unbanned successfully.",
        sessions_disconnected=0
    )


@router.get("/stats")
async def get_platform_stats(admin: dict = Depends(require_admin)):
    """Get platform-wide statistics (admin only)"""
    supabase = get_supabase_service_client()
    
    # Total users
    users_result = supabase.table("profiles")\
        .select("id", count="exact")\
        .execute()
    
    # Active sessions
    sessions_result = supabase.table("sessions")\
        .select("id", count="exact")\
        .eq("status", "connected")\
        .execute()
    
    # Messages sent today (rough estimate)
    messages_result = supabase.table("messages")\
        .select("id", count="exact")\
        .gte("created_at", "now() - interval '24 hours'")\
        .execute()
    
    # Paying customers
    paying_result = supabase.table("subscriptions")\
        .select("id", count="exact")\
        .neq("plan", "free")\
        .execute()
    
    return {
        "totalUsers": users_result.count or 0,
        "activeSessions": sessions_result.count or 0,
        "messagesLast24h": messages_result.count or 0,
        "payingCustomers": paying_result.count or 0
    }
