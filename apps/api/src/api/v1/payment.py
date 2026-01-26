from fastapi import APIRouter, Request, status, HTTPException, Body
from ...utils.logger import logger
from ...models.payment import PaymentLinkRequest, PaymentLinkResponse
from ...services.payment import PaymentService

router = APIRouter(tags=["Payment"]) # Prefix is handled in main.py

@router.post("/link", response_model=PaymentLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_link(request: PaymentLinkRequest):
    """
    Create a payment link for My-CoolPay.
    """
    try:
        response = await PaymentService.create_payment_link(request_data=request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create payment link: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment link")

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def payment_webhook(request: Request):
    """
    Handle payment provider webhooks (My-CoolPay).
    
    This endpoint receives raw event data, logs headers (for debugging signature), and returns OK.
    """
    try:
        # Log headers to identify signature header
        headers = dict(request.headers)
        logger.info(f"Webhook Headers: {headers}")
        
        payload = await request.json()
        
        # Log the incoming event details
        logger.info(f"Payment Webhook Payload: {payload}")
        
        # CoolPay usually sends transaction_ref, status, etc.
        # Example payload handling (to be refined based on actual data):
        transaction_ref = payload.get("transaction_ref")
        status_update = payload.get("status")
        
        if transaction_ref:
            logger.info(f"Update for Transaction {transaction_ref}: {status_update}")
            
        # TODO: Add logic to update database record based on 'transaction_ref'
        
        # TODO: Add signature verification once header name is confirmed (likely X-Signature or similar)
        
        return {"status": "received"}

    except Exception as e:
        logger.error(f"Error processing payment webhook: {str(e)}")
        # Return 200 to prevent retry loop for bad logic, unless it's a transient error
        return {"status": "error", "message": "Failed to process webhook"}
