"""
Authentication middleware and dependencies.
"""
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .supabase import get_supabase_client, get_supabase_service_client
from .security import hash_api_key, verify_api_key_format, is_api_key_expired

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
    service_client: Client = Depends(get_supabase_service_client)
):
    """
    Validate JWT token OR API Key and return current user profile.
    
    Supports:
    1. JWT Bearer token (from Supabase Auth)
    2. API Key (sk_live_... or sk_test_...)
    """
    token = credentials.credentials
    
    # Check if it's an API key (based on prefix)
    if verify_api_key_format(token):
        return await authenticate_with_api_key(token, service_client)
    else:
        return await authenticate_with_jwt(token, supabase, service_client)

async def authenticate_with_jwt(token: str, supabase: Client, service_client: Client):
    """Authenticate using Supabase JWT token"""
    try:
        # Validate JWT with Supabase Auth
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Fetch full profile using Service Role (Bypass RLS)
        # Using injected service_client ensures tests can mock this
        profile = service_client.table('profiles').select('*').eq('id', user_response.user.id).single().execute()
        
        return profile.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def authenticate_with_api_key(api_key: str, service_client: Client):
    """Authenticate using API key"""
    try:
        # Hash the provided key for lookup
        key_hash = hash_api_key(api_key)
        
        # Lookup key
        result = service_client.table('api_keys')\
            .select('*, profiles(*)')\
            .eq('key_hash', key_hash)\
            .is_('revoked_at', 'null')\
            .single()\
            .execute()
            
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        key_data = result.data
        
        # Check expiration
        expires_at = None
        if key_data.get('expires_at'):
             expires_at = datetime.fromisoformat(key_data['expires_at'])
             
        if is_api_key_expired(expires_at):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Update usage stats (Synchronous for now, move to task queue later)
        try:
            service_client.table('api_keys').update({
                'last_used_at': datetime.now(timezone.utc).isoformat(),
                'request_count': (key_data.get('request_count') or 0) + 1
            }).eq('id', key_data['id']).execute()
        except Exception:
            pass
            
        # Return user profile associated with the key
        return key_data['profiles']
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate API key: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
