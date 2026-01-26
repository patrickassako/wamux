# Epic 3: Webhooks & Events System - Stories Summary

**Status:** All 6 stories marked as ready-for-dev ✅

---

## Story 3.1: Webhook Dispatcher Service (Backend)

**Key Points:**
- Centralized service to dispatch events to client URLs
- Retry logic with exponential backoff (3 attempts)
- HMAC-SHA256 signature for security
- Event filtering based on user preferences
- Dead-letter queue for failed webhooks

**Tasks:** 7 tasks including dispatcher service, retry logic, HMAC signing, event filtering, monitoring

**Tech Stack:** Python FastAPI, Redis for queue, Supabase for webhook config

---

## Story 3.2: Granular Event Catalog

**Key Points:**
- 20+ event types mapped from Baileys
- Categories: Messages, Sessions, Chats, Groups, Contacts
- Standard event format with consistent payload structure

**Event Types:**
- **Messages:** message.sent, messages.received, messages.update, messages.delete, messages.reaction
- **Sessions:** session.status, qrcode.updated
- **Chats:** chats.upsert, chats.update, chats.delete
- **Groups:** groups.upsert, groups.update, group-participants.update
- **Other:** contacts.upsert, poll.results, call

**Tasks:** 6 tasks including event catalog definition, Baileys mapping, payload standardization

---

## Story 3.3: Webhook Configuration UI

**Key Points:**
- Dashboard page for webhook settings
- Webhook URL input with validation
- Checklist of 20+ events to subscribe
- Default: messages.received checked
- Save preferences to database

**Tasks:** 8 tasks including UI components, event checklist, URL validation, preferences storage

**Tech Stack:** React/Next.js frontend, API endpoints for CRUD

---

## Story 3.4: Inbound Message Handling & Formatting

**Key Points:**
- Listen to Baileys messages.upsert event
- Format incoming messages to clean JSON
- Support text, image, audio, video, location, contact
- Filter out status broadcasts (unless subscribed)
- Publish to webhook dispatcher

**Message Format:**
```json
{
  "from": "1234567890@s.whatsapp.net",
  "body": "Message text",
  "type": "text",
  "timestamp": 1234567890,
  "messageId": "...",
  "media": { "url": "...", "mimeType": "..." }
}
```

**Tasks:** 7 tasks including event listener, message formatting, media handling, filtering

---

## Story 3.5: Webhook Security & Testing UI

**Key Points:**
- HMAC-SHA256 signature in X-Hub-Signature header
- Signature = HMAC(body, api_secret)
- Test webhook button in dashboard
- Send ping event to verify endpoint
- Display response status (200 OK or error)

**Security Flow:**
```
1. Generate signature: HMAC-SHA256(payload, secret)
2. Add header: X-Hub-Signature: sha256=<signature>
3. Client validates signature before processing
```

**Tasks:** 6 tasks including HMAC implementation, test UI, signature validation docs

---

## Story 3.6: Advanced Session Behavior Settings

**Key Points:**
- Always Online: Periodic presence.update('available')
- Read Messages: Auto-mark incoming as read
- Reject Calls: Auto-reject incoming calls
- Per-session configuration
- Stored in session metadata JSONB

**Settings:**
- `always_online`: boolean
- `auto_read_messages`: boolean
- `reject_calls`: boolean
- `typing_simulation`: boolean (for Story 4.2)

**Tasks:** 7 tasks including settings UI, presence updates, auto-read logic, call rejection

---

## Implementation Notes

**Epic 3 Dependencies:**
- Requires Epic 1 (Sessions, Redis Streams)
- Requires Epic 2 (Message handling)
- Prepares for Epic 4 (Rate limiting uses webhook events)

**Database Schema:**
```sql
-- webhook_configs table
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  webhook_url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For HMAC signing
  enabled BOOLEAN DEFAULT true,
  subscribed_events JSONB DEFAULT '[]', -- Array of event types
  retry_config JSONB DEFAULT '{"max_attempts": 3, "backoff_ms": 1000}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- webhook_deliveries table (for monitoring)
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID REFERENCES public.webhook_configs(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INT,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Python Webhook Dispatcher:**
```python
# apps/api/src/services/webhook_dispatcher.py
import hmac
import hashlib
import httpx
from typing import Dict, Any

class WebhookDispatcher:
    async def dispatch(
        self,
        webhook_url: str,
        secret: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> bool:
        # Generate HMAC signature
        body = json.dumps(payload)
        signature = hmac.new(
            secret.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Send webhook
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers={
                    'X-Hub-Signature': f'sha256={signature}',
                    'X-Event-Type': event_type,
                    'Content-Type': 'application/json'
                },
                timeout=10.0
            )
            
        return response.status_code == 200
```

**Node.js Event Publisher:**
```typescript
// apps/engine/src/events/publisher.ts
export class EventPublisher {
  async publishInboundMessage(message: any): Promise<void> {
    const event = {
      type: 'messages.received',
      payload: {
        from: message.key.remoteJid,
        body: message.message?.conversation || '',
        type: this.detectMessageType(message),
        timestamp: message.messageTimestamp,
        messageId: message.key.id
      }
    };
    
    await this.redis.xadd(
      'whatsapp:events',
      'MAXLEN', '~', '10000',
      '*',
      'data', JSON.stringify(event)
    );
  }
}
```

---

## Functional Requirements Coverage

- ✅ FR3: Configuration Webhook URL (Story 3.3)
- ✅ FR16: Event message.received (Story 3.4)
- ✅ FR17: Event session.status (Story 3.2)
- ✅ FR19: Signature HMAC (Story 3.5)
- ✅ FR25: Test Webhook Trigger UI (Story 3.5)

---

## Testing Strategy

**Integration Tests:**
1. End-to-end webhook flow (Baileys → Redis → Dispatcher → Client)
2. HMAC signature validation
3. Retry logic with failures
4. Event filtering (only subscribed events sent)
5. Dead-letter queue handling

**Performance Tests:**
- 1000 events/second throughput
- Webhook latency < 1s (NFR3)
- Retry backoff timing accuracy

---

## References

- [epics.md#L270-L363](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L270-L363) - Epic 3 complete context
- [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117) - Redis Streams for events
- NFR3: Webhook Latency < 1s - [epics.md#L62](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L62)

---

**Epic 3 Status:** ✅ All 6 stories ready-for-dev
**Total Tasks:** 41 tasks across 6 stories
**Next Epic:** Epic 4 - Billing, Safety & Monetization (4 stories)
