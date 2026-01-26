"""
Supabase client initialization.
"""
from supabase import create_client, Client
from .config import settings

def get_supabase_client() -> Client:
    """
    Get initialized Supabase client.
    
    Returns:
        Client: Supabase client instance
    """
    return create_client(settings.supabase_url, settings.supabase_key)

def get_supabase_service_client() -> Client:
    """
    Get initialized Supabase client with service role key (admin).
    
    Returns:
        Client: Supabase admin client instance
    """
    if not settings.supabase_service_key:
        raise ValueError("SUPABASE_SERVICE_KEY not configured")
    return create_client(settings.supabase_url, settings.supabase_service_key)
