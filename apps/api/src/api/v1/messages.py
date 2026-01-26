"""
Messages API endpoints.
Story 2.1: Basic Text Messaging Endpoint
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from uuid import UUID

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client
from ...core.redis_client import RedisClient
from ...core.stream_producer import StreamProducer
from ...models.message import (
    SendTextRequest,
    SendMediaRequest,
    SendAudioRequest,
    MessageResponse,
    MessageListResponse,
    MessageStatus,
    MessageType
)

router = APIRouter(prefix="/messages", tags=["Messages"])


from datetime import datetime
from dateutil import parser as date_parser

async def check_and_increment_quota(user_id: str, supabase: Client) -> None:
    """
    Check if user has remaining quota and increment usage.
    Raises HTTPException 403 if quota exceeded.
    """
    print(f"Checking quota for User ID: {user_id}")
    result = supabase.table("subscriptions")\
        .select("messages_used, message_limit, current_period_end, plan, status, quota_alert_sent_80, quota_alert_sent_100")\
        .eq("user_id", str(user_id))\
        .limit(1)\
        .execute()
    
    if not result.data:
        print(f"No subscription found for User ID: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No active subscription found. Please activate a plan in the dashboard."
        )
    
    sub = result.data[0]
    print(f"Subscription found: {sub}")
    
    # Check for expiration
    if sub.get("current_period_end"):
        try:
            expiry = date_parser.parse(sub["current_period_end"])
            # Naive comparison for simplicity, or ensure both are offset-aware
            now = datetime.now(expiry.tzinfo)
            if now > expiry:
                print(f"Subscription expired: {expiry} vs Now: {now}")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Subscription expired on {expiry.strftime('%Y-%m-%d')}. Please upgrade your plan."
                )
        except Exception as e:
            print(f"Date parse error: {e}")
            # Don't block on date error? Or block safer?
            pass

    messages_used = sub.get("messages_used", 0)
    message_limit = sub.get("message_limit", 100)
    
    print(f"Usage: {messages_used}/{message_limit}")
    
    # Check if quota exceeded
    if message_limit > 0 and messages_used >= message_limit:
        print("Quota exceeded")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly message quota exceeded ({message_limit} messages). Please upgrade your plan."
        )
    
    # Increment usage
    new_usage = messages_used + 1
    update_data = {"messages_used": new_usage}
    
    # Check for 80% threshold alert
    if message_limit > 0:
        usage_percent = (new_usage / message_limit) * 100
        if usage_percent >= 80 and not sub.get("quota_alert_sent_80"):
            update_data["quota_alert_sent_80"] = True
            # TODO: Send email alert at 80%
        
        # Check for 100% threshold alert
        if usage_percent >= 100 and not sub.get("quota_alert_sent_100"):
            update_data["quota_alert_sent_100"] = True
            # TODO: Send email alert at 100%
    
    supabase.table("subscriptions")\
        .update(update_data)\
        .eq("user_id", str(user_id))\
        .execute()


@router.post("", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_text_message(
    request: SendTextRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Send a text message via WhatsApp.
    
    Returns 202 Accepted - message is processed asynchronously.
    """
    # Get user's default session if not specified
    session_id = request.session_id
    if not session_id:
        result = supabase.table('sessions')\
            .select('id')\
            .eq('user_id', current_user['id'])\
            .eq('status', 'connected')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No connected WhatsApp session found. Please connect a session first."
            )
        
        session_id = result.data[0]['id']
    
    # Verify session belongs to user and is connected
    session_result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_result.data['status'] != 'connected':
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not connected (status: {session_result.data['status']})"
        )
    
    # Check and increment quota
    await check_and_increment_quota(current_user['id'], supabase)
    
    # Create message record
    message_result = supabase.table('messages').insert({
        'user_id': current_user['id'],
        'session_id': str(session_id),
        'to_phone': request.to,
        'type': 'text',
        'content': {'message': request.message},
        'status': MessageStatus.PENDING.value
    }).execute()
    
    message_data = message_result.data[0]
    
    # Publish SEND_TEXT command to Redis
    redis_client = await RedisClient.get_client()
    producer = StreamProducer(redis_client)
    await producer.publish_command(
        "SEND_TEXT",
        {
            "message_id": message_data['id'],
            "session_id": str(session_id),
            "to": request.to,
            "message": request.message
        }
    )
    
    return MessageResponse(**message_data)


@router.post("/media", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_media_message(
    request: SendMediaRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Send an image or video message via WhatsApp.
    
    The media file is downloaded from the provided URL and sent natively through WhatsApp.
    Supported formats:
    - Images: JPEG, PNG, WebP, GIF (max 16MB)
    - Videos: MP4, 3GPP, QuickTime, WebM (max 64MB)
    
    Returns 202 Accepted - message is processed asynchronously.
    """
    # Get user's default session if not specified
    session_id = request.session_id
    if not session_id:
        result = supabase.table('sessions')\
            .select('id')\
            .eq('user_id', current_user['id'])\
            .eq('status', 'connected')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No connected WhatsApp session found. Please connect a session first."
            )
        
        session_id = result.data[0]['id']
    
    # Verify session belongs to user and is connected
    session_result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_result.data['status'] != 'connected':
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not connected (status: {session_result.data['status']})"
        )
    
    # Check and increment quota
    await check_and_increment_quota(current_user['id'], supabase)
    
    # Create message record
    message_result = supabase.table('messages').insert({
        'user_id': current_user['id'],
        'session_id': str(session_id),
        'to_phone': request.to,
        'type': request.media_type.value,
        'content': {
            'media_url': request.media_url,
            'caption': request.caption
        },
        'status': MessageStatus.PENDING.value
    }).execute()
    
    message_data = message_result.data[0]
    
    # Determine command type based on media type
    command_type = "SEND_IMAGE" if request.media_type == MessageType.IMAGE else "SEND_VIDEO"
    
    # Publish command to Redis
    redis_client = await RedisClient.get_client()
    producer = StreamProducer(redis_client)
    await producer.publish_command(
        command_type,
        {
            "message_id": message_data['id'],
            "session_id": str(session_id),
            "to": request.to,
            "media_url": request.media_url,
            "media_type": request.media_type.value,
            "caption": request.caption
        }
    )
    
    return MessageResponse(**message_data)


@router.post("/audio", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_audio_message(
    request: SendAudioRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Send an audio file or voice note via WhatsApp.
    
    Set `ptt: true` (push-to-talk) to send as a Voice Note with waveform visualization.
    Supported formats: MP3, OGG, AAC, WAV, Opus (max 16MB)
    
    Returns 202 Accepted - message is processed asynchronously.
    """
    # Get user's default session if not specified
    session_id = request.session_id
    if not session_id:
        result = supabase.table('sessions')\
            .select('id')\
            .eq('user_id', current_user['id'])\
            .eq('status', 'connected')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No connected WhatsApp session found. Please connect a session first."
            )
        
        session_id = result.data[0]['id']
    
    # Verify session belongs to user and is connected
    session_result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_result.data['status'] != 'connected':
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not connected (status: {session_result.data['status']})"
        )
    
    # Check and increment quota
    await check_and_increment_quota(current_user['id'], supabase)
    
    # Create message record
    message_result = supabase.table('messages').insert({
        'user_id': current_user['id'],
        'session_id': str(session_id),
        'to_phone': request.to,
        'type': MessageType.AUDIO.value,
        'content': {
            'audio_url': request.audio_url,
            'ptt': request.ptt
        },
        'status': MessageStatus.PENDING.value
    }).execute()
    
    message_data = message_result.data[0]
    
    # Publish SEND_AUDIO command to Redis
    redis_client = await RedisClient.get_client()
    producer = StreamProducer(redis_client)
    await producer.publish_command(
        "SEND_AUDIO",
        {
            "message_id": message_data['id'],
            "session_id": str(session_id),
            "to": request.to,
            "media_url": request.audio_url,
            "media_type": "audio",
            "ptt": request.ptt
        }
    )
    
    return MessageResponse(**message_data)


@router.get("", response_model=MessageListResponse)
async def list_messages(
    session_id: UUID | None = Query(None, alias="sessionId"),
    message_status: MessageStatus | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client)
):
    """List messages with optional filters and pagination"""
    query = supabase.table('messages')\
        .select('*', count='exact')\
        .eq('user_id', current_user['id'])
    
    if session_id:
        query = query.eq('session_id', str(session_id))
    
    if message_status:
        query = query.eq('status', message_status.value)
    
    result = query.order('created_at', desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    return MessageListResponse(
        messages=[MessageResponse(**msg) for msg in result.data],
        total=result.count or 0,
        limit=limit,
        offset=offset
    )


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client)
):
    """Get details of a specific message"""
    result = supabase.table('messages')\
        .select('*')\
        .eq('id', str(message_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return MessageResponse(**result.data)
