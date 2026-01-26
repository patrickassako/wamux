"""
Billing API endpoints for subscription management
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_service_client as get_supabase_client
from ...models.billing import (
    SubscriptionResponse, CheckoutRequest, CheckoutResponse,
    PortalResponse, UsageResponse, PlanInfo, PlanType, PLAN_LIMITS
)

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Stripe Price IDs (set in environment)
STRIPE_PRICE_IDS = {
    PlanType.BASIC: os.getenv("STRIPE_PRICE_BASIC"),
    PlanType.PRO: os.getenv("STRIPE_PRICE_PRO"),
    PlanType.PLUS: os.getenv("STRIPE_PRICE_PLUS"),
    PlanType.BUSINESS: os.getenv("STRIPE_PRICE_BUSINESS"),
}



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
                # Cancel Stripe subscription
                stripe_sub_id = sub_result.data[0]["stripe_subscription_id"]
                try:
                    stripe.Subscription.delete(stripe_sub_id)
                except Exception as e:
                    print(f"Error canceling stripe subscription: {e}")
            
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
    """Create a Stripe checkout session for upgrading"""
    try:
        if request.plan == PlanType.FREE:
            raise HTTPException(status_code=400, detail="Cannot checkout for free plan. Use /subscribe endpoint.")
        
        price_id = STRIPE_PRICE_IDS.get(request.plan)
        if not price_id:
            raise HTTPException(status_code=400, detail=f"Price not configured for {request.plan}")
        
        supabase = get_supabase_client()
        
        # Get or create Stripe customer
        sub_result = supabase.table("subscriptions")\
            .select("stripe_customer_id")\
            .eq("user_id", str(user["id"]))\
            .limit(1)\
            .execute()
        
        stripe_customer_id = sub_result.data[0].get("stripe_customer_id") if sub_result.data else None
        
        if not stripe_customer_id:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=user["email"],
                metadata={"user_id": str(user["id"])}
            )
            stripe_customer_id = customer.id
            
            # Save customer ID using upsert to ensure row exists
            supabase.table("subscriptions").upsert({
                "user_id": str(user["id"]),
                "stripe_customer_id": stripe_customer_id,
                # Set minimal required fields if creating new
                "plan": "free",
                "status": "active",
                "message_limit": 100,
                "messages_used": 0,
                "rate_limit_per_minute": 10,
                "sessions_limit": 1
            }, on_conflict="user_id").execute()
        
        # Create checkout session
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            mode="subscription",
            success_url=request.success_url or f"{base_url}/dashboard/billing?success=true",
            cancel_url=request.cancel_url or f"{base_url}/dashboard/billing?canceled=true",
            metadata={
                "user_id": str(user["id"]),
                "plan": request.plan.value
            }
        )
        
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
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
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    supabase = get_supabase_client()
    
    try:
        # Handle checkout completion
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session["metadata"]["user_id"]
            plan = session["metadata"]["plan"]
            subscription_id = session["subscription"]
            customer_id = session["customer"]
            
            # Get plan limits
            plan_config = PLAN_LIMITS[PlanType(plan)]
            
            # Update subscription
            supabase.table("subscriptions").update({
                "plan": plan,
                "status": "active",
                "stripe_subscription_id": subscription_id,
                "stripe_customer_id": customer_id,
                "message_limit": plan_config["message_limit"],
                "rate_limit_per_minute": plan_config["rate_limit_per_minute"],
                "sessions_limit": plan_config["sessions_limit"],
                "current_period_start": datetime.now().isoformat(), # approximate
                "current_period_end": (datetime.now().replace(month=datetime.now().month+1)).isoformat() # approximate
            }).eq("user_id", user_id).execute()
        
        # Handle subscription updates
        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            stripe_sub_id = subscription["id"]
            status = subscription["status"]
            
            # Map Stripe status to our status
            status_map = {
                "active": "active",
                "past_due": "past_due",
                "canceled": "canceled",
                "trialing": "trialing"
            }
            
            supabase.table("subscriptions").update({
                "status": status_map.get(status, "active"),
                "current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
                "current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat()
            }).eq("stripe_subscription_id", stripe_sub_id).execute()
        
        # Handle subscription deletion
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            stripe_sub_id = subscription["id"]
            
            # Downgrade to free plan
            free_config = PLAN_LIMITS[PlanType.FREE]
            supabase.table("subscriptions").update({
                "plan": "free",
                "status": "active",
                "stripe_subscription_id": None,
                "message_limit": free_config["message_limit"],
                "rate_limit_per_minute": free_config["rate_limit_per_minute"],
                "sessions_limit": free_config["sessions_limit"]
            }).eq("stripe_subscription_id", stripe_sub_id).execute()
        
        return {"received": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")
