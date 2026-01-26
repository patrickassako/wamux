"""
Tests for the main FastAPI application.
"""
import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> TestClient:
    """
    Create a test client for the FastAPI application.
    
    Returns:
        TestClient: FastAPI test client
    """
    return TestClient(app)


def test_health_endpoint(client: TestClient) -> None:
    """
    Test the /health endpoint returns 200 OK.
    
    Args:
        client: FastAPI test client fixture
    """
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "whatsapp-api-gateway"
    assert "version" in data


def test_root_endpoint(client: TestClient) -> None:
    """
    Test the root endpoint returns welcome message.
    
    Args:
        client: FastAPI test client fixture
    """
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "WhatsApp API Gateway"
