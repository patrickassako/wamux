"""
WhatsApp API Gateway - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
import asyncio
from redis.asyncio import Redis

from src.core.config import settings
from src.api.v1.auth import router as auth_router
from src.api.v1.keys import router as keys_router
from src.api.v1.sessions import router as sessions_router
from src.api.v1.messages import router as messages_router
from src.api.v1.webhooks import router as webhooks_router
from src.api.v1.events import router as events_router
from src.api.v1.billing import router as billing_router
from src.api.v1.admin import router as admin_router
from src.api.v1.payment import router as payment_router
from src.services.webhook_dispatcher import WebhookDispatcher
# Global dispatcher instance
webhook_dispatcher = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events: startup and shutdown logic
    """
    global webhook_dispatcher
    print("[DEBUG] LIFESPAN STARTED")
    
    # Startup
    try:
        redis = Redis.from_url(settings.redis_url)
        webhook_dispatcher = WebhookDispatcher(
            redis=redis,
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_key
        )
        
        # Start dispatcher in background task
        loop = asyncio.get_event_loop()
        task = loop.create_task(webhook_dispatcher.start())
        
        def handle_dispatcher_result(t):
            try:
                t.result()
            except Exception as e:
                import logging
                logging.error(f"WebhookDispatcher task died with error: {e}")
                print(f"[CRITICAL] WebhookDispatcher task died: {e}")
        
        task.add_done_callback(handle_dispatcher_result)
        print("[DEBUG] WebhookDispatcher task scheduled")
        
    except Exception as e:
        print(f"[CRITICAL] Failed to start WebhookDispatcher: {e}")

    yield
    
    # Shutdown
    if webhook_dispatcher:
        await webhook_dispatcher.stop()
    await redis.close()

# Initialize FastAPI app
app = FastAPI(
    title=settings.project_name,
    description="WhatsApp API Gateway",
    version=settings.version,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Use parsed list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(keys_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns:
        dict: Status information
    """
    return {
        "status": "healthy",
        "service": "whatsapp-api-gateway",
        "version": "0.1.0",
    }


@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint with API information.
    
    Returns:
        dict: Welcome message and documentation links
    """
    return {
        "message": "WhatsApp API Gateway",
        "docs": "/docs" if settings.debug else "Documentation disabled in production",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
