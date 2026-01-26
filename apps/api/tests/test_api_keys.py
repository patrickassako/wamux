import pytest
from unittest.mock import Mock, ANY
from src.core.security import generate_api_key, hash_api_key, verify_api_key_format

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

def test_create_api_key_success(client, auth_headers, mock_supabase, mock_user_payload):
    """Test successful API key creation"""
    # Mock get_user for current_user
    mock_supabase.auth.get_user.return_value = Mock(user=Mock(id=mock_user_payload["id"]))
    
    # Mock insert response
    mock_key_data = {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Production Key",
        "description": "Main API key",
        "key_prefix": "sk_live_abcd",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z",
        "request_count": 0
    }
    mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock(data=[mock_key_data])
    
    response = client.post("/api/v1/keys", 
        headers=auth_headers,
        json={"name": "Production Key", "description": "Main API key"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "apiKey" in data
    assert data["apiKey"].startswith("sk_live_")
    assert data["name"] == "Production Key"

def test_list_api_keys(client, auth_headers, mock_supabase, mock_user_payload):
    """Test listing user's API keys"""
    # Mock get_user
    mock_supabase.auth.get_user.return_value = Mock(user=Mock(id=mock_user_payload["id"]))
    
    # Mock select response
    mock_supabase.table.return_value.select.return_value.eq.return_value.is_.return_value.order.return_value.execute.return_value = Mock(
        data=[{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Key 1",
            "key_prefix": "sk_live_1234",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "request_count": 0
        }]
    )
    
    response = client.get("/api/v1/keys", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert len(response.json()["keys"]) == 1

def test_revoke_api_key(client, auth_headers, mock_supabase, mock_user_payload):
    """Test revoking an API key"""
    mock_supabase.auth.get_user.return_value = Mock(user=Mock(id=mock_user_payload["id"]))
    
    # Mock update response (returns data if successful)
    mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.is_.return_value.execute.return_value = Mock(
        data=[{"id": "some-id"}]
    )
    
    key_id = "550e8400-e29b-41d4-a716-446655440000"
    response = client.delete(f"/api/v1/keys/{key_id}", headers=auth_headers)
    
    assert response.status_code == 204

def test_authenticate_with_api_key(client, mock_supabase, mock_profile_data):
    """Test authentication using API key"""
    api_key = "sk_live_" + "0" * 32
    
    # Mock DB lookup for API key
    mock_key_data = {
        "id": "key-uuid",
        "user_id": "user-uuid",
        "expires_at": None,
        "request_count": 5,
        "profiles": mock_profile_data # Associated profile
    }
    
    # Mock chain: table('api_keys').select(...).eq(...).is_(...).single().execute()
    mock_select = Mock()
    mock_select.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = Mock(
        data=mock_key_data
    )
    
    # We need to ensure we return this mock when table('api_keys') is called on the service client
    # Since mock_supabase is both normal and service client, we just config the table return
    mock_supabase.table.side_effect = lambda table_name: mock_select if table_name == 'api_keys' else Mock()
    
    response = client.get("/api/v1/auth/profile", 
        headers={"Authorization": f"Bearer {api_key}"}
    )
    
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_authenticate_with_invalid_api_key(client, mock_supabase):
    """Test authentication with invalid API key"""
    api_key = "sk_live_" + "1" * 32
    
    # Mock lookup returning None
    mock_select = Mock()
    mock_select.select.return_value.eq.return_value.is_.return_value.single.return_value.execute.return_value = Mock(
        data=None
    )
    mock_supabase.table.return_value = mock_select
    
    response = client.get("/api/v1/auth/profile",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    
    assert response.status_code == 401
