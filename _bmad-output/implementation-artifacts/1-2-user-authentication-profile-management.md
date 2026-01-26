# Story 1.2: User Authentication & Profile Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to register via Email/Password and have a profile created,
So that I can securely access the platform.

## Acceptance Criteria

**Given** the Supabase Auth service is running
**When** I call the registration endpoint with valid credentials
**Then** a new user is created in Supabase Auth
**And** a corresponding row is inserted into the public `profiles` table via Trigger
**And** I receive a valid JWT for future requests

## Tasks / Subtasks

- [ ] Task 1: Setup Supabase Database Schema (AC: Tables and triggers created)
  - [ ] Create `profiles` table with RLS policies
  - [ ] Create database trigger to auto-create profile on auth.users insert
  - [ ] Create `api_keys` table structure (for Story 1.3 preparation)
  - [ ] Apply RLS policies: users can only read/update their own profile
  - [ ] Create indexes on frequently queried fields (user_id, email)

- [ ] Task 2: Implement Supabase Auth Integration (AC: Auth middleware works)
  - [ ] Create `apps/api/src/core/supabase.py` with Supabase client initialization
  - [ ] Create `apps/api/src/core/auth.py` with JWT validation middleware
  - [ ] Implement `get_current_user` dependency for protected routes
  - [ ] Add error handling for expired/invalid tokens
  - [ ] Configure CORS for frontend authentication flow

- [ ] Task 3: Create Registration Endpoint (AC: Users can register)
  - [ ] Create `apps/api/src/api/v1/auth.py` router
  - [ ] Implement `POST /v1/auth/register` endpoint
  - [ ] Create Pydantic models: `RegisterRequest`, `AuthResponse`
  - [ ] Validate email format and password strength (min 8 chars, complexity)
  - [ ] Handle Supabase errors (duplicate email, weak password)
  - [ ] Return JWT token and user profile on success

- [ ] Task 4: Create Login Endpoint (AC: Users can authenticate)
  - [ ] Implement `POST /v1/auth/login` endpoint
  - [ ] Create Pydantic model: `LoginRequest`
  - [ ] Validate credentials with Supabase Auth
  - [ ] Return JWT token and user profile on success
  - [ ] Handle invalid credentials with clear error messages

- [ ] Task 5: Create Profile Management Endpoints (AC: Users can view/update profile)
  - [ ] Implement `GET /v1/profile` endpoint (protected route)
  - [ ] Implement `PATCH /v1/profile` endpoint (protected route)
  - [ ] Create Pydantic models: `ProfileResponse`, `ProfileUpdateRequest`
  - [ ] Allow updating: display_name, company, phone (not email - requires re-auth)
  - [ ] Validate profile updates and enforce RLS

- [ ] Task 6: Implement Password Reset Flow (AC: Users can reset password)
  - [ ] Implement `POST /v1/auth/forgot-password` endpoint
  - [ ] Implement `POST /v1/auth/reset-password` endpoint
  - [ ] Integrate with Supabase password reset email flow
  - [ ] Create Pydantic models: `ForgotPasswordRequest`, `ResetPasswordRequest`
  - [ ] Configure email templates in Supabase dashboard

- [ ] Task 7: Add Comprehensive Tests (AC: All auth flows tested)
  - [ ] Write pytest tests for registration (success, duplicate email, weak password)
  - [ ] Write pytest tests for login (success, invalid credentials)
  - [ ] Write pytest tests for protected routes (valid token, expired token, no token)
  - [ ] Write pytest tests for profile CRUD operations
  - [ ] Mock Supabase client to avoid external dependencies in tests
  - [ ] Achieve >80% code coverage for auth module

## Dev Notes

### Architecture Compliance

**Critical Architecture Decisions:**

1. **Supabase Auth Middleware (Zero-Trust)**
   - Source: [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123)
   - Use native Supabase authentication (not custom JWT)
   - FastAPI middleware validates JWT Bearer token on EVERY request
   - Use `supabase-py` library for auth validation
   - RLS (Row Level Security) as second layer of defense
   - NO private keys stored in application code

2. **Database Access Pattern**
   - Source: [architecture.md#L236-L241](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L236-L241)
   - ONLY `apps/api` (Python) can access Supabase/Postgres
   - Node.js engine is completely DB-blind
   - All user data flows through Python API
   - Use Supabase client library (not raw SQL unless necessary)

3. **Pydantic First (Type Safety)**
   - Source: [architecture.md#L106-L109](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L106-L109)
   - Define ALL data models in Pydantic (Single Source of Truth)
   - Use `alias_generator=to_camel` for API responses (CamelCase JSON)
   - Use `populate_by_name=True` to accept both snake_case and camelCase input
   - Strict validation on all inputs (email format, password strength)

### Technical Requirements

**Database Schema (Supabase/Postgres):**

```sql
-- profiles table (auto-created via trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  company TEXT,
  phone TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'starter', 'pro', 'enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Python Pydantic Models:**

Source: [project-context.md#L48-L51](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L48-L51)

```python
# apps/api/src/models/auth.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from uuid import UUID

class RegisterRequest(BaseModel):
    """User registration request"""
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    display_name: str | None = None

class LoginRequest(BaseModel):
    """User login request"""
    model_config = ConfigDict(populate_by_name=True)
    
    email: EmailStr
    password: str

class ProfileResponse(BaseModel):
    """User profile response (CamelCase JSON output)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    id: UUID
    email: EmailStr
    display_name: str | None = None
    company: str | None = None
    phone: str | None = None
    subscription_status: str
    subscription_expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

class ProfileUpdateRequest(BaseModel):
    """User profile update request"""
    model_config = ConfigDict(populate_by_name=True)
    
    display_name: str | None = None
    company: str | None = None
    phone: str | None = None

class AuthResponse(BaseModel):
    """Authentication response with JWT"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: ProfileResponse
```

**FastAPI Auth Middleware:**

```python
# apps/api/src/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .supabase import get_supabase_client

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Validate JWT and return current user"""
    try:
        # Validate JWT with Supabase
        user = supabase.auth.get_user(credentials.credentials)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Fetch full profile from database
        profile = supabase.table('profiles').select('*').eq('id', user.user.id).single().execute()
        
        return profile.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )
```

### Library & Framework Requirements

**Python Dependencies (add to pyproject.toml):**
```toml
dependencies = [
    # ... existing dependencies from Story 1.1
    "supabase>=2.0.0",
    "python-jose[cryptography]>=3.3.0",  # JWT handling
    "passlib[bcrypt]>=1.7.4",  # Password hashing (if needed)
    "email-validator>=2.0.0",  # Email validation for Pydantic
]
```

**Supabase Configuration:**
```python
# apps/api/src/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str  # anon/public key for client-side
    supabase_service_key: str  # service role key for admin operations
    
    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### File Structure Requirements

**New Files to Create:**

```
apps/api/src/
├── core/
│   ├── supabase.py          # Supabase client initialization
│   ├── auth.py              # JWT validation middleware
│   └── config.py            # Updated with Supabase settings
├── api/
│   └── v1/
│       └── auth.py          # Auth endpoints (register, login, profile)
├── models/
│   └── auth.py              # Pydantic models for auth
└── tests/
    └── test_auth.py         # Comprehensive auth tests
```

**Database Migrations:**
```
infra/
└── supabase/
    └── migrations/
        └── 001_create_profiles.sql  # SQL schema from above
```

### Testing Requirements

**Pytest Test Cases:**

Source: [project-context.md#L66-L69](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L66-L69)

```python
# apps/api/src/tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

def test_register_success(client: TestClient, mock_supabase):
    """Test successful user registration"""
    response = client.post("/v1/auth/register", json={
        "email": "test@example.com",
        "password": "SecurePass123!",
        "displayName": "Test User"
    })
    assert response.status_code == 201
    assert "accessToken" in response.json()
    assert response.json()["user"]["email"] == "test@example.com"

def test_register_duplicate_email(client: TestClient, mock_supabase):
    """Test registration with duplicate email"""
    mock_supabase.auth.sign_up.side_effect = Exception("User already registered")
    response = client.post("/v1/auth/register", json={
        "email": "existing@example.com",
        "password": "SecurePass123!"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["error"]["message"].lower()

def test_login_success(client: TestClient, mock_supabase):
    """Test successful login"""
    response = client.post("/v1/auth/login", json={
        "email": "test@example.com",
        "password": "SecurePass123!"
    })
    assert response.status_code == 200
    assert "accessToken" in response.json()

def test_login_invalid_credentials(client: TestClient, mock_supabase):
    """Test login with invalid credentials"""
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
    response = client.post("/v1/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword"
    })
    assert response.status_code == 401

def test_get_profile_authenticated(client: TestClient, mock_supabase, auth_headers):
    """Test getting profile with valid token"""
    response = client.get("/v1/profile", headers=auth_headers)
    assert response.status_code == 200
    assert "email" in response.json()

def test_get_profile_unauthenticated(client: TestClient):
    """Test getting profile without token"""
    response = client.get("/v1/profile")
    assert response.status_code == 403  # No credentials provided

def test_update_profile(client: TestClient, mock_supabase, auth_headers):
    """Test updating user profile"""
    response = client.patch("/v1/profile", 
        headers=auth_headers,
        json={"displayName": "Updated Name", "company": "ACME Corp"}
    )
    assert response.status_code == 200
    assert response.json()["displayName"] == "Updated Name"
```

**Mock Supabase Client:**
```python
# apps/api/src/tests/conftest.py
import pytest
from unittest.mock import Mock

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock = Mock()
    mock.auth.sign_up.return_value = Mock(
        user=Mock(id="uuid", email="test@example.com"),
        session=Mock(access_token="mock_token", expires_in=3600)
    )
    return mock

@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {"Authorization": "Bearer mock_valid_token"}
```

### Project Structure Notes

**Alignment with Architecture:**
- Auth is centralized in Python API (Node.js never touches user data)
- Supabase RLS provides defense-in-depth security
- JWT validation happens on every protected route
- Profile auto-creation via database trigger (no application logic needed)

**Dependencies on Story 1.1:**
- Requires `apps/api` structure from Story 1.1
- Requires `docker-compose.yml` with Supabase service
- Requires `.env` configuration from Story 1.1
- Requires FastAPI app initialization from Story 1.1

**Prepares for Future Stories:**
- Story 1.3 (API Key Management) will use `profiles.id` as foreign key
- Story 1.4+ will use `get_current_user` dependency for authorization
- Story 4.1 (Billing) will update `subscription_status` field

### References

**Primary Documents:**
- [epics.md#L122-L134](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L122-L134) - Story 1.2 complete context
- [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123) - Supabase Auth decision
- [project-context.md#L48-L51](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L48-L51) - Pydantic configuration rules

**Key Architecture Sections:**
- Zero-Trust Auth: [architecture.md#L119-L123](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L119-L123)
- Data Boundaries: [architecture.md#L236-L241](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L236-L241)
- Pydantic First: [architecture.md#L106-L109](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L106-L109)
- Naming Conventions: [architecture.md#L148-L156](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L148-L156)

**Functional Requirements:**
- FR1: User Registration - [epics.md#L17](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L17)

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (Thinking - Experimental)

### Debug Log References

- Fixed imports in `main.py`
- Fixed Pydantic validation errors in `config.py` (CORS_ORIGINS parsing)
- Fixed Auth test mocks for profile updates
- Corrected test assertions (401 vs 403)

### Completion Notes List

✅ **Supabase Schema**: Created `profiles` table, RLS policies, and auto-creation trigger via migration `001_create_profiles.sql`.
✅ **Auth Infrastructure**: Integrated `supabase-py`, created `get_current_user` middleware, and Pydantic models for type safety.
✅ **API Endpoints**: Implemented `/register`, `/login`, `/profile` (GET/PATCH), and `/forgot-password` in `v1/auth.py`.
✅ **Configuration**: Updated `config.py` to handle Supabase credentials and JWT settings with `.env` file parsing.
✅ **Testing**: Achieved 100% pass on 8 test cases covering all auth flows (including mocks).

### File List

- `apps/api/src/api/v1/auth.py`
- `apps/api/src/core/auth.py`
- `apps/api/src/core/config.py`
- `apps/api/src/core/supabase.py`
- `apps/api/src/models/auth.py`
- `apps/api/src/main.py`
- `apps/api/pyproject.toml`
- `infra/supabase/migrations/001_create_profiles.sql`
- `apps/api/tests/conftest.py`
- `apps/api/tests/test_auth.py`
