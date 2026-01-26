from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from datetime import datetime, timedelta, timezone
from uuid import UUID

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client
from ...core.security import generate_api_key, hash_api_key, get_key_prefix
from ...models.api_key import (
    CreateKeyRequest,
    KeyResponse,
    KeyCreatedResponse,
    KeyListResponse,
    KeyUsageStats
)

router = APIRouter(prefix="/keys", tags=["API Keys"])

@router.post("", response_model=KeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateKeyRequest,
    current_user: dict = Depends(get_current_user),
    service_client: Client = Depends(get_supabase_service_client)
):
    """
    Create a new API key for the authenticated user.
    
    **WARNING:** The full API key is returned only once. Save it securely!
    """
    # Generate key
    api_key = generate_api_key("sk_live")
    key_hash = hash_api_key(api_key)
    key_prefix = get_key_prefix(api_key)
    
    # Calculate expiration
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_in_days)
    
    # Insert into database
    try:
        result = service_client.table('api_keys').insert({
            'user_id': current_user['id'],
            'key_hash': key_hash,
            'key_prefix': key_prefix,
            'name': request.name,
            'description': request.description,
            'expires_at': expires_at.isoformat() if expires_at else None
        }).execute()
        
        key_data = result.data[0]
        
        # Return response with full key (only time it's shown!)
        return KeyCreatedResponse(
            **key_data,
            api_key=api_key  # Full key included
        )
        
    except Exception as e:
        if "Maximum API key limit" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum API key limit (10) reached. Please revoke unused keys."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )

@router.get("", response_model=KeyListResponse)
async def list_api_keys(
    current_user: dict = Depends(get_current_user),
    service_client: Client = Depends(get_supabase_service_client)
):
    """List all active API keys for the authenticated user"""
    result = service_client.table('api_keys')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .is_('revoked_at', 'null')\
        .order('created_at', desc=True)\
        .execute()
    
    return KeyListResponse(
        keys=[KeyResponse(**key) for key in result.data],
        total=len(result.data)
    )

@router.get("/{key_id}", response_model=KeyResponse)
async def get_api_key(
    key_id: UUID,
    current_user: dict = Depends(get_current_user),
    service_client: Client = Depends(get_supabase_service_client)
):
    """Get details of a specific API key"""
    result = service_client.table('api_keys')\
        .select('*')\
        .eq('id', str(key_id))\
        .eq('user_id', current_user['id'])\
        .is_('revoked_at', 'null')\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    return KeyResponse(**result.data)

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: UUID,
    current_user: dict = Depends(get_current_user),
    service_client: Client = Depends(get_supabase_service_client)
):
    """
    Revoke an API key (soft delete).
    
    The key will no longer be valid for authentication.
    """
    result = service_client.table('api_keys')\
        .update({'revoked_at': datetime.now(timezone.utc).isoformat()})\
        .eq('id', str(key_id))\
        .eq('user_id', current_user['id'])\
        .is_('revoked_at', 'null')\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or already revoked"
        )
    
    return None

@router.get("/{key_id}/usage", response_model=KeyUsageStats)
async def get_key_usage_stats(
    key_id: UUID,
    current_user: dict = Depends(get_current_user),
    service_client: Client = Depends(get_supabase_service_client)
):
    """Get usage statistics for a specific API key"""
    result = service_client.table('api_keys')\
        .select('*')\
        .eq('id', str(key_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    key_data = result.data
    created_at = datetime.fromisoformat(key_data['created_at'])
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
        
    days_since_creation = (datetime.now(timezone.utc) - created_at).days
    
    expires_at = None
    if key_data.get('expires_at'):
        expires_at = datetime.fromisoformat(key_data['expires_at'])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
    is_expired = expires_at and datetime.now(timezone.utc) > expires_at
    
    return KeyUsageStats(
        key_id=key_data['id'],
        request_count=key_data['request_count'],
        last_used_at=key_data.get('last_used_at'),
        created_at=key_data['created_at'],
        days_since_creation=days_since_creation,
        is_expired=bool(is_expired),
        expires_at=expires_at
    )
