"""
Webhook management API endpoints.
Allows users to register URLs to receive event notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from uuid import UUID
import secrets

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client
from ...models.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookListResponse,
    WebhookSecretResponse
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def generate_webhook_secret() -> str:
    """Generate a secure random secret for webhook signing"""
    return f"whsec_{secrets.token_hex(32)}"


@router.post("", response_model=WebhookSecretResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    request: WebhookCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Create a new webhook endpoint.
    
    Returns the webhook secret which is only shown once.
    Store it securely to verify webhook signatures.
    """
    # Validate session belongs to user if provided
    if request.session_id:
        session_result = supabase.table('sessions')\
            .select('id')\
            .eq('id', str(request.session_id))\
            .eq('user_id', current_user['id'])\
            .single()\
            .execute()
        
        if not session_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
    
    # Generate secret
    secret = generate_webhook_secret()
    
    # Create webhook
    result = supabase.table('webhooks').insert({
        'user_id': current_user['id'],
        'session_id': str(request.session_id) if request.session_id else None,
        'url': request.url,
        'secret': secret,
        'events': [e.value for e in request.events],
        'enabled': True
    }).execute()
    
    webhook_data = result.data[0]
    
    return WebhookSecretResponse(
        id=webhook_data['id'],
        url=webhook_data['url'],
        secret=secret,
        session_id=webhook_data['session_id'],
        events=webhook_data['events'],
        enabled=webhook_data['enabled'],
        created_at=webhook_data['created_at']
    )


@router.get("", response_model=WebhookListResponse)
async def list_webhooks(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """List all webhooks for the current user"""
    result = supabase.table('webhooks')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .execute()
    
    return WebhookListResponse(
        webhooks=[WebhookResponse(**w) for w in result.data],
        total=len(result.data)
    )


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """Get webhook details"""
    result = supabase.table('webhooks')\
        .select('*')\
        .eq('id', str(webhook_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    return WebhookResponse(**result.data)


@router.patch("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: UUID,
    request: WebhookUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """Update webhook configuration"""
    # Verify webhook exists and belongs to user
    existing = supabase.table('webhooks')\
        .select('*')\
        .eq('id', str(webhook_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Build update data
    update_data = {}
    if request.url is not None:
        update_data['url'] = request.url
    if request.events is not None:
        update_data['events'] = [e.value for e in request.events]
    if request.enabled is not None:
        update_data['enabled'] = request.enabled
    
    if not update_data:
        return WebhookResponse(**existing.data)
    
    # Update webhook
    result = supabase.table('webhooks')\
        .update(update_data)\
        .eq('id', str(webhook_id))\
        .execute()
    
    return WebhookResponse(**result.data[0])


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """Delete a webhook"""
    # Verify webhook exists and belongs to user
    existing = supabase.table('webhooks')\
        .select('id')\
        .eq('id', str(webhook_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Delete webhook
    supabase.table('webhooks')\
        .delete()\
        .eq('id', str(webhook_id))\
        .execute()
    
    return None


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookSecretResponse)
async def rotate_webhook_secret(
    webhook_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Rotate the webhook secret.
    
    Generates a new secret and returns it (only shown once).
    """
    # Verify webhook exists and belongs to user
    existing = supabase.table('webhooks')\
        .select('*')\
        .eq('id', str(webhook_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    # Generate new secret
    new_secret = generate_webhook_secret()
    
    # Update webhook
    result = supabase.table('webhooks')\
        .update({'secret': new_secret})\
        .eq('id', str(webhook_id))\
        .execute()
    
    webhook_data = result.data[0]
    
    return WebhookSecretResponse(
        id=webhook_data['id'],
        url=webhook_data['url'],
        secret=new_secret,
        session_id=webhook_data['session_id'],
        events=webhook_data['events'],
        enabled=webhook_data['enabled'],
        created_at=webhook_data['created_at']
    )


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_service_client),
):
    """
    Send a test ping event to the webhook URL.
    
    Returns the response status and body from the webhook endpoint.
    """
    import httpx
    import hmac
    import hashlib
    import json
    from datetime import datetime, timezone
    
    # Get webhook with secret
    result = supabase.table('webhooks')\
        .select('*')\
        .eq('id', str(webhook_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    webhook = result.data
    
    # Build test payload
    timestamp = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "id": f"evt_test_{timestamp}",
        "type": "webhook.test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "message": "This is a test event from WhatsApp API",
            "webhook_id": str(webhook_id)
        }
    }
    
    payload_json = json.dumps(payload, separators=(',', ':'))
    
    # Create HMAC signature
    signature_payload = f"{timestamp}.{payload_json}"
    signature = hmac.new(
        webhook['secret'].encode('utf-8'),
        signature_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}",
        "X-Webhook-Timestamp": str(timestamp),
        "User-Agent": "WhatsAppAPI-Webhook/1.0"
    }
    
    # Send test request
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                webhook['url'],
                content=payload_json,
                headers=headers
            )
            
            return {
                "success": response.status_code >= 200 and response.status_code < 300,
                "statusCode": response.status_code,
                "body": response.text[:500] if response.text else None,
                "headers": dict(response.headers),
                "latencyMs": int(response.elapsed.total_seconds() * 1000)
            }
    except httpx.TimeoutException:
        return {
            "success": False,
            "statusCode": None,
            "error": "Connection timeout (10s)",
            "latencyMs": 10000
        }
    except httpx.ConnectError as e:
        return {
            "success": False,
            "statusCode": None,
            "error": f"Connection failed: {str(e)}",
            "latencyMs": None
        }
    except Exception as e:
        return {
            "success": False,
            "statusCode": None,
            "error": str(e),
            "latencyMs": None
        }
