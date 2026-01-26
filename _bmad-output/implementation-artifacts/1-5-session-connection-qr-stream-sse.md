# Story 1.5: Session Connection & QR Stream (SSE)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a real-time QR code via a standard HTTP stream,
So that I can link my WhatsApp device without complex WebSocket logic.

## Acceptance Criteria

**Given** a comprehensive API Client
**When** I POST to `/v1/sessions`
**Then** the API returns a `session_id` and a `stream_url`
**When** I connect to the `stream_url` (SSE)
**Then** I should receive `qr` events containing Key-Value JSON with Base64 image data
**And** the connection should automatically close upon `connected` event

## Tasks / Subtasks

- [ ] Task 1: Design Session State Machine (AC: States and transitions defined)
  - [ ] Define session states: `initializing`, `qr_ready`, `connecting`, `connected`, `disconnected`, `failed`
  - [ ] Define state transitions and triggers
  - [ ] Document session lifecycle in architecture
  - [ ] Create state machine diagram
  - [ ] Define timeout rules (QR expires after 60s, max 3 retries)

- [ ] Task 2: Create Sessions Database Schema (AC: Table and indexes created)
  - [ ] Create `sessions` table with state tracking
  - [ ] Add columns: id, user_id, status, qr_code, connected_at, disconnected_at, metadata
  - [ ] Add RLS policies: users can only manage their own sessions
  - [ ] Create indexes on user_id and status
  - [ ] Add constraint: max 5 active sessions per user

- [ ] Task 3: Implement Session Initialization Endpoint (AC: POST /v1/sessions works)
  - [ ] Create `apps/api/src/api/v1/sessions.py` router
  - [ ] Implement `POST /v1/sessions` endpoint
  - [ ] Create Pydantic models: `CreateSessionRequest`, `SessionResponse`
  - [ ] Generate unique session_id
  - [ ] Publish `INIT_SESSION` command to Redis
  - [ ] Return session_id and stream_url

- [ ] Task 4: Implement Server-Sent Events (SSE) Endpoint (AC: SSE stream works)
  - [ ] Implement `GET /v1/sessions/{session_id}/stream` endpoint
  - [ ] Use FastAPI StreamingResponse for SSE
  - [ ] Subscribe to Redis events stream for this session
  - [ ] Format events as SSE: `event: qr\ndata: {...}\n\n`
  - [ ] Handle client disconnection gracefully
  - [ ] Auto-close stream on `connected` event

- [ ] Task 5: Implement Baileys QR Code Generation (AC: QR codes generated)
  - [ ] Create `apps/engine/src/whatsapp/session-manager.ts`
  - [ ] Implement `InitSessionHandler` (consume INIT_SESSION command)
  - [ ] Initialize Baileys socket with `makeWASocket`
  - [ ] Use `useMultiFileAuthState` for session persistence
  - [ ] Listen to `connection.update` event for QR codes
  - [ ] Convert QR to Base64 image data

- [ ] Task 6: Publish QR Events to Redis (AC: Events reach Python API)
  - [ ] Create event publisher in Node.js
  - [ ] Publish `QR_CODE_UPDATED` event to `whatsapp:events` stream
  - [ ] Include session_id, qr_data (Base64), timestamp
  - [ ] Publish `SESSION_CONNECTED` event on successful pairing
  - [ ] Publish `SESSION_FAILED` event on errors
  - [ ] Use same envelope structure as commands

- [ ] Task 7: Implement Session Status Tracking (AC: Status updates in real-time)
  - [ ] Update session status in database on each event
  - [ ] Track QR generation count (for retry logic)
  - [ ] Record connected_at timestamp
  - [ ] Store WhatsApp phone number after connection
  - [ ] Implement session timeout (auto-cleanup after 5 minutes if not connected)

- [ ] Task 8: Add Session Management Endpoints (AC: Users can list/delete sessions)
  - [ ] Implement `GET /v1/sessions` endpoint (list user's sessions)
  - [ ] Implement `GET /v1/sessions/{session_id}` endpoint (get session details)
  - [ ] Implement `DELETE /v1/sessions/{session_id}` endpoint (disconnect session)
  - [ ] Publish `LOGOUT` command to Redis on delete
  - [ ] Update session status to `disconnected`

- [ ] Task 9: Add Comprehensive Tests (AC: All flows tested)
  - [ ] Write pytest tests for session creation
  - [ ] Write pytest tests for SSE stream (mock Redis events)
  - [ ] Write vitest tests for Baileys QR generation (mock makeWASocket)
  - [ ] Write integration test: full QR flow (Python → Redis → Node → Redis → Python)
  - [ ] Test timeout scenarios (QR expires, connection fails)
  - [ ] Achieve >80% code coverage

## Dev Notes

### Architecture Compliance

**CRITICAL: Server-Sent Events (SSE) over WebSockets**

Source: [epics.md#L165-L178](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L165-L178)

**Why SSE:**
- ✅ **Simpler than WebSockets**: Standard HTTP, no protocol upgrade
- ✅ **Auto-reconnect**: Built-in browser support
- ✅ **One-way communication**: Perfect for QR streaming (server → client)
- ✅ **Works through proxies**: No special infrastructure needed
- ✅ **EventSource API**: Native browser support

**Session State Machine:**
```
initializing → qr_ready → connecting → connected
     ↓             ↓           ↓
   failed      failed      disconnected
```

**Baileys Integration:**
Source: [project-context.md#L53-L56](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L53-L56)

**Critical Rules:**
- MUST use `useMultiFileAuthState` (never in-memory only)
- MUST set `printQRInTerminal: false` in production
- MUST handle `connection.update` event for QR codes
- MUST detect `DisconnectReason.loggedOut` for cleanup

### Technical Requirements

**Database Schema:**

```sql
-- sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL UNIQUE, -- User-friendly key (e.g., "user123_session1")
  status TEXT NOT NULL CHECK (status IN ('initializing', 'qr_ready', 'connecting', 'connected', 'disconnected', 'failed')),
  qr_code TEXT, -- Base64 QR code image (temporary, cleared after connection)
  qr_generation_count INT DEFAULT 0,
  phone_number TEXT, -- WhatsApp phone number (after connection)
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_session_key CHECK (char_length(session_key) <= 100)
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_session_key ON public.sessions(session_key);

-- RLS Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_session_updated
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to check session limit
CREATE OR REPLACE FUNCTION public.check_session_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM public.sessions
  WHERE user_id = NEW.user_id 
    AND status IN ('initializing', 'qr_ready', 'connecting', 'connected');
  
  IF active_count >= 5 THEN
    RAISE EXCEPTION 'Maximum active session limit (5) reached for user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_session_limit
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_limit();
```

**Pydantic Models:**

```python
# apps/api/src/models/session.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID
from enum import Enum

class SessionStatus(str, Enum):
    """Session status states"""
    INITIALIZING = "initializing"
    QR_READY = "qr_ready"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"

class CreateSessionRequest(BaseModel):
    """Request to create a new WhatsApp session"""
    model_config = ConfigDict(populate_by_name=True)
    
    session_key: str = Field(
        min_length=1,
        max_length=100,
        description="User-friendly session identifier"
    )

class SessionResponse(BaseModel):
    """Session response (CamelCase JSON)"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    id: UUID
    session_key: str
    status: SessionStatus
    phone_number: str | None = None
    connected_at: datetime | None = None
    last_activity_at: datetime
    created_at: datetime

class SessionCreatedResponse(SessionResponse):
    """Response when creating a session (includes stream URL)"""
    stream_url: str = Field(description="SSE endpoint for QR code stream")

class SessionListResponse(BaseModel):
    """List of sessions"""
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: ''.join(word.capitalize() if i else word for i, word in enumerate(x.split('_')))
    )
    
    sessions: list[SessionResponse]
    total: int

class QRCodeEvent(BaseModel):
    """QR code event payload"""
    session_id: UUID
    qr_data: str  # Base64 image data
    generation_count: int
    timestamp: datetime

class SessionConnectedEvent(BaseModel):
    """Session connected event payload"""
    session_id: UUID
    phone_number: str
    timestamp: datetime
```

**FastAPI Session Endpoints:**

```python
# apps/api/src/api/v1/sessions.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from supabase import Client
from uuid import UUID
import asyncio
import json

from ...core.auth import get_current_user
from ...core.supabase import get_supabase_client
from ...core.redis_client import get_redis
from ...core.stream_producer import StreamProducer
from ...models.session import (
    CreateSessionRequest,
    SessionResponse,
    SessionCreatedResponse,
    SessionListResponse,
    SessionStatus
)

router = APIRouter(prefix="/v1/sessions", tags=["Sessions"])

@router.post("", response_model=SessionCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    redis = Depends(get_redis)
):
    """
    Create a new WhatsApp session and initiate QR code generation.
    
    Returns a stream_url for Server-Sent Events to receive QR codes.
    """
    try:
        # Create session in database
        result = supabase.table('sessions').insert({
            'user_id': current_user['id'],
            'session_key': request.session_key,
            'status': SessionStatus.INITIALIZING
        }).execute()
        
        session_data = result.data[0]
        session_id = session_data['id']
        
        # Publish INIT_SESSION command to Redis
        producer = StreamProducer(redis)
        await producer.publish_command(
            "INIT_SESSION",
            {
                "session_id": session_id,
                "user_id": str(current_user['id']),
                "session_key": request.session_key
            }
        )
        
        # Return response with stream URL
        stream_url = f"/v1/sessions/{session_id}/stream"
        
        return SessionCreatedResponse(
            **session_data,
            stream_url=stream_url
        )
        
    except Exception as e:
        if "Maximum active session limit" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum active session limit (5) reached. Please disconnect unused sessions."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )

@router.get("/{session_id}/stream")
async def stream_qr_codes(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    redis = Depends(get_redis)
):
    """
    Server-Sent Events stream for QR codes and connection status.
    
    Events:
    - qr: QR code data (Base64 image)
    - connected: Session successfully connected
    - error: Connection failed
    """
    # Verify session belongs to user
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    async def event_generator():
        """Generate SSE events from Redis stream"""
        # Subscribe to events for this session
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"session:{session_id}:events")
        
        try:
            async for message in pubsub.listen():
                if message['type'] != 'message':
                    continue
                
                event_data = json.loads(message['data'])
                event_type = event_data.get('type')
                
                if event_type == 'QR_CODE_UPDATED':
                    # Send QR code event
                    yield f"event: qr\n"
                    yield f"data: {json.dumps(event_data['payload'])}\n\n"
                
                elif event_type == 'SESSION_CONNECTED':
                    # Send connected event and close stream
                    yield f"event: connected\n"
                    yield f"data: {json.dumps(event_data['payload'])}\n\n"
                    break
                
                elif event_type == 'SESSION_FAILED':
                    # Send error event and close stream
                    yield f"event: error\n"
                    yield f"data: {json.dumps(event_data['payload'])}\n\n"
                    break
                
                # Timeout after 5 minutes
                await asyncio.sleep(0.1)
        
        finally:
            await pubsub.unsubscribe(f"session:{session_id}:events")
            await pubsub.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.get("", response_model=SessionListResponse)
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """List all sessions for the authenticated user"""
    result = supabase.table('sessions')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .execute()
    
    return SessionListResponse(
        sessions=[SessionResponse(**session) for session in result.data],
        total=len(result.data)
    )

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get details of a specific session"""
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionResponse(**result.data)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_session(
    session_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    redis = Depends(get_redis)
):
    """
    Disconnect a WhatsApp session.
    
    Publishes LOGOUT command to Node.js engine.
    """
    # Verify session exists
    result = supabase.table('sessions')\
        .select('*')\
        .eq('id', str(session_id))\
        .eq('user_id', current_user['id'])\
        .single()\
        .execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Publish LOGOUT command
    producer = StreamProducer(redis)
    await producer.publish_command(
        "LOGOUT",
        {"session_id": str(session_id)}
    )
    
    # Update session status
    supabase.table('sessions')\
        .update({
            'status': SessionStatus.DISCONNECTED,
            'disconnected_at': datetime.utcnow().isoformat()
        })\
        .eq('id', str(session_id))\
        .execute()
    
    return None
```

**Node.js Baileys Session Manager:**

```typescript
// apps/engine/src/whatsapp/session-manager.ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { logger } from '../utils/logger';
import { Redis } from 'ioredis';
import QRCode from 'qrcode';

export class SessionManager {
  private sessions: Map<string, any> = new Map();
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async initSession(sessionId: string, userId: string): Promise<void> {
    logger.info('Initializing WhatsApp session', { sessionId, userId });

    try {
      // Setup auth state (persistent storage)
      const authFolder = `./auth_state/${sessionId}`;
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion();

      // Create WhatsApp socket
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // CRITICAL: Don't print to terminal
        logger: logger.child({ sessionId }),
        browser: ['WhatsApp API Gateway', 'Chrome', '1.0.0']
      });

      // Store socket reference
      this.sessions.set(sessionId, sock);

      // Listen to connection updates
      sock.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(sessionId, update);
      });

      // Listen to credentials update (save auth state)
      sock.ev.on('creds.update', saveCreds);

      logger.info('Session initialized successfully', { sessionId });

    } catch (error: any) {
      logger.error('Failed to initialize session', {
        sessionId,
        error: error.message
      });

      await this.publishEvent('SESSION_FAILED', {
        session_id: sessionId,
        error: error.message
      });
    }
  }

  private async handleConnectionUpdate(
    sessionId: string,
    update: any
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // QR code generated
    if (qr) {
      logger.info('QR code generated', { sessionId });

      // Convert QR to Base64 image
      const qrBase64 = await QRCode.toDataURL(qr);

      // Publish QR event
      await this.publishEvent('QR_CODE_UPDATED', {
        session_id: sessionId,
        qr_data: qrBase64,
        timestamp: new Date().toISOString()
      });

      // Also publish to session-specific channel for SSE
      await this.redis.publish(
        `session:${sessionId}:events`,
        JSON.stringify({
          type: 'QR_CODE_UPDATED',
          payload: { qr_data: qrBase64 }
        })
      );
    }

    // Connection opened (successfully connected)
    if (connection === 'open') {
      logger.info('Session connected', { sessionId });

      const sock = this.sessions.get(sessionId);
      const phoneNumber = sock?.user?.id?.split(':')[0] || 'unknown';

      // Publish connected event
      await this.publishEvent('SESSION_CONNECTED', {
        session_id: sessionId,
        phone_number: phoneNumber,
        timestamp: new Date().toISOString()
      });

      // Publish to session-specific channel
      await this.redis.publish(
        `session:${sessionId}:events`,
        JSON.stringify({
          type: 'SESSION_CONNECTED',
          payload: { phone_number: phoneNumber }
        })
      );
    }

    // Connection closed
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      logger.info('Session disconnected', {
        sessionId,
        shouldReconnect,
        reason: lastDisconnect?.error?.message
      });

      if (shouldReconnect) {
        // Auto-reconnect (Story 1.6)
        logger.info('Attempting reconnection', { sessionId });
        // Will be implemented in Story 1.6
      } else {
        // Logged out - cleanup
        this.sessions.delete(sessionId);

        await this.publishEvent('SESSION_DISCONNECTED', {
          session_id: sessionId,
          reason: 'logged_out',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async logout(sessionId: string): Promise<void> {
    const sock = this.sessions.get(sessionId);

    if (!sock) {
      logger.warn('Session not found for logout', { sessionId });
      return;
    }

    try {
      await sock.logout();
      this.sessions.delete(sessionId);
      logger.info('Session logged out successfully', { sessionId });
    } catch (error: any) {
      logger.error('Failed to logout session', {
        sessionId,
        error: error.message
      });
    }
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

**Updated Command Handlers:**

```typescript
// apps/engine/src/handlers/init-session-handler.ts
import { CommandHandler } from './command-router';
import { SessionManager } from '../whatsapp/session-manager';
import { logger } from '../utils/logger';

export class InitSessionHandler implements CommandHandler {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  async handle(payload: any): Promise<void> {
    const { session_id, user_id, session_key } = payload;

    logger.info('Handling INIT_SESSION command', {
      sessionId: session_id,
      userId: user_id
    });

    await this.sessionManager.initSession(session_id, user_id);
  }
}

// apps/engine/src/handlers/logout-handler.ts
export class LogoutHandler implements CommandHandler {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  async handle(payload: any): Promise<void> {
    const { session_id } = payload;

    logger.info('Handling LOGOUT command', { sessionId: session_id });

    await this.sessionManager.logout(session_id);
  }
}
```

### Library & Framework Requirements

**Python Dependencies:**
```toml
# No new dependencies - uses existing FastAPI StreamingResponse
```

**Node.js Dependencies (add to package.json):**
```json
{
  "dependencies": {
    "@whiskeysockets/baileys": "^6.0.0",
    "@hapi/boom": "^10.0.0",
    "qrcode": "^1.5.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.0"
  }
}
```

### File Structure Requirements

**New Files:**
```
apps/api/src/
├── api/v1/
│   └── sessions.py          # NEW: Session CRUD + SSE endpoints
├── models/
│   └── session.py           # NEW: Session Pydantic models
└── tests/
    └── test_sessions.py     # NEW: Session tests

apps/engine/src/
├── whatsapp/
│   └── session-manager.ts   # NEW: Baileys session management
├── handlers/
│   ├── init-session-handler.ts  # NEW: INIT_SESSION handler
│   └── logout-handler.ts        # NEW: LOGOUT handler
└── tests/
    └── test_session_manager.test.ts  # NEW: Session manager tests
```

**Database Migrations:**
```
infra/supabase/migrations/
└── 003_create_sessions.sql  # SQL schema from above
```

### Testing Requirements

**Python Tests:**
```python
# apps/api/src/tests/test_sessions.py
import pytest
from fastapi.testclient import TestClient

def test_create_session_success(client: TestClient, auth_headers):
    """Test successful session creation"""
    response = client.post("/v1/sessions",
        headers=auth_headers,
        json={"sessionKey": "my_session"}
    )
    assert response.status_code == 201
    assert "sessionId" in response.json()
    assert "streamUrl" in response.json()

def test_sse_stream_qr_codes(client: TestClient, auth_headers):
    """Test SSE stream receives QR codes"""
    # Create session first
    create_response = client.post("/v1/sessions",
        headers=auth_headers,
        json={"sessionKey": "test_session"}
    )
    session_id = create_response.json()["sessionId"]
    
    # Connect to SSE stream
    with client.stream("GET", f"/v1/sessions/{session_id}/stream",
                       headers=auth_headers) as response:
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream"
```

**Node.js Tests:**
```typescript
// apps/engine/src/tests/test_session_manager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../whatsapp/session-manager';

// Mock Baileys
vi.mock('@whiskeysockets/baileys', () => ({
  default: vi.fn(() => ({
    ev: {
      on: vi.fn()
    }
  })),
  useMultiFileAuthState: vi.fn(() => ({
    state: {},
    saveCreds: vi.fn()
  })),
  fetchLatestBaileysVersion: vi.fn(() => ({ version: [2, 3000, 0] }))
}));

describe('SessionManager', () => {
  it('should initialize session and emit QR event', async () => {
    const redis = createMockRedis();
    const manager = new SessionManager(redis);
    
    await manager.initSession('test-session-id', 'user-123');
    
    expect(redis.xadd).toHaveBeenCalledWith(
      'whatsapp:events',
      expect.anything(),
      expect.stringContaining('QR_CODE_UPDATED')
    );
  });
});
```

### Project Structure Notes

**Dependencies:**
- Story 1.1: Requires Docker infrastructure
- Story 1.2: Requires authentication
- Story 1.4: **CRITICAL** - Requires Redis Streams bridge

**Prepares for:**
- Story 1.6: Session persistence and auto-reconnect
- Story 2.1+: All messaging features use these sessions
- Story 3.1: Webhook events for session status

### References

**Primary Documents:**
- [epics.md#L165-L178](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L165-L178) - Story 1.5 complete context
- [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117) - Redis Streams
- [project-context.md#L53-L56](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L53-L56) - Baileys rules

**Functional Requirements:**
- FR5: Initier Connexion - [epics.md#L25](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L25)
- FR6: Stream QR Code - [epics.md#L26](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L26)
- FR8: Monitoring État - [epics.md#L28](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L28)

**Previous Stories:**
- [1-4-whatsapp-service-bridge-redis-streams.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-4-whatsapp-service-bridge-redis-streams.md) - Redis bridge

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
