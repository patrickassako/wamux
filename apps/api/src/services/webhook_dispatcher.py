"""
Webhook Dispatcher Service

Consumes events from Redis stream and dispatches to user webhook URLs
with HMAC-SHA256 signatures.
"""
import hmac
import hashlib
import json
import asyncio
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class WebhookDispatcher:
    """
    Service that consumes events from Redis and dispatches to webhook URLs.
    """
    
    def __init__(self, redis, supabase_url: str, supabase_key: str):
        self.redis = redis
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.running = False
        self.consumer_group = "webhook-dispatcher"
        self.consumer_name = "dispatcher-1"
        self.stream_key = "whatsapp:events"
        self.http_client: Optional[httpx.AsyncClient] = None
        
        # Retry configuration
        self.max_retries = 3
        self.retry_delays = [1, 5, 30]  # seconds
    
    async def start(self):
        """Start the webhook dispatcher"""
        self.running = True
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # Create consumer group if not exists
        try:
            await self.redis.xgroup_create(
                self.stream_key,
                self.consumer_group,
                id='0',
                mkstream=True
            )
            logger.info(f"Created consumer group: {self.consumer_group}")
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                logger.warning(f"Consumer group may already exist: {e}")
        
        logger.info("Webhook dispatcher started")
        await self._consume_events()
    
    async def stop(self):
        """Stop the webhook dispatcher"""
        self.running = False
        if self.http_client:
            await self.http_client.aclose()
        logger.info("Webhook dispatcher stopped")
    
    async def _consume_events(self):
        """Consume events from Redis stream"""
        while self.running:
            try:
                # Read from stream
                messages = await self.redis.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {self.stream_key: '>'},
                    count=10,
                    block=1000
                )
                
                if not messages:
                    continue
                
                for stream_name, stream_messages in messages:
                    for msg_id, msg_data in stream_messages:
                        await self._process_event(msg_id, msg_data)
                        
                        # Acknowledge message
                        await self.redis.xack(
                            self.stream_key,
                            self.consumer_group,
                            msg_id
                        )
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error consuming events: {e}")
                await asyncio.sleep(1)
    
    async def _process_event(self, msg_id: str, msg_data: dict):
        """Process a single event and dispatch to webhooks"""
        try:
            print(f"[DEBUG] Processing event {msg_id}")
            # Parse event data
            raw_data = msg_data.get(b'data') or msg_data.get('data')
            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode('utf-8')
            
            event = json.loads(raw_data)
            event_type = event.get('type', '')
            payload = event.get('payload', {})
            session_id = payload.get('session_id')
            
            print(f"[DEBUG] Event type: {event_type}, Session: {session_id}")
            
            if not session_id:
                logger.debug(f"No session_id in event: {event_type}")
                return
            
            # Use event type directly as it comes from Engine in correct format
            webhook_event_type = event_type
            
            if not webhook_event_type:
                logger.debug("Event type missing in payload")
                return
            
            # Find matching webhooks
            webhooks = await self._find_webhooks(session_id, webhook_event_type)
            print(f"[DEBUG] Found {len(webhooks)} webhooks for {event_type}")
            
            # Dispatch to each webhook
            for webhook in webhooks:
                print(f"[DEBUG] Dispatching to {webhook['url']}")
                await self._dispatch_webhook(webhook, webhook_event_type, event)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse event: {e}")
            print(f"[ERROR] Failed to parse event: {e}")
        except Exception as e:
            logger.error(f"Error processing event {msg_id}: {e}")
            print(f"[ERROR] Error processing event {msg_id}: {e}")
    
    async def _find_webhooks(self, session_id: str, event_type: str) -> list:
        """Find webhooks that match the session and event type"""
        try:
            # Get session to find user_id
            session_result = self.supabase.table('sessions')\
                .select('user_id')\
                .eq('id', session_id)\
                .single()\
                .execute()
            
            if not session_result.data:
                return []
            
            user_id = session_result.data['user_id']
            
            # Find enabled webhooks for this user that:
            # 1. Have no session filter OR match this session
            # 2. Include this event type
            webhooks_result = self.supabase.table('webhooks')\
                .select('*')\
                .eq('user_id', user_id)\
                .eq('enabled', True)\
                .contains('events', [event_type])\
                .execute()
            
            # Filter by session_id if specified
            webhooks = []
            for w in webhooks_result.data:
                if w['session_id'] is None or w['session_id'] == session_id:
                    webhooks.append(w)
            
            return webhooks
            
        except Exception as e:
            logger.error(f"Error finding webhooks: {e}")
            return []
    
    async def _dispatch_webhook(self, webhook: dict, event_type: str, event: dict):
        """Dispatch event to a webhook URL with signature"""
        webhook_id = webhook['id']
        url = webhook['url']
        secret = webhook['secret']
        
        # Build payload
        timestamp = int(datetime.now(timezone.utc).timestamp())
        payload = {
            "id": f"evt_{event.get('id', 'unknown')}",
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": event.get('payload', {})
        }
        
        payload_json = json.dumps(payload, separators=(',', ':'))
        
        # Create HMAC signature
        signature_payload = f"{timestamp}.{payload_json}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signature_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": f"sha256={signature}",
            "X-Webhook-Timestamp": str(timestamp),
            "User-Agent": "WhatsAppAPI-Webhook/1.0"
        }
        
        # Dispatch with retry
        for attempt in range(self.max_retries):
            try:
                response = await self.http_client.post(
                    url,
                    content=payload_json,
                    headers=headers
                )
                
                if response.status_code >= 200 and response.status_code < 300:
                    logger.info(f"Webhook {webhook_id} delivered: {event_type}")
                    
                    # Update last_triggered_at and reset failure_count
                    self.supabase.table('webhooks')\
                        .update({
                            'last_triggered_at': datetime.now(timezone.utc).isoformat(),
                            'failure_count': 0
                        })\
                        .eq('id', webhook_id)\
                        .execute()
                    
                    return
                else:
                    logger.warning(f"Webhook {webhook_id} returned {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Webhook {webhook_id} attempt {attempt + 1} failed: {e}")
            
            # Wait before retry
            if attempt < self.max_retries - 1:
                await asyncio.sleep(self.retry_delays[attempt])
        
        # All retries failed
        logger.error(f"Webhook {webhook_id} failed after {self.max_retries} attempts")
        
        # Increment failure count
        self.supabase.table('webhooks')\
            .update({
                'failure_count': webhook['failure_count'] + 1
            })\
            .eq('id', webhook_id)\
            .execute()


def compute_signature(secret: str, timestamp: int, payload: str) -> str:
    """
    Compute HMAC-SHA256 signature for webhook verification.
    
    Usage in webhook receiver:
    ```python
    expected_sig = compute_signature(secret, timestamp, request.body)
    if expected_sig != received_signature:
        raise InvalidSignature()
    ```
    """
    signature_payload = f"{timestamp}.{payload}"
    return hmac.new(
        secret.encode('utf-8'),
        signature_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
