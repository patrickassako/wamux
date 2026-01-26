"""
Security utilities for API Key generation and hashing.
"""
import secrets
import hashlib
from datetime import datetime, timezone

def generate_api_key(prefix: str = "sk_live") -> str:
    """
    Generate a cryptographically secure API key.
    
    Format: {prefix}_{32_random_bytes_base64url}
    Example: sk_live_{random_string}
    """
    random_bytes = secrets.token_urlsafe(32)
    return f"{prefix}_{random_bytes}"

def hash_api_key(api_key: str) -> str:
    """
    Hash API key using SHA-256.
    
    Args:
        api_key: The full API key (e.g., sk_live_...)
    
    Returns:
        Hex-encoded SHA-256 hash
    """
    return hashlib.sha256(api_key.encode()).hexdigest()

def get_key_prefix(api_key: str) -> str:
    """
    Extract displayable prefix from API key.
    
    Returns first 12 characters for safe display.
    Example: sk_live_a1b2 (shows first 4 chars after prefix)
    """
    if len(api_key) < 12:
        return api_key
    return api_key[:12] + "****"

def verify_api_key_format(api_key: str) -> bool:
    """
    Validate API key format without database lookup.
    
    Valid formats:
    - sk_live_... (production)
    - sk_test_... (sandbox/testing)
    """
    valid_prefixes = ["sk_live_", "sk_test_"]
    return any(api_key.startswith(prefix) for prefix in valid_prefixes) and len(api_key) >= 40

def is_api_key_expired(expires_at: datetime | None) -> bool:
    """Check if API key has expired"""
    if expires_at is None:
        return False
    # Ensure expires_at is timezone-aware if not already
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    return datetime.now(timezone.utc) > expires_at
