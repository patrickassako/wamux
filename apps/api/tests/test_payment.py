import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from src.models.payment import PaymentLinkResponse

# Test Data
VALID_PAYMENT_REQUEST = {
    "transactionAmount": 1000,
    "transactionCurrency": "XAF",
    "transactionReason": "Test Payment",
    "appTransactionRef": "TX123456",
    "customerName": "John Doe",
    "customerPhoneNumber": "+237600000000",
    "customerEmail": "john@example.com",
    "customerLang": "fr"
}

def test_create_payment_link_endpoint_success(client):
    """Test POST /v1/payment/link success"""
    
    # Mock PaymentService.create_payment_link to avoid actual HTTP calls and logic
    with patch("src.services.payment.PaymentService.create_payment_link") as mock_service:
        mock_service.return_value = PaymentLinkResponse(
            status="success",
            payment_url="https://my-coolpay.com/pay/123",
            transaction_ref="CP_TX_123"
        )

        # Note: Sending camelCase to the endpoint because client (Frontend) sends camelCase
        response = client.post("/v1/payment/link", json=VALID_PAYMENT_REQUEST)
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify response is camelCase (due to alias_generator)
        assert data["paymentUrl"] == "https://my-coolpay.com/pay/123"
        assert data["transactionRef"] == "CP_TX_123"
        
        # Verify mocked service was called with correct data
        mock_service.assert_called_once()
        called_args = mock_service.call_args[1]['request_data']
        assert called_args.transaction_amount == 1000
        assert called_args.app_transaction_ref == "TX123456"

def test_create_payment_link_endpoint_missing_config(client):
    """Test 500 when configuration is missing"""
    
    # We allow the actual service method to run, but ensure settings return None
    # Wait, client fixture might load settings already. 
    # We need to patch 'src.services.payment.settings' specifically.
    
    with patch("src.services.payment.settings.coolpay_public_key", None):
        response = client.post("/v1/payment/link", json=VALID_PAYMENT_REQUEST)
        
        # The service checks for key and raises ValueError
        assert response.status_code == 500
        assert "configuration missing" in response.json()["detail"]

def test_webhook_endpoint(client):
    """Test Webhook endpoint accepts data"""
    payload = {
        "transaction_ref": "CP_TX_123",
        "status": "SUCCESS",
        "type": "payment.success"
    }
    # Send custom header to verify logging (handled by logger)
    headers = {"X-CoolPay-Signature": "sig123test"}
    
    response = client.post("/v1/payment/webhook", json=payload, headers=headers)
    
    assert response.status_code == 200
    assert response.json()["status"] == "received"
