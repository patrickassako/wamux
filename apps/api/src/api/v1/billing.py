"""
Billing API endpoints for subscription management
"""
import os
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client as get_supabase_client
from ...services.payment import PaymentService
from ...models.payment import PaymentLinkRequest
from ...models.billing import (
    SubscriptionResponse, CheckoutRequest, CheckoutResponse,
    PortalResponse, UsageResponse, PlanInfo, PlanType, PLAN_LIMITS
)

router = APIRouter(prefix="/billing", tags=["billing"])






class SubscribeRequest(BaseModel):
    """Request to change subscription plan"""
    plan: PlanType


@router.post("/subscribe", response_model=SubscriptionResponse, response_model_by_alias=True)
async def subscribe(
    request: SubscribeRequest,
    user=Depends(get_current_user)
):
    """Subscribe to a plan (handles activation and downgrades)"""
    try:
        supabase = get_supabase_client()
        
        if request.plan == PlanType.FREE:
            # Handle manual activation or downgrade to free
            free_config = PLAN_LIMITS[PlanType.FREE]
            
            # Get current subscription to check if we need to cancel Stripe
            sub_result = supabase.table("subscriptions")\
                .select("stripe_subscription_id")\
                .eq("user_id", str(user["id"]))\
                .limit(1)\
                .execute()
                
            if sub_result.data and sub_result.data[0].get("stripe_subscription_id"):
                # Handle cancellation if needed (NotchPay/CoolPay is usually prepaid one-off, so maybe just clear DB record)
                # For now just nullify the subscription ID in our DB
                pass
            
            # Free plan expires after 3 days (trial)
            expiry = (datetime.now() + timedelta(days=3)).isoformat()
            
            upsert_data = {
                "user_id": str(user["id"]),
                "plan": "free",
                "status": "active",
                "stripe_subscription_id": None,
                "message_limit": free_config["message_limit"],
                "rate_limit_per_minute": free_config["rate_limit_per_minute"],
                "current_period_end": expiry,
                "sessions_limit": free_config["sessions_limit"]
            }
            
            # Use upsert to handle both create and update
            updated_sub = supabase.table("subscriptions").upsert(upsert_data, on_conflict="user_id").execute()
            
            return SubscriptionResponse(**updated_sub.data[0])
        else:
            # For paid plans, redirect to checkout
            raise HTTPException(
                status_code=400, 
                detail="To upgrade to a paid plan, please use the /checkout endpoint"
            )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/verify-payment")
async def verify_payment(
    request: Request,
    user=Depends(get_current_user)
):
    """Verify Flutterwave payment and activate subscription"""
    import httpx
    from ...core.config import settings
    from ...utils.logger import logger
    
    try:
        body = await request.json()
        transaction_id = body.get("transaction_id")
        
        if not transaction_id:
            raise HTTPException(status_code=400, detail="Missing transaction_id")
        
        # Call Flutterwave API to verify transaction
        secret_key = settings.flutterwave_secret_key
        if not secret_key:
            raise HTTPException(status_code=500, detail="Payment configuration error")
        
        async with httpx.AsyncClient() as client:
            verify_url = f"https://api.flutterwave.com/v3/transactions/{transaction_id}/verify"
            headers = {"Authorization": f"Bearer {secret_key}"}
            
            response = await client.get(verify_url, headers=headers, timeout=10.0)
            
            if not response.is_success:
                logger.error(f"Flutterwave verification failed: {response.text}")
                raise HTTPException(status_code=400, detail="Payment verification failed")
            
            data = response.json()
            
            # Check if payment was successful
            if data.get("status") != "success":
                raise HTTPException(status_code=400, detail="Payment not successful")
            
            payment_data = data.get("data", {})
            
            if payment_data.get("status") != "successful":
                raise HTTPException(status_code=400, detail="Payment not completed")
            
            # Extract tx_ref to get plan info
            tx_ref = payment_data.get("tx_ref")
            if not tx_ref:
                raise HTTPException(status_code=400, detail="Invalid payment reference")
            
            # Parse tx_ref: sub_{user_id}_{plan}_{timestamp}
            parts = tx_ref.split("_")
            if len(parts) < 4 or parts[0] != "sub":
                raise HTTPException(status_code=400, detail="Invalid transaction reference")
            
            payment_user_id = parts[1]
            plan_str = parts[2]
            
            # Verify user owns this transaction
            if payment_user_id != str(user["id"]):
                raise HTTPException(status_code=403, detail="Unauthorized transaction")
            
            # Activate subscription
            try:
                plan = PlanType(plan_str)
                plan_config = PLAN_LIMITS[plan]
                
                supabase = get_supabase_client()
                
                result = supabase.table("subscriptions").upsert({
                    "user_id": str(user["id"]),
                    "plan": plan.value,
                    "status": "active",
                    "stripe_subscription_id": str(payment_data.get("id")),
                    "stripe_customer_id": payment_data.get("customer", {}).get("email"),
                    "message_limit": plan_config["message_limit"],
                    "rate_limit_per_minute": plan_config["rate_limit_per_minute"],
                    "sessions_limit": plan_config["sessions_limit"],
                    "current_period_start": datetime.now().isoformat(),
                    "current_period_end": (datetime.now() + timedelta(days=30)).isoformat()
                }, on_conflict="user_id").execute()
                
                logger.info(f"Subscription activated for user {user['id']} - Plan: {plan.value} via payment verification")
                
                return {
                    "success": True,
                    "message": "Subscription activated successfully",
                    "plan": plan.value,
                    "subscription": SubscriptionResponse(**result.data[0])
                }
                
            except ValueError as e:
                logger.error(f"Invalid plan in tx_ref: {plan_str}")
                raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_str}")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Payment verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/plans")
async def get_plans():
    """Get all available subscription plans"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("plans").select("*").execute()
        
        if result.data:
            plans = []
            for plan_data in result.data:
                plans.append({
                    "name": plan_data.get("name"),
                    "sessionsLimit": plan_data.get("sessions_limit"),
                    "messageLimit": plan_data.get("message_limit"),
                    "rateLimitPerMinute": plan_data.get("rate_limit_per_minute"),
                    "priceMonthly": plan_data.get("price_monthly"),
                    "priceYearly": plan_data.get("price_yearly"),
                    "features": plan_data.get("features", [])
                })
            return plans
    except Exception as e:
        print(f"Error fetching plans from DB: {e}")
        # Continue to fallback

    # Fallback to hardcoded constants
    plans = []
    for plan_type, config in PLAN_LIMITS.items():
        name = plan_type.value if hasattr(plan_type, "value") else plan_type
        plans.append({
            "name": name,
            "sessionsLimit": config["sessions_limit"],
            "messageLimit": config["message_limit"],
            "rateLimitPerMinute": config["rate_limit_per_minute"],
            "priceMonthly": config["price_monthly"],
            "priceYearly": config["price_yearly"],
            "features": config["features"]
        })
    return plans


@router.get("/subscription", response_model=Optional[SubscriptionResponse], response_model_by_alias=True)
async def get_subscription(user=Depends(get_current_user)):
    """Get current user's subscription"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", str(user["id"]))\
            .limit(1)\
            .execute()
        
        if not result.data:
            return None
        
        return SubscriptionResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscription: {str(e)}")


@router.get("/usage", response_model=Optional[UsageResponse], response_model_by_alias=True)
async def get_usage(user=Depends(get_current_user)):
    """Get current usage statistics"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("subscriptions")\
            .select("messages_used, message_limit")\
            .eq("user_id", str(user["id"]))\
            .limit(1)\
            .execute()
        
        if not result.data:
            return None
        
        sub = result.data[0]
        messages_used = sub.get("messages_used", 0)
        message_limit = sub.get("message_limit", 100)
        
        return UsageResponse(
            messages_used=messages_used,
            message_limit=message_limit,
            usage_percent=round((messages_used / message_limit) * 100, 1) if message_limit > 0 else 0,
            remaining=max(0, message_limit - messages_used)
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch usage: {str(e)}")


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    user=Depends(get_current_user)
):
    """Create a Flutterwave payment session for upgrading"""
    try:
        if request.plan == PlanType.FREE:
            raise HTTPException(status_code=400, detail="Cannot checkout for free plan. Use /subscribe endpoint.")
        
        # Get plan price
        plan_config = PLAN_LIMITS.get(request.plan)
        if not plan_config:
             raise HTTPException(status_code=400, detail=f"Plan config not found for {request.plan}")
             
        # Get price in XAF (prices in PLAN_LIMITS are assumed to be in EUR)
        # Convert EUR to XAF: 1 EUR ~= 656 XAF
        price_eur = plan_config["price_monthly"]
        amount_xaf = int(price_eur * 656)
        
        # Generate unique ref
        timestamp = int(datetime.now().timestamp())
        app_transaction_ref = f"sub_{user['id']}_{request.plan.value}_{timestamp}"
        
        customer_name = user.get("user_metadata", {}).get("full_name", user["email"].split("@")[0])
        customer_email = user["email"]
        customer_phone = user.get("user_metadata", {}).get("phone", "600000000")

        # Get frontend URL for redirect
        import os
        frontend_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
        redirect_url = f"{frontend_url}/dashboard/billing?payment=success"

        payment_request = PaymentLinkRequest(
            transaction_amount=amount_xaf,
            transaction_currency="XAF",
            transaction_reason=f"Subscription to {request.plan.value} Plan",
            app_transaction_ref=app_transaction_ref,
            customer_name=customer_name,
            customer_phone_number=customer_phone,
            customer_email=customer_email,
            payment_options="card,mobilemoney",
            redirect_url=redirect_url
        )
        
        response = await PaymentService.create_payment_link(payment_request)
        
        if response.status != "success":
             raise HTTPException(status_code=500, detail=f"Payment provider error: {response.custom_error or 'Unknown error'}")

        return CheckoutResponse(checkout_url=str(response.payment_url), session_id=response.transaction_ref or app_transaction_ref)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(user=Depends(get_current_user)):
    """Create a Stripe customer portal session for managing subscription"""
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("subscriptions")\
            .select("stripe_customer_id")\
            .eq("user_id", str(user["id"]))\
            .limit(1)\
            .execute()
        
        if not result.data or not result.data[0].get("stripe_customer_id"):
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        session = stripe.billing_portal.Session.create(
            customer=result.data[0]["stripe_customer_id"],
            return_url=f"{base_url}/dashboard/billing"
        )
        
        return PortalResponse(portal_url=session.url)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Portal failed: {str(e)}")


@router.post("/webhook")
async def webhook(request: Request):
    """Handle Flutterwave webhook events"""
    
    try:
        payload = await request.json()
        
        # Get Flutterwave signature from headers
        verif_hash = request.headers.get("verif-hash", "")
        
        # Verify signature
        if not PaymentService.verify_webhook_signature(payload, verif_hash):
            logger.warning("Invalid Flutterwave webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
            
        # Flutterwave webhook structure:
        # {
        #   "event": "charge.completed",
        #   "data": {
        #     "id": 12345,
        #     "tx_ref": "sub_...",
        #     "amount": 2624,
        #     "currency": "XAF",
        #     "status": "successful",
        #     ...
        #   }
        # }
        
        event = payload.get("event")
        data = payload.get("data", {})
        
        if event == "charge.completed" and data.get("status") == "successful":
            tx_ref = data.get("tx_ref")
            
            if tx_ref:
                # Parse tx_ref: sub_{user_id}_{plan}_{timestamp}
                parts = tx_ref.split("_")
                if len(parts) >= 4 and parts[0] == "sub":
                    user_id = parts[1]
                    plan_str = parts[2]
                    
                    try:
                        plan = PlanType(plan_str)
                        plan_config = PLAN_LIMITS[plan]
                        
                        supabase = get_supabase_client()
                        
                        # Activate subscription
                        supabase.table("subscriptions").upsert({
                            "user_id": user_id,
                            "plan": plan.value,
                            "status": "active",
                            "stripe_subscription_id": str(data.get("id")),  # Flutterwave transaction ID
                            "stripe_customer_id": data.get("customer", {}).get("email"),
                            "message_limit": plan_config["message_limit"],
                            "rate_limit_per_minute": plan_config["rate_limit_per_minute"],
                            "sessions_limit": plan_config["sessions_limit"],
                            "current_period_start": datetime.now().isoformat(),
                            "current_period_end": (datetime.now() + timedelta(days=30)).isoformat()
                        }, on_conflict="user_id").execute()
                        
                        logger.info(f"Subscription activated for user {user_id} - Plan: {plan.value}")
                        
                    except ValueError:
                        logger.error(f"Invalid plan in tx_ref: {plan_str}")
        
        return {"received": True}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
