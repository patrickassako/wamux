import httpx
from typing import Any
from ..core.config import settings
from ..models.payment import PaymentLinkRequest, PaymentLinkResponse
from ..utils.logger import logger

class PaymentService:
    """
    Service for interacting with the My-CoolPay API.
    """
    BASE_URL = "https://my-coolpay.com/api"

    @classmethod
    async def create_payment_link(cls, request_data: PaymentLinkRequest) -> PaymentLinkResponse:
        """
        Create a payment link.
        
        Args:
            request_data: The payment request details.
            
        Returns:
            PaymentLinkResponse: The created payment link and reference.
            
        Raises:
            ValueError: If configuration is missing.
            httpx.HTTPError: If the API request fails.
        """
        public_key = settings.coolpay_public_key
        if not public_key:
            logger.error("COOLPAY_PUBLIC_KEY is not configured")
            raise ValueError("Payment provider configuration missing (COOLPAY_PUBLIC_KEY)")

        # Construct URL: https://my-coolpay.com/api/{public_key}/paylink
        url = f"{cls.BASE_URL}/{public_key}/paylink"
        
        # Prepare payload (snake_case keys as expected by CoolPay)
        payload = request_data.model_dump(mode="json")
        
        logger.info(f"Initiating payment link creation. Ref: {request_data.app_transaction_ref}, Amount: {request_data.transaction_amount}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=30.0)
                
                # Log response for debugging (sensitive info should be redacted in production, 
                # but payment link creation usually just returns a URL)
                logger.debug(f"CoolPay Response [{response.status_code}]: {response.text}")
                
                response.raise_for_status()
                
                data = response.json()
                
                # Map keys safely. 
                # Note: Exact response keys from CoolPay regarding success are usually:
                # { "status": "success", "payment_url": "...", "transaction_ref": "..." }
                # If they differ, this might need adjustment after testing.
                
                return PaymentLinkResponse(
                    status=data.get("status", "unknown"),
                    payment_url=data.get("payment_url"),
                    transaction_ref=data.get("transaction_ref") 
                )
                
            except httpx.HTTPStatusError as e:
                logger.error(f"CoolPay API Error: {e.response.text}")
                # return an error response instead of crashing? 
                # Or let it propagate to be handled by exception handlers?
                # For now, let's propagate but with logging.
                raise e
            except httpx.RequestError as e:
                logger.error(f"CoolPay Network Error: {str(e)}")
                raise e
            except Exception as e:
                logger.error(f"Unexpected error in PaymentService: {str(e)}")
                raise e

    @classmethod
    def verify_webhook_signature(cls, payload: dict) -> bool:
        """
        Verify the signature of the My-CoolPay callback.
        
        Signature Formula: 
        md5(transaction_ref + transaction_type + transaction_amount + transaction_currency + transaction_operator + private_key)
        
        Args:
            payload: The dictionary containing the callback data.
            
        Returns:
            bool: True if signature matches, False otherwise.
        """
        import hashlib
        
        private_key = settings.coolpay_private_key
        if not private_key:
            logger.error("COOLPAY_PRIVATE_KEY is not configured")
            return False
            
        required_fields = [
            "transaction_ref", "transaction_type", "transaction_amount", 
            "transaction_currency", "transaction_operator", "signature"
        ]
        
        # Check presence of required fields
        if not all(k in payload for k in required_fields):
            logger.warning("Missing fields in webhook payload for signature verification")
            return False
            
        # Construct data string for hashing
        # Note: Integers should be stringified without leading zeros.
        # My-CoolPay documentation says "Numbers should be converted to strings WITHOUT non-significant zeros".
        # Python's str(int) does exactly that.
        
        data_string = (
            f"{payload.get('transaction_ref', '')}"
            f"{payload.get('transaction_type', '')}"
            f"{str(payload.get('transaction_amount', ''))}"
            f"{payload.get('transaction_currency', '')}"
            f"{payload.get('transaction_operator', '')}"
            f"{private_key}"
        )
        
        # Calculate MD5 hash
        calculated_signature = hashlib.md5(data_string.encode('utf-8')).hexdigest()
        
        # Compare (case-insensitive usually safe for hex, but docs imply lowercase often)
        # Provided signature in example is lowercase.
        received_signature = payload.get("signature", "").lower()
        
        is_valid = calculated_signature.lower() == received_signature
        
        if not is_valid:
            logger.warning(
                f"Invalid signature. Calc: {calculated_signature} vs Recv: {received_signature}. "
                f"Data: {data_string.replace(private_key, '***')}"
            )
            
        return is_valid
