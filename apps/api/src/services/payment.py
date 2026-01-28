import httpx
import hashlib
from typing import Any
from ..core.config import settings
from ..models.payment import PaymentLinkRequest, PaymentLinkResponse
from ..utils.logger import logger

class PaymentService:
    """
    Service for interacting with the Flutterwave API.
    """
    BASE_URL = "https://api.flutterwave.com/v3"

    @classmethod
    async def create_payment_link(cls, request_data: PaymentLinkRequest) -> PaymentLinkResponse:
        """
        Create a Flutterwave Standard payment link.
        
        Args:
            request_data: The payment request details.
            
        Returns:
            PaymentLinkResponse: The created payment link and reference.
            
        Raises:
            ValueError: If configuration is missing.
            httpx.HTTPError: If the API request fails.
        """
        secret_key = settings.flutterwave_secret_key
        if not secret_key:
            logger.error("FLUTTERWAVE_SECRET_KEY is not configured")
            raise ValueError("Payment provider configuration missing (FLUTTERWAVE_SECRET_KEY)")

        url = f"{cls.BASE_URL}/payments"
        
        # Build Flutterwave payload
        payload = {
            "tx_ref": request_data.app_transaction_ref,
            "amount": str(request_data.transaction_amount),
            "currency": request_data.transaction_currency,
            "redirect_url": request_data.redirect_url or "https://wamux.com/payment/callback",
            "payment_options": request_data.payment_options,
            "customer": {
                "email": request_data.customer_email or "noreply@wamux.com",
                "phonenumber": request_data.customer_phone_number,
                "name": request_data.customer_name or "Customer"
            },
            "customizations": {
                "title": "WhatsApp API Subscription",
                "description": request_data.transaction_reason or "Subscription Payment",
                "logo": "https://wamux.com/logo.png"
            }
        }
        
        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Initiating Flutterwave payment. Ref: {request_data.app_transaction_ref}, Amount: {request_data.transaction_amount} {request_data.transaction_currency}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                
                logger.debug(f"Flutterwave Response [{response.status_code}]: {response.text}")
                
                response.raise_for_status()
                
                data = response.json()
                
                # Flutterwave Standard response structure:
                # {
                #   "status": "success",
                #   "message": "Hosted Link",
                #   "data": {
                #     "link": "https://checkout.flutterwave.com/..."
                #   }
                # }
                
                if data.get("status") == "success":
                    payment_link = data.get("data", {}).get("link")
                    return PaymentLinkResponse(
                        status="success",
                        payment_url=payment_link,
                        transaction_ref=request_data.app_transaction_ref
                    )
                else:
                    error_msg = data.get("message", "Unknown error")
                    return PaymentLinkResponse(
                        status="error",
                        payment_url=None,
                        transaction_ref=None,
                        custom_error=error_msg
                    )
                
            except httpx.HTTPStatusError as e:
                error_content = e.response.text
                logger.error(f"Flutterwave API Error: {error_content}")
                raise ValueError(f"Flutterwave API Error: {error_content}") from e
            except httpx.RequestError as e:
                logger.error(f"Flutterwave Network Error: {str(e)}")
                raise e
            except Exception as e:
                logger.error(f"Unexpected error in PaymentService: {str(e)}")
                raise e

    @classmethod
    def verify_webhook_signature(cls, payload: dict, signature: str) -> bool:
        """
        Verify the signature of a Flutterwave webhook.
        
        Flutterwave signs webhooks using SHA256 HMAC with the secret hash.
        
        Args:
            payload: The webhook payload (dict).
            signature: The verif-hash from headers.
            
        Returns:
            bool: True if signature matches, False otherwise.
        """
        secret_hash = settings.flutterwave_secret_key
        if not secret_hash:
            logger.error("FLUTTERWAVE_SECRET_KEY is not configured")
            return False
        
        # Flutterwave sends the hash in the header as 'verif-hash'
        # We verify by hashing the entire JSON body with our secret
        
        # Convert payload dict back to JSON string
        import json
        json_payload = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        
        # Calculate hash
        calculated_hash = hashlib.sha256(
            (secret_hash + json_payload).encode('utf-8')
        ).hexdigest()
        
        is_valid = calculated_hash == signature
        
        if not is_valid:
            logger.warning(f"Invalid Flutterwave webhook signature. Expected: {calculated_hash}, Got: {signature}")
        
        return is_valid
