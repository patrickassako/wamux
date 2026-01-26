# Story 1.3: API Key Management System

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to generate and revoke API Keys,
So that I can authenticate my API requests programmatically.

## Acceptance Criteria

**Given** I am logged in with a Bearer Token
**When** I POST to `/v1/keys`
**Then** a new API Key (sk_...) is generated and hashed in the database
**And** I can see the key only once in the response
**When** I DELETE the key
**Then** it should no longer be valid for authentication

## Tasks / Subtasks

- [ ] Task 1: Create API Keys Database Schema (AC: Table and indexes created)
  - [ ] Create `api_keys` table with proper columns (id, user_id, key_hash, name, last_used_at, etc.)
  - [ ] Add RLS policies: users can only manage their own keys
  - [ ] Create index on `key_hash` for fast lookup during authentication
  - [ ] Create index on `user_id` for listing user's keys
  - [ ] Add `revoked_at` column for soft-delete pattern

- [ ] Task 2: Implement Secure Key Generation (AC: Keys are cryptographically secure)
  - [ ] Create `apps/api/src/core/security.py` with key generation utilities
  - [ ] Implement `generate_api_key()` function (format: `sk_live_` + 32 random bytes)
  - [ ] Implement `hash_api_key()` function using SHA-256
  - [ ] Implement `verify_api_key()` function for authentication
  - [ ] Add prefix validation (`sk_live_` for production, `sk_test_` for sandbox)

- [ ] Task 3: Create API Key CRUD Endpoints (AC: Users can manage keys)
  - [ ] Create `apps/api/src/api/v1/keys.py` router
  - [ ] Implement `POST /v1/keys` endpoint (create key)
  - [ ] Implement `GET /v1/keys` endpoint (list user's keys)
  - [ ] Implement `GET /v1/keys/{key_id}` endpoint (get single key details)
  - [ ] Implement `DELETE /v1/keys/{key_id}` endpoint (revoke key)
  - [ ] All endpoints protected with `Depends(get_current_user)`

- [ ] Task 4: Create Pydantic Models for API Keys (AC: Type-safe models)
  - [ ] Create `apps/api/src/models/api_key.py`
  - [ ] Implement `CreateKeyRequest` model (name, optional description)
  - [ ] Implement `KeyResponse` model (id, name, prefix, created_at, last_used_at)
  - [ ] Implement `KeyCreatedResponse` model (includes full key - shown once)
  - [ ] Use `alias_generator=to_camel` for CamelCase JSON output
  - [ ] Add field validators (name max length, description max length)

- [ ] Task 5: Implement API Key Authentication Middleware (AC: Keys work for auth)
  - [ ] Update `apps/api/src/core/auth.py` with API key authentication
  - [ ] Create `get_current_user_from_api_key()` dependency
  - [ ] Support both JWT Bearer tokens AND API keys in Authorization header
  - [ ] Validate key format before database lookup
  - [ ] Update `last_used_at` timestamp on successful authentication
  - [ ] Return 401 for revoked or invalid keys

- [ ] Task 6: Add Key Usage Tracking (AC: Track last usage and request count)
  - [ ] Add `request_count` column to `api_keys` table
  - [ ] Increment counter on each successful authentication
  - [ ] Update `last_used_at` timestamp
  - [ ] Create background task to avoid blocking requests
  - [ ] Add endpoint to view key usage statistics

- [ ] Task 7: Implement Key Rotation and Limits (AC: Security best practices)
  - [ ] Add `expires_at` column to `api_keys` table
  - [ ] Implement automatic expiration check in auth middleware
  - [ ] Limit max keys per user (e.g., 10 active keys)
  - [ ] Add warning when key is older than 90 days
  - [ ] Create endpoint for key rotation (generate new, revoke old)

- [ ] Task 8: Add Comprehensive Tests (AC: All key operations tested)
  - [ ] Write pytest tests for key generation (format, uniqueness, hashing)
  - [ ] Write pytest tests for CRUD operations (create, list, get, delete)
  - [ ] Write pytest tests for authentication with API keys
  - [ ] Write pytest tests for revoked keys (should fail auth)
  - [ ] Write pytest tests for expired keys
  - [ ] Write pytest tests for key limits (max 10 per user)
  - [ ] Achieve >85% code coverage for keys module

## Dev Notes

### Architecture Compliance

**Critical Security Decisions:**

1. **API Key Format and Storage**
   - Source: [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123)
   - Format: `sk_live_` + 32 random bytes (base64url encoded)
   - NEVER store keys in plaintext (hash with SHA-256)
   - Show full key ONLY once at creation
   - Store only hash + prefix (for display: `sk_live_****abcd`)
   - Use `secrets` module for cryptographic randomness

2. **Authentication Flow**
   - Source: [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123)
   - Support BOTH JWT Bearer tokens AND API keys
   - API key in header: `Authorization: Bearer sk_live_...`
   - Check format first (JWT vs API key) before database lookup
   - API key auth bypasses Supabase (direct DB lookup)
   - Track usage for rate limiting (future Story 4.2)

3. **Row Level Security (RLS)**
   - Source: [architecture.md#L236-L241](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L236-L241)
   - Users can only see/manage their own keys
   - Admin role can view all keys (for Story 4.4)
   - Soft-delete pattern: `revoked_at IS NULL` in queries
   - Hard-delete only for GDPR compliance

### Technical Requirements

**Database Schema (Supabase/Postgres):**

```sql
-- api_keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,  -- First 12 chars for display (e.g., "sk_live_abcd")
  name TEXT NOT NULL,
  description TEXT,
  request_count BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_name_length CHECK (char_length(name) <= 100),
  CONSTRAINT valid_description_length CHECK (char_length(description) <= 500)
);

-- Indexes for performance
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_expires_at ON public.api_keys(expires_at) WHERE revoked_at IS NULL;

-- RLS Policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER on_api_key_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check key limit
CREATE OR REPLACE FUNCTION public.check_api_key_limit()
RETURNS TRIGGER AS $$
DECLARE
  key_count INT;
BEGIN
  SELECT COUNT(*) INTO key_count
  FROM public.api_keys
  WHERE user_id = NEW.user_id AND revoked_at IS NULL;
  
  IF key_count >= 10 THEN
    RAISE EXCEPTION 'Maximum API key limit (10) reached for user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_api_key_limit
  BEFORE INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.check_api_key_limit();
```

**Python Security Utilities:**

Source: [project-context.md#L30-L42](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L30-L42)

```python
# apps/api/src/core/security.py
import secrets
import hashlib
from datetime import datetime, timedelta

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
    return datetime.utcnow() > expires_at
```

**Pydantic Models:**

```python
# apps/api/src/models/api_key.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class CreateKeyRequest(BaseModel):
    """Request to create a new API key"""
    model_config = ConfigDict(populate_by_name=True)
    
    name: str = Field(min_length=1, max_length=100, description="Friendly name for the key")
    description: str | None = Field(None, max_length=500, description="Optional description")
    expires_in_days: int | None = Field(None, ge=1, le=365, description="Optional expiration (1-365 days)")

class KeyResponse(BaseModel):
    """API key response (without full key)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    id: UUID
    name: str
    description: str | None = None
    key_prefix: str  # e.g., "sk_live_a1b2****"
    request_count: int
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class KeyCreatedResponse(KeyResponse):
    """Response when creating a new key (includes full key - shown once!)"""
    api_key: str = Field(description="Full API key - save this, it won't be shown again!")

class KeyListResponse(BaseModel):
    """List of API keys"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    keys: list[KeyResponse]
    total: int

class KeyUsageStats(BaseModel):
    """API key usage statistics"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    key_id: UUID
    request_count: int
    last_used_at: datetime | None
    created_at: datetime
    days_since_creation: int
    is_expired: bool
    expires_at: datetime | None
```

**FastAPI Endpoints:**

```python
# apps/api/src/api/v1/keys.py
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from datetime import datetime, timedelta
from uuid import UUID

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_client
from ...core.security import generate_api_key, hash_api_key, get_key_prefix
from ...models.api_key import (
    CreateKeyRequest,
    KeyResponse,
    KeyCreatedResponse,
    KeyListResponse,
    KeyUsageStats
)

router = APIRouter(prefix="/v1/keys", tags=["API Keys"])

@router.post("", response_model=KeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateKeyRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
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
        expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
    
    # Insert into database
    try:
        result = supabase.table('api_keys').insert({
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
    supabase: Client = Depends(get_supabase_client)
):
    """List all active API keys for the authenticated user"""
    result = supabase.table('api_keys')\
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
    supabase: Client = Depends(get_supabase_client)
):
    """Get details of a specific API key"""
    result = supabase.table('api_keys')\
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
    supabase: Client = Depends(get_supabase_client)
):
    """
    Revoke an API key (soft delete).
    
    The key will no longer be valid for authentication.
    """
    result = supabase.table('api_keys')\
        .update({'revoked_at': datetime.utcnow().isoformat()})\
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
    supabase: Client = Depends(get_supabase_client)
):
    """Get usage statistics for a specific API key"""
    result = supabase.table('api_keys')\
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
    days_since_creation = (datetime.utcnow() - created_at).days
    
    expires_at = datetime.fromisoformat(key_data['expires_at']) if key_data.get('expires_at') else None
    is_expired = expires_at and datetime.utcnow() > expires_at
    
    return KeyUsageStats(
        key_id=key_data['id'],
        request_count=key_data['request_count'],
        last_used_at=key_data.get('last_used_at'),
        created_at=key_data['created_at'],
        days_since_creation=days_since_creation,
        is_expired=is_expired,
        expires_at=expires_at
    )
```

**Enhanced Auth Middleware (API Key Support):**

```python
# apps/api/src/core/auth.py (updated)
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from datetime import datetime
from .supabase import get_supabase_client
from .security import hash_api_key, verify_api_key_format, is_api_key_expired

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Validate JWT OR API key and return current user.
    
    Supports two authentication methods:
    1. JWT Bearer token (from Supabase Auth)
    2. API key (sk_live_... or sk_test_...)
    """
    token = credentials.credentials
    
    # Check if it's an API key (starts with sk_)
    if verify_api_key_format(token):
        return await authenticate_with_api_key(token, supabase)
    else:
        return await authenticate_with_jwt(token, supabase)

async def authenticate_with_jwt(token: str, supabase: Client):
    """Authenticate using Supabase JWT token"""
    try:
        user = supabase.auth.get_user(token)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        profile = supabase.table('profiles').select('*').eq('id', user.user.id).single().execute()
        return profile.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )

async def authenticate_with_api_key(api_key: str, supabase: Client):
    """Authenticate using API key"""
    try:
        # Hash the provided key
        key_hash = hash_api_key(api_key)
        
        # Lookup key in database
        result = supabase.table('api_keys')\
            .select('*, profiles(*)')\
            .eq('key_hash', key_hash)\
            .is_('revoked_at', 'null')\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        key_data = result.data
        
        # Check expiration
        if is_api_key_expired(key_data.get('expires_at')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has expired"
            )
        
        # Update usage stats (background task to avoid blocking)
        supabase.table('api_keys')\
            .update({
                'last_used_at': datetime.utcnow().isoformat(),
                'request_count': key_data['request_count'] + 1
            })\
            .eq('id', key_data['id'])\
            .execute()
        
        # Return user profile
        return key_data['profiles']
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate API key: {str(e)}"
        )
```

### Library & Framework Requirements

**No new dependencies required** - all functionality uses existing libraries:
- `secrets` (Python stdlib) for cryptographic randomness
- `hashlib` (Python stdlib) for SHA-256 hashing
- Existing Supabase client for database operations

### File Structure Requirements

**New Files to Create:**

```
apps/api/src/
├── core/
│   ├── security.py          # NEW: API key generation and hashing
│   └── auth.py              # UPDATED: Add API key authentication
├── api/
│   └── v1/
│       └── keys.py          # NEW: API key CRUD endpoints
├── models/
│   └── api_key.py           # NEW: Pydantic models for API keys
└── tests/
    └── test_api_keys.py     # NEW: Comprehensive API key tests
```

**Database Migrations:**
```
infra/
└── supabase/
    └── migrations/
        └── 002_create_api_keys.sql  # SQL schema from above
```

### Testing Requirements

**Pytest Test Cases:**

```python
# apps/api/src/tests/test_api_keys.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from ..core.security import generate_api_key, hash_api_key, verify_api_key_format

def test_generate_api_key():
    """Test API key generation format"""
    key = generate_api_key("sk_live")
    assert key.startswith("sk_live_")
    assert len(key) >= 40
    assert verify_api_key_format(key)

def test_hash_api_key():
    """Test API key hashing is consistent"""
    key = "sk_live_test123"
    hash1 = hash_api_key(key)
    hash2 = hash_api_key(key)
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex length

def test_create_api_key_success(client: TestClient, auth_headers, mock_supabase):
    """Test successful API key creation"""
    response = client.post("/v1/keys", 
        headers=auth_headers,
        json={"name": "Production Key", "description": "Main API key"}
    )
    assert response.status_code == 201
    assert "apiKey" in response.json()
    assert response.json()["apiKey"].startswith("sk_live_")
    assert response.json()["name"] == "Production Key"

def test_create_api_key_with_expiration(client: TestClient, auth_headers):
    """Test API key creation with expiration"""
    response = client.post("/v1/keys",
        headers=auth_headers,
        json={"name": "Temp Key", "expiresInDays": 30}
    )
    assert response.status_code == 201
    assert response.json()["expiresAt"] is not None

def test_create_api_key_limit_exceeded(client: TestClient, auth_headers, mock_supabase):
    """Test API key creation when limit is reached"""
    mock_supabase.table().insert().execute.side_effect = Exception("Maximum API key limit")
    response = client.post("/v1/keys",
        headers=auth_headers,
        json={"name": "Too Many Keys"}
    )
    assert response.status_code == 400
    assert "limit" in response.json()["detail"].lower()

def test_list_api_keys(client: TestClient, auth_headers, mock_supabase):
    """Test listing user's API keys"""
    response = client.get("/v1/keys", headers=auth_headers)
    assert response.status_code == 200
    assert "keys" in response.json()
    assert "total" in response.json()

def test_get_api_key_details(client: TestClient, auth_headers, mock_supabase):
    """Test getting single API key details"""
    key_id = "550e8400-e29b-41d4-a716-446655440000"
    response = client.get(f"/v1/keys/{key_id}", headers=auth_headers)
    assert response.status_code == 200
    assert "keyPrefix" in response.json()
    assert "apiKey" not in response.json()  # Full key never shown again

def test_revoke_api_key(client: TestClient, auth_headers, mock_supabase):
    """Test revoking an API key"""
    key_id = "550e8400-e29b-41d4-a716-446655440000"
    response = client.delete(f"/v1/keys/{key_id}", headers=auth_headers)
    assert response.status_code == 204

def test_authenticate_with_api_key(client: TestClient, mock_supabase):
    """Test authentication using API key"""
    api_key = "sk_live_test123456789"
    response = client.get("/v1/profile", 
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200

def test_authenticate_with_revoked_key(client: TestClient, mock_supabase):
    """Test authentication with revoked API key fails"""
    mock_supabase.table().select().eq().is_().single().execute.return_value.data = None
    api_key = "sk_live_revoked123"
    response = client.get("/v1/profile",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 401

def test_authenticate_with_expired_key(client: TestClient, mock_supabase):
    """Test authentication with expired API key fails"""
    # Mock expired key
    mock_supabase.table().select().eq().is_().single().execute.return_value.data = {
        'expires_at': '2020-01-01T00:00:00Z'
    }
    api_key = "sk_live_expired123"
    response = client.get("/v1/profile",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()

def test_get_key_usage_stats(client: TestClient, auth_headers, mock_supabase):
    """Test getting API key usage statistics"""
    key_id = "550e8400-e29b-41d4-a716-446655440000"
    response = client.get(f"/v1/keys/{key_id}/usage", headers=auth_headers)
    assert response.status_code == 200
    assert "requestCount" in response.json()
    assert "daysSinceCreation" in response.json()
```

### Project Structure Notes

**Alignment with Architecture:**
- API keys stored ONLY in Python API database (Node.js never sees them)
- Hashing ensures keys are never stored in plaintext
- RLS ensures users can only manage their own keys
- Soft-delete pattern allows audit trail

**Dependencies on Previous Stories:**
- Story 1.1: Requires database infrastructure
- Story 1.2: Requires `profiles` table and auth middleware
- Uses `get_current_user` dependency from Story 1.2

**Prepares for Future Stories:**
- Story 1.4+: API keys will be used for programmatic access
- Story 4.2: `request_count` enables rate limiting
- Story 4.4: Admin can view all keys for monitoring

**Security Best Practices:**
- Cryptographically secure random generation (`secrets` module)
- SHA-256 hashing (one-way, cannot reverse)
- Show full key only once (at creation)
- Soft-delete for audit trail
- Expiration support for key rotation
- Usage tracking for anomaly detection

### References

**Primary Documents:**
- [epics.md#L136-L149](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L136-L149) - Story 1.3 complete context
- [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123) - Zero-Trust security
- [project-context.md#L122-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L122-L123) - Security validation rules

**Key Architecture Sections:**
- Authentication: [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123)
- Data Boundaries: [architecture.md#L236-L241](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L236-L241)
- Pydantic Models: [architecture.md#L106-L109](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L106-L109)

**Functional Requirements:**
- FR2: API Key Management - [epics.md#L18](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L18)

**Previous Stories:**
- [1-1-project-initialization-monorepo-setup.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-1-project-initialization-monorepo-setup.md) - Infrastructure foundation
- [1-2-user-authentication-profile-management.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-2-user-authentication-profile-management.md) - Auth patterns and profiles table

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
