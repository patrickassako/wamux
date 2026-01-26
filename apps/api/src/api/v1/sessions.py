"""
Session management API endpoints.
Handles WhatsApp session creation, QR streaming (SSE), and session lifecycle.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from supabase import Client
from uuid import UUID
from datetime import datetime, timezone
import asyncio
import json
import logging

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client
from ...core.redis_client import RedisClient
from ...core.stream_producer import StreamProducer
from ...models.session import (
    CreateSessionRequest,
    UpdateSessionRequest,
    SessionResponse,
    SessionCreatedResponse,
    SessionListResponse,
    SessionStatus
)
from ...models.session_settings import SessionSettingsUpdate, SessionSettingsResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])
logger = logging.getLogger(__name__)


@router.post("", response_model=SessionCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Create a new WhatsApp session and initiate QR code generation.
    
    Returns a stream_url for Server-Sent Events to receive QR codes.
    """
    try:
        # Create session in database
        result = supabase.table('sessions').insert({
            'user_id': current_user['id'],
            'session_key': request.session_key,
            'status': SessionStatus.INITIALIZING.value
        }).execute()
        
        session_data = result.data[0]
        session_id = session_data['id']
        
        # Publish INIT_SESSION command to Redis
        redis = await RedisClient.get_client()
        producer = StreamProducer(redis)
        await producer.publish_command(
            "INIT_SESSION",
            {
                "session_id": session_id,
                "user_id": str(current_user['id']),
                "session_key": request.session_key
            }
        )
        
        logger.info(f"Session created: {session_id}")
        
        # Return response with stream URL
        stream_url = f"/v1/sessions/{session_id}/stream"
        
        return SessionCreatedResponse(
            **session_data,
            stream_url=stream_url
        )
        
    except Exception as e:
        if "Maximum active session limit" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum active session limit (5) reached. Please disconnect unused sessions."
            )
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )


@router.get("/{session_id}/stream")
async def stream_qr_codes(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Server-Sent Events stream for QR codes and connection status.
    
    Events:
    - qr: QR code data (Base64 image)
    - connected: Session successfully connected
    - error: Connection failed
    """
    # Verify session belongs to user
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    async def event_generator():
        """Generate SSE events from Redis Pub/Sub"""
        redis = await RedisClient.get_client()
        pubsub = redis.pubsub()
        channel = f"session:{session_id}:events"
        await pubsub.subscribe(channel)
        
        logger.info(f"SSE stream started for session: {session_id}")
        
        try:
            timeout_counter = 0
            max_timeout = 300  # 5 minutes
            
            while timeout_counter < max_timeout:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                
                if message is None:
                    # Send heartbeat to keep connection alive
                    yield ": heartbeat\n\n"
                    timeout_counter += 1
                    continue
                
                timeout_counter = 0  # Reset timeout on message receipt
                
                try:
                    event_data = json.loads(message['data'])
                    event_type = event_data.get('type')
                    
                    if event_type == 'QR_CODE_UPDATED':
                        yield f"event: qr\ndata: {json.dumps(event_data['payload'])}\n\n"
                    
                    elif event_type == 'SESSION_CONNECTED':
                        yield f"event: connected\ndata: {json.dumps(event_data['payload'])}\n\n"
                        break
                    
                    elif event_type == 'SESSION_FAILED':
                        yield f"event: error\ndata: {json.dumps(event_data['payload'])}\n\n"
                        break
                        
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in event: {message}")
                    continue
            
            # Timeout reached
            if timeout_counter >= max_timeout:
                yield f"event: error\ndata: {{\"error\": \"Connection timeout\"}}\n\n"
        
        finally:
            await pubsub.unsubscribe(channel)
            logger.info(f"SSE stream closed for session: {session_id}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client)
):
    """List all sessions for the authenticated user"""
    result = supabase.table('sessions')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .execute()
    
    return SessionListResponse(
        sessions=[SessionResponse(**session) for session in result.data],
        total=len(result.data)
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client)
):
    """Get details of a specific session"""
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionResponse(**result.data)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    request: UpdateSessionRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Update session details (e.g., session name).
    """
    # Verify session exists and belongs to user
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Build update data
    update_data = {}
    if request.session_key:
        update_data['session_key'] = request.session_key
    
    if not update_data:
        return SessionResponse(**result.data)
    
    # Update session
    updated = supabase.table('sessions')\
        .update(update_data)\
        .eq('id', str(session_id))\
        .execute()
    
    logger.info(f"Session updated: {session_id}")
    
    return SessionResponse(**updated.data[0])


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Delete a WhatsApp session permanently.
    
    Publishes LOGOUT command to Node.js engine and removes session from database.
    """
    # Verify session exists
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Publish LOGOUT command to disconnect if connected
    if result.data.get('status') == 'connected':
        redis = await RedisClient.get_client()
        producer = StreamProducer(redis)
        await producer.publish_command(
            "LOGOUT",
            {"session_id": str(session_id)}
        )
    
    # Delete session from database
    supabase.table('sessions')\
        .delete()\
        .eq('id', str(session_id))\
        .execute()
    
    logger.info(f"Session deleted: {session_id}")
    
    return None


@router.get("/{session_id}/settings", response_model=SessionSettingsResponse)
async def get_session_settings(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """Get session behavior settings"""
    
    # Verify session belongs to user
    session_result = supabase.table('sessions')\
        .select('id')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get or create settings
    settings_result = supabase.table('session_settings')\
        .select('*')\
        .eq('session_id', str(session_id))\
        .limit(1)\
        .execute()
    
    if settings_result.data:
        return SessionSettingsResponse(**settings_result.data[0])
    
    # Create default settings
    try:
        new_settings = supabase.table('session_settings').insert({
            'session_id': str(session_id),
            'always_online': False,
            'auto_read_messages': False,
            'reject_calls': False,
            'typing_indicator': True,
            'link_preview': True,
        }).execute()
        return SessionSettingsResponse(**new_settings.data[0])
    except Exception as e:
        # Handle race condition (unique constraint violation)
        logger.warning(f"Failed to create default settings (likely race condition): {e}")
        
        # Retry fetch
        settings_result = supabase.table('session_settings')\
            .select('*')\
            .eq('session_id', str(session_id))\
            .single()\
            .execute()
            
        if settings_result.data:
            return SessionSettingsResponse(**settings_result.data)
            
        # If still failing, raise error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve settings: {str(e)}"
        )


@router.patch("/{session_id}/settings", response_model=SessionSettingsResponse)
async def update_session_settings(
    session_id: UUID,
    request: SessionSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """Update session behavior settings"""
    
    # Verify session belongs to user
    session_result = supabase.table('sessions')\
        .select('id')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Build update data
    update_data = {}
    if request.always_online is not None:
        update_data['always_online'] = request.always_online
    if request.auto_read_messages is not None:
        update_data['auto_read_messages'] = request.auto_read_messages
    if request.reject_calls is not None:
        update_data['reject_calls'] = request.reject_calls
    if request.typing_indicator is not None:
        update_data['typing_indicator'] = request.typing_indicator
    if request.link_preview is not None:
        update_data['link_preview'] = request.link_preview
    
    if not update_data:
        # Get current settings
        settings_result = supabase.table('session_settings')\
            .select('*')\
            .eq('session_id', str(session_id))\
            .single()\
            .execute()
        return SessionSettingsResponse(**settings_result.data)
    
    
    # Upsert settings
    settings_result = supabase.table('session_settings')\
        .upsert({
            'session_id': str(session_id),
            **update_data
        })\
        .execute()
    
    # Publish settings change to Engine
    redis = await RedisClient.get_client()
    producer = StreamProducer(redis)
    await producer.publish_command(
        "UPDATE_SETTINGS",
        {
            "session_id": str(session_id),
            "settings": update_data
        }
    )
    
    return SessionSettingsResponse(**settings_result.data[0])


@router.post("/{session_id}/disconnect", status_code=status.HTTP_200_OK)
async def disconnect_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Disconnect a WhatsApp session.
    """
    # Verify session belongs to user
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Publish DISCONNECT_SESSION command
    try:
        redis = await RedisClient.get_client()
        logger.info(f"Got Redis client for disconnect session: {session_id}")
        producer = StreamProducer(redis)
        await producer.publish_command(
            "DISCONNECT_SESSION",
            {
                "session_id": str(session_id),
                "reason": "user_initiated"
            }
        )
        logger.info(f"Published DISCONNECT_SESSION command for {session_id}")
    except Exception as e:
        logger.error(f"Failed to publish DISCONNECT_SESSION: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect: {str(e)}")
    
    return {"status": "disconnect_initiated"}


@router.post("/{session_id}/restart", status_code=status.HTTP_200_OK)
async def restart_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Restart a WhatsApp session.
    """
    # Verify session belongs to user
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Publish RESTART_SESSION command
    try:
        redis = await RedisClient.get_client()
        logger.info(f"Got Redis client for restart session: {session_id}")
        producer = StreamProducer(redis)
        await producer.publish_command(
            "RESTART_SESSION",
            {
                "session_id": str(session_id)
            }
        )
        logger.info(f"Published RESTART_SESSION command for {session_id}")
    except Exception as e:
        logger.error(f"Failed to publish RESTART_SESSION: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restart: {str(e)}")
    
    return {"status": "restart_initiated"}

