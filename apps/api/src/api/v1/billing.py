"""
Billing API endpoints for subscription management
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Optional

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


@router.get("/plans", response_model=list[PlanInfo])
async def get_plans():
    """Get all available subscription plans"""
    plans = []
    for plan_type, config in PLAN_LIMITS.items():
        plans.append(PlanInfo(
            name=plan_type,
            sessions_limit=config["sessions_limit"],
            message_limit=config["message_limit"],
            rate_limit_per_minute=config["rate_limit_per_minute"],
            price_monthly=config["price_monthly"],
            price_yearly=config["price_yearly"],
            features=config["features"]
        ))
    return plans


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user=Depends(get_current_user)):
    """Get current user's subscription"""
    supabase = get_supabase_client()
    
    result = supabase.table("subscriptions")\
        .select("*")\
        .eq("user_id", str(user.id))\
        .limit(1)\
        .execute()
    
    if not result.data:
        # Create default free subscription if none exists
        default_sub = {
            "user_id": str(user.id),
            "plan": "free",
            "status": "active",
            "message_limit": 100,
            "messages_used": 0,
            "rate_limit_per_minute": 10
        }
        insert_result = supabase.table("subscriptions").insert(default_sub).execute()
        return SubscriptionResponse(**insert_result.data[0])
    
    return SubscriptionResponse(**result.data[0])


@router.get("/usage", response_model=UsageResponse)
async def get_usage(user=Depends(get_current_user)):
    """Get current usage statistics"""
    supabase = get_supabase_client()
    
    result = supabase.table("subscriptions")\
        .select("messages_used, message_limit")\
        .eq("user_id", str(user.id))\
        .limit(1)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    sub = result.data[0]
    messages_used = sub["messages_used"]
    message_limit = sub["message_limit"]
    
    return UsageResponse(
        messages_used=messages_used,
        message_limit=message_limit,
        usage_percent=round((messages_used / message_limit) * 100, 1) if message_limit > 0 else 0,
        remaining=max(0, message_limit - messages_used)
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    user=Depends(get_current_user)
):
    """Create a Stripe checkout session for upgrading"""
    if request.plan == PlanType.FREE:
        raise HTTPException(status_code=400, detail="Cannot checkout for free plan")
    
    price_id = STRIPE_PRICE_IDS.get(request.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Price not configured for {request.plan}")
    
    supabase = get_supabase_client()
    
    # Get or create Stripe customer
    sub_result = supabase.table("subscriptions")\
        .select("stripe_customer_id")\
        .eq("user_id", str(user.id))\
        .limit(1)\
        .execute()
    
    stripe_customer_id = sub_result.data[0].get("stripe_customer_id") if sub_result.data else None
    
    if not stripe_customer_id:
        # Create new Stripe customer
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)}
        )
        stripe_customer_id = customer.id
        
        # Save customer ID
        supabase.table("subscriptions")\
            .update({"stripe_customer_id": stripe_customer_id})\
            .eq("user_id", str(user.id))\
            .execute()
    
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
            "user_id": str(user.id),
            "plan": request.plan.value
        }
    )
    
    return CheckoutResponse(checkout_url=session.url, session_id=session.id)


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(user=Depends(get_current_user)):
    """Create a Stripe customer portal session for managing subscription"""
    supabase = get_supabase_client()
    
    result = supabase.table("subscriptions")\
        .select("stripe_customer_id")\
        .eq("user_id", str(user.id))\
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
            "rate_limit_per_minute": plan_config["rate_limit_per_minute"]
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
            "current_period_start": subscription["current_period_start"],
            "current_period_end": subscription["current_period_end"]
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
            "rate_limit_per_minute": free_config["rate_limit_per_minute"]
        }).eq("stripe_subscription_id", stripe_sub_id).execute()
    
    return {"received": True}
