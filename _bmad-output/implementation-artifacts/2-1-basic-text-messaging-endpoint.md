# Story 2.1: Basic Text Messaging Endpoint

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to send a text message via a simple API call,
So that I can communicate with my customers programmatically.

## Acceptance Criteria

**Given** a valid authenticated session
**When** I POST to `/v1/messages` with `type: "text"`
**Then** the API should validate the payload (Pydantic)
**And** publish the command to Redis
**And** return a `202 Accepted` with a `message_id`
**And** the recipient should receive the message on WhatsApp

## Tasks / Subtasks

- [ ] Task 1: Create Messages Database Schema (AC: Table created with indexes)
  - [ ] Create `messages` table for message tracking
  - [ ] Add columns: id, user_id, session_id, to, type, content, status, sent_at, delivered_at, read_at
  - [ ] Add RLS policies: users can only view their own messages
  - [ ] Create indexes on session_id, status, created_at
  - [ ] Add message status enum: `pending`, `sent`, `delivered`, `read`, `failed`

- [ ] Task 2: Create Pydantic Models for Messages (AC: Type-safe models)
  - [ ] Create `apps/api/src/models/message.py`
  - [ ] Implement `SendTextRequest` model (to, message, session_id optional)
  - [ ] Implement `MessageResponse` model (id, status, sent_at, etc.)
  - [ ] Implement `MessageStatus` enum
  - [ ] Add phone number validation (WhatsApp format)
  - [ ] Use CamelCase for API JSON output

- [ ] Task 3: Implement POST /v1/messages Endpoint (AC: Messages can be sent)
  - [ ] Create `apps/api/src/api/v1/messages.py` router
  - [ ] Implement `POST /v1/messages` endpoint
  - [ ] Validate session belongs to user and is connected
  - [ ] Create message record in database with `pending` status
  - [ ] Publish `SEND_TEXT` command to Redis
  - [ ] Return 202 Accepted with message_id
  - [ ] Handle session not connected error (409 Conflict)

- [ ] Task 4: Implement SendTextHandler in Node.js (AC: Messages sent via Baileys)
  - [ ] Update `apps/engine/src/handlers/send-text-handler.ts`
  - [ ] Consume `SEND_TEXT` command from Redis
  - [ ] Get active Baileys socket for session
  - [ ] Format phone number to WhatsApp JID format
  - [ ] Send text message using `sock.sendMessage()`
  - [ ] Publish `MESSAGE_SENT` event on success
  - [ ] Publish `MESSAGE_FAILED` event on error

- [ ] Task 5: Implement Message Status Updates (AC: Status tracked in real-time)
  - [ ] Listen to Baileys `messages.upsert` event
  - [ ] Listen to Baileys `messages.update` event (delivery/read receipts)
  - [ ] Publish status update events to Redis
  - [ ] Create Python event consumer to update database
  - [ ] Update message status: pending → sent → delivered → read

- [ ] Task 6: Add Message History Endpoints (AC: Users can view sent messages)
  - [ ] Implement `GET /v1/messages` endpoint (list with pagination)
  - [ ] Implement `GET /v1/messages/{message_id}` endpoint (get single message)
  - [ ] Add filters: session_id, status, date_range
  - [ ] Add pagination: limit, offset
  - [ ] Return messages in descending order (newest first)

- [ ] Task 7: Add Rate Limiting Check (AC: Respects session limits)
  - [ ] Check user's subscription plan limits
  - [ ] Verify message quota not exceeded
  - [ ] Return 429 Too Many Requests if quota exceeded
  - [ ] Include quota info in response headers
  - [ ] Prepare for Story 4.2 (advanced rate limiting)

- [ ] Task 8: Add Comprehensive Tests (AC: All flows tested)
  - [ ] Write pytest tests for send message endpoint
  - [ ] Write pytest tests for message validation
  - [ ] Write pytest tests for session validation
  - [ ] Write vitest tests for SendTextHandler
  - [ ] Write integration test: API → Redis → Node → WhatsApp (mocked)
  - [ ] Test error scenarios (invalid phone, disconnected session)
  - [ ] Achieve >85% code coverage

## Dev Notes

### Architecture Compliance

**CRITICAL: Async Message Pattern**

Source: [epics.md#L198-L211](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L198-L211)

**Why 202 Accepted (not 200 OK):**
- Messages are processed asynchronously via Redis
- API doesn't wait for WhatsApp delivery
- Immediate response improves API performance
- Status updates come via webhooks (Epic 3)

**Message Flow:**
```
Client → POST /v1/messages
  ↓
Python API validates & stores (pending)
  ↓
Publish SEND_TEXT to Redis
  ↓
Return 202 Accepted + message_id
  ↓
Node.js consumes command
  ↓
Baileys sends to WhatsApp
  ↓
Publish MESSAGE_SENT event
  ↓
Python updates status (sent)
  ↓
Webhook notification (Epic 3)
```

**Phone Number Format:**
- Input: `+1234567890` or `1234567890`
- WhatsApp JID: `1234567890@s.whatsapp.net`
- Validation: Must be valid international format

### Technical Requirements

**Database Schema:**

```sql
-- messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'audio', 'video')),
  content JSONB NOT NULL, -- {message: "text"} or {url: "...", caption: "..."}
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT, -- ID from Baileys
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_session_id ON public.messages(session_id);
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Pydantic Models:**

```python
# apps/api/src/models/message.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID
from enum import Enum
import re

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"

class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

class SendTextRequest(BaseModel):
    """Request to send a text message"""
    model_config = ConfigDict(populate_by_name=True)
    
    to: str = Field(description="Phone number in international format")
    message: str = Field(min_length=1, max_length=4096, description="Message text")
    session_id: UUID | None = Field(None, description="Optional session ID (uses default if not provided)")
    
    @field_validator('to')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Remove common formatting
        phone = re.sub(r'[^\d+]', '', v)
        
        # Must start with + or be 10-15 digits
        if not (phone.startswith('+') or (len(phone) >= 10 and len(phone) <= 15)):
            raise ValueError('Invalid phone number format')
        
        return phone

class MessageResponse(BaseModel):
    """Message response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    id: UUID
    to_phone: str
    type: MessageType
    status: MessageStatus
    sent_at: datetime | None = None
    delivered_at: datetime | None = None
    read_at: datetime | None = None
    created_at: datetime

class MessageListResponse(BaseModel):
    """List of messages with pagination"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    messages: list[MessageResponse]
    total: int
    limit: int
    offset: int
```

**FastAPI Messages Endpoint:**

```python
# apps/api/src/api/v1/messages.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from uuid import UUID

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_client
from ...core.redis_client import get_redis
from ...core.stream_producer import StreamProducer
from ...models.message import (
    SendTextRequest,
    MessageResponse,
    MessageListResponse,
    MessageStatus
)

router = APIRouter(prefix="/v1/messages", tags=["Messages"])

@router.post("", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_text_message(
    request: SendTextRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    redis = Depends(get_redis)
):
    """
    Send a text message via WhatsApp.
    
    Returns 202 Accepted - message is processed asynchronously.
    """
    # Get user's default session if not specified
    session_id = request.session_id
    if not session_id:
        result = supabase.table('sessions')\
            .select('id')\
            .eq('user_id', current_user['id'])\
            .eq('status', 'connected')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No connected WhatsApp session found. Please connect a session first."
            )
        
        session_id = result.data[0]['id']
    
    # Verify session belongs to user and is connected
    session_result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_result.data['status'] != 'connected':
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session is not connected (status: {session_result.data['status']})"
        )
    
    # Create message record
    message_result = supabase.table('messages').insert({
        'user_id': current_user['id'],
        'session_id': str(session_id),
        'to_phone': request.to,
        'type': 'text',
        'content': {'message': request.message},
        'status': MessageStatus.PENDING
    }).execute()
    
    message_data = message_result.data[0]
    
    # Publish SEND_TEXT command to Redis
    producer = StreamProducer(redis)
    await producer.publish_command(
        "SEND_TEXT",
        {
            "message_id": message_data['id'],
            "session_id": str(session_id),
            "to": request.to,
            "message": request.message
        }
    )
    
    return MessageResponse(**message_data)

@router.get("", response_model=MessageListResponse)
async def list_messages(
    session_id: UUID | None = Query(None),
    status: MessageStatus | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """List messages with optional filters and pagination"""
    query = supabase.table('messages')\
        .select('*', count='exact')\
        .eq('user_id', current_user['id'])
    
    if session_id:
        query = query.eq('session_id', str(session_id))
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    return MessageListResponse(
        messages=[MessageResponse(**msg) for msg in result.data],
        total=result.count or 0,
        limit=limit,
        offset=offset
    )

@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get details of a specific message"""
    result = supabase.table('messages')\
        .select('*')\
        .eq('id', str(message_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    return MessageResponse(**result.data)
```

**Node.js SendTextHandler:**

```typescript
// apps/engine/src/handlers/send-text-handler.ts (updated)
import { CommandHandler } from './command-router';
import { SessionManager } from '../whatsapp/session-manager';
import { logger } from '../utils/logger';
import { Redis } from 'ioredis';

export class SendTextHandler implements CommandHandler {
  private sessionManager: SessionManager;
  private redis: Redis;

  constructor(sessionManager: SessionManager, redis: Redis) {
    this.sessionManager = sessionManager;
    this.redis = redis;
  }

  async handle(payload: any): Promise<void> {
    const { message_id, session_id, to, message } = payload;

    logger.info('Handling SEND_TEXT command', {
      messageId: message_id,
      sessionId: session_id,
      to
    });

    try {
      // Get active socket
      const sock = this.sessionManager.getSession(session_id);

      if (!sock) {
        throw new Error(`Session not found: ${session_id}`);
      }

      // Format phone to WhatsApp JID
      const jid = this.formatToJID(to);

      // Send message via Baileys
      const result = await sock.sendMessage(jid, {
        text: message
      });

      logger.info('Message sent successfully', {
        messageId: message_id,
        whatsappMessageId: result.key.id
      });

      // Publish MESSAGE_SENT event
      await this.publishEvent('MESSAGE_SENT', {
        message_id,
        session_id,
        whatsapp_message_id: result.key.id,
        sent_at: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Failed to send message', {
        messageId: message_id,
        error: error.message
      });

      // Publish MESSAGE_FAILED event
      await this.publishEvent('MESSAGE_FAILED', {
        message_id,
        session_id,
        error: error.message
      });
    }
  }

  private formatToJID(phone: string): string {
    // Remove all non-digits except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove leading +
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // Return WhatsApp JID format
    return `${cleaned}@s.whatsapp.net`;
  }

  private async publishEvent(eventType: string, payload: any): Promise<void> {
    const envelope = {
      id: crypto.randomUUID(),
      type: eventType,
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload
    };

    await this.redis.xadd(
      'whatsapp:events',
      'MAXLEN',
      '~',
      '10000',
      '*',
      'data',
      JSON.stringify(envelope)
    );
  }
}
```

### References

**Primary Documents:**
- [epics.md#L198-L211](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L198-L211) - Story 2.1 context
- [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117) - Redis Streams

**Functional Requirements:**
- FR11: Envoi Texte - [epics.md#L31](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L31)
- FR15: Ack Synchrone - [epics.md#L37](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L37)

**Dependencies:**
- Story 1.4: Redis Streams bridge
- Story 1.5: Active sessions required

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
