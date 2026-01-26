"""
Pytest configuration and fixtures.
"""
import pytest
from unittest.mock import Mock, MagicMock
from fastapi.testclient import TestClient
from src.main import app
from src.core.supabase import get_supabase_client, get_supabase_service_client

@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    mock = MagicMock()
    return mock

@pytest.fixture
def client(mock_supabase):
    """Test client with mocked dependencies."""
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase
    app.dependency_overrides[get_supabase_service_client] = lambda: mock_supabase
    return TestClient(app)

@pytest.fixture
def auth_headers():
    """Valid authentication headers."""
    return {"Authorization": "Bearer valid_token"}

@pytest.fixture
def mock_user_payload():
    """Mock Supabase user payload."""
    return {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "test@example.com",
        "app_metadata": {},
        "user_metadata": {},
        "aud": "authenticated",
        "created_at": "2023-01-01T00:00:00Z"
    }

@pytest.fixture
def mock_profile_data():
    """Mock profile data from database."""
    return {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "test@example.com",
        "display_name": "Test User",
        "company": "Test Corp",
        "phone": "+1234567890",
        "subscription_status": "free",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
    }
