"""
Tests for authentication endpoints.
"""
from unittest.mock import Mock

def test_register_success(client, mock_supabase, mock_profile_data):
    """Test successful user registration."""
    # Mock sign_up response
    mock_supabase.auth.sign_up.return_value = Mock(
        user=Mock(id="123e4567-e89b-12d3-a456-426614174000"),
        session=Mock(access_token="new_token", expires_in=3600)
    )
    
    # Mock profile fetch and update
    # We need to mock both .select() and .update() chains
    mock_select = Mock()
    mock_select.eq.return_value.single.return_value.execute.return_value = Mock(data=mock_profile_data)
    mock_supabase.table.return_value.select.return_value = mock_select
    
    mock_update = Mock()
    mock_update.eq.return_value.execute.return_value = Mock(data=[mock_profile_data])
    mock_supabase.table.return_value.update.return_value = mock_update
    
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "SecurePass123!",
        "displayName": "Test User"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["subscriptionStatus"] == "free"

def test_login_success(client, mock_supabase, mock_profile_data):
    """Test successful login."""
    # Mock sign_in response
    mock_supabase.auth.sign_in_with_password.return_value = Mock(
        user=Mock(id="123e4567-e89b-12d3-a456-426614174000"),
        session=Mock(access_token="valid_token", expires_in=3600)
    )
    
    # Mock profile fetch
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = Mock(
        data=mock_profile_data
    )
    
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "SecurePass123!"
    })
    
    assert response.status_code == 200
    assert "accessToken" in response.json()

def test_login_invalid_credentials(client, mock_supabase):
    """Test login with invalid credentials."""
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
    
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "WrongPassword"
    })
    
    assert response.status_code == 401

def test_get_profile_success(client, mock_supabase, auth_headers, mock_user_payload, mock_profile_data):
    """Test get profile with valid token."""
    # Mock get_user response
    mock_supabase.auth.get_user.return_value = Mock(
        user=Mock(id="123e4567-e89b-12d3-a456-426614174000")
    )
    
    # Mock profile fetch
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = Mock(
        data=mock_profile_data
    )
    
    response = client.get("/api/v1/auth/profile", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_get_profile_unauthorized(client, mock_supabase):
    """Test get profile without token."""
    response = client.get("/api/v1/auth/profile")
    # FastAPI HTTPBearer returns 401 when not authenticated (default behavior)
    assert response.status_code == 401

def test_update_profile_success(client, mock_supabase, auth_headers, mock_profile_data):
    """Test update profile."""
    # Mock get_user
    mock_supabase.auth.get_user.return_value = Mock(
        user=Mock(id="123e4567-e89b-12d3-a456-426614174000")
    )
    
    # Mock profile fetch for get_current_user
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = Mock(
        data=mock_profile_data
    )
    
    # Mock update response
    updated_data = mock_profile_data.copy()
    updated_data["display_name"] = "Updated Name"
    # Update mock to handle chain correctly
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock(
        data=[updated_data]
    )
    
    response = client.patch("/api/v1/auth/profile", 
        headers=auth_headers,
        json={"displayName": "Updated Name"}
    )
    
    assert response.status_code == 200
    assert response.json()["displayName"] == "Updated Name"
