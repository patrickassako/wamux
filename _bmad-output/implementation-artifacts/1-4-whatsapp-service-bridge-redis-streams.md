# Story 1.4: WhatsApp Service Bridge (Redis Streams)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a system architect,
I want a reliable communication bridge between Python and Node.js,
So that the API can control the WhatsApp Engine without direct coupling.

## Acceptance Criteria

**Given** the Redis container is running
**When** Python publishes a command to `whatsapp:commands` stream
**Then** the Node.js worker should consume it within 50ms
**And** the Worker should inspect the payload type and log reception
**And** any malformed JSON payload should be rejected and logged to `whatsapp:errors`

## Tasks / Subtasks

- [ ] Task 1: Design Redis Stream Architecture (AC: Stream naming and structure defined)
  - [ ] Define stream names: `whatsapp:commands`, `whatsapp:events`, `whatsapp:errors`
  - [ ] Define consumer group names: `engine-workers`, `webhook-dispatchers`
  - [ ] Design standard message envelope (id, type, version, timestamp, payload)
  - [ ] Define command types: `INIT_SESSION`, `SEND_MESSAGE`, `LOGOUT`, etc.
  - [ ] Define event types: `SESSION_CONNECTED`, `MESSAGE_SENT`, `MESSAGE_RECEIVED`, etc.
  - [ ] Document payload schemas for each command/event type

- [ ] Task 2: Implement Python Redis Stream Producer (AC: Python can publish commands)
  - [ ] Create `apps/api/src/core/redis_client.py` with Redis connection
  - [ ] Create `apps/api/src/core/stream_producer.py` with publish utilities
  - [ ] Implement `publish_command()` function with envelope wrapping
  - [ ] Implement `publish_event()` function for responses
  - [ ] Add error handling and retry logic (exponential backoff)
  - [ ] Add logging for all published messages

- [ ] Task 3: Create Pydantic Models for Commands/Events (AC: Type-safe payloads)
  - [ ] Create `apps/api/src/models/commands.py`
  - [ ] Implement base `CommandEnvelope` model (id, type, version, timestamp, payload)
  - [ ] Implement specific command models: `InitSessionCommand`, `SendMessageCommand`
  - [ ] Create `apps/api/src/models/events.py`
  - [ ] Implement base `EventEnvelope` model
  - [ ] Implement specific event models: `SessionConnectedEvent`, `MessageSentEvent`
  - [ ] Use snake_case for Redis payloads (match DB convention)

- [ ] Task 4: Implement Node.js Redis Stream Consumer (AC: Node.js can consume commands)
  - [ ] Create `apps/engine/src/redis/client.ts` with Redis connection
  - [ ] Create `apps/engine/src/redis/stream-consumer.ts` with consumer logic
  - [ ] Implement consumer group creation and management
  - [ ] Implement `consumeCommands()` function with XREADGROUP
  - [ ] Add message acknowledgment (XACK) after processing
  - [ ] Add error handling and dead-letter queue logic

- [ ] Task 5: Create TypeScript Types from Pydantic (AC: Type sync between services)
  - [ ] Setup `datamodel-code-generator` in Node.js project
  - [ ] Create script to generate TypeScript types from Pydantic models
  - [ ] Add `npm run generate:types` command to package.json
  - [ ] Generate types into `apps/engine/src/generated/types.ts`
  - [ ] Add CI check to ensure types are up-to-date
  - [ ] Document type generation workflow in README

- [ ] Task 6: Implement Command Router/Dispatcher (AC: Commands route to handlers)
  - [ ] Create `apps/engine/src/handlers/command-router.ts`
  - [ ] Implement command type detection and routing
  - [ ] Create handler interface: `CommandHandler<T>`
  - [ ] Implement stub handlers for each command type
  - [ ] Add logging for command processing (start, success, error)
  - [ ] Add metrics collection (processing time, success rate)

- [ ] Task 7: Add End-to-End Integration Test (AC: Full flow works)
  - [ ] Create integration test: Python publishes → Node.js consumes
  - [ ] Test command envelope structure is preserved
  - [ ] Test malformed JSON is rejected and logged to errors stream
  - [ ] Test consumer group acknowledgment works correctly
  - [ ] Test multiple consumers can process in parallel
  - [ ] Test backpressure handling (slow consumer doesn't block producer)

- [ ] Task 8: Add Monitoring and Observability (AC: Stream health is visible)
  - [ ] Create health check endpoint: `GET /health/redis`
  - [ ] Monitor stream length (alert if > 1000 pending messages)
  - [ ] Monitor consumer lag (time between publish and consume)
  - [ ] Add Prometheus metrics for stream operations
  - [ ] Create dashboard queries for stream monitoring
  - [ ] Document alerting thresholds

## Dev Notes

### Architecture Compliance

**CRITICAL: Redis Streams (NOT Pub/Sub)**

Source: [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117)

**Why Streams over Pub/Sub:**
- ✅ **Guaranteed Delivery**: Messages persist even if consumer is down
- ✅ **Consumer Groups**: Multiple workers can process in parallel
- ✅ **Acknowledgment**: XACK ensures message was processed
- ✅ **Backpressure**: Slow consumers don't lose messages
- ❌ Pub/Sub loses messages if no subscriber is listening

**Architecture Decision:**
```
Python API (Producer)
    ↓ XADD
Redis Streams (Broker)
    ↓ XREADGROUP
Node.js Engine (Consumer Group)
```

**Stream Names:**
- `whatsapp:commands` - Python → Node.js (control plane)
- `whatsapp:events` - Node.js → Python (data plane)
- `whatsapp:errors` - Both → Logging (error handling)

### Technical Requirements

**Standard Message Envelope:**

Source: [architecture.md#L160-L171](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L160-L171)

```json
{
  "id": "uuid4",
  "type": "COMMAND_SEND_TEXT",
  "version": "1.0",
  "timestamp": "2026-01-17T10:11:32Z",
  "payload": {
    "session_id": "user123_session1",
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello World"
  }
}
```

**Naming Convention:**
- Source: [architecture.md#L148-L156](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L148-L156)
- Redis payloads: **snake_case** (to match DB)
- Python internal: **snake_case**
- Node.js internal: **camelCase**
- API JSON: **CamelCase**

**Command Types (Initial Set):**
```python
class CommandType(str, Enum):
    INIT_SESSION = "INIT_SESSION"
    SEND_TEXT = "SEND_TEXT"
    SEND_IMAGE = "SEND_IMAGE"
    SEND_AUDIO = "SEND_AUDIO"
    SEND_VIDEO = "SEND_VIDEO"
    LOGOUT = "LOGOUT"
    GET_STATUS = "GET_STATUS"
```

**Event Types (Initial Set):**
```python
class EventType(str, Enum):
    SESSION_CONNECTED = "SESSION_CONNECTED"
    SESSION_DISCONNECTED = "SESSION_DISCONNECTED"
    QR_CODE_UPDATED = "QR_CODE_UPDATED"
    MESSAGE_SENT = "MESSAGE_SENT"
    MESSAGE_RECEIVED = "MESSAGE_RECEIVED"
    ERROR_OCCURRED = "ERROR_OCCURRED"
```

### Python Implementation

**Redis Client Setup:**

```python
# apps/api/src/core/redis_client.py
import redis.asyncio as redis
from typing import Optional
from .config import settings

class RedisClient:
    """Singleton Redis client for stream operations"""
    
    _instance: Optional[redis.Redis] = None
    
    @classmethod
    async def get_client(cls) -> redis.Redis:
        """Get or create Redis client instance"""
        if cls._instance is None:
            cls._instance = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50
            )
        return cls._instance
    
    @classmethod
    async def close(cls):
        """Close Redis connection"""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None

async def get_redis() -> redis.Redis:
    """Dependency for FastAPI routes"""
    return await RedisClient.get_client()
```

**Stream Producer:**

```python
# apps/api/src/core/stream_producer.py
import orjson
from uuid import uuid4
from datetime import datetime
from redis.asyncio import Redis
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

class StreamProducer:
    """Publishes commands and events to Redis Streams"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def publish_command(
        self,
        command_type: str,
        payload: Dict[str, Any],
        stream_name: str = "whatsapp:commands"
    ) -> str:
        """
        Publish a command to Redis Stream.
        
        Args:
            command_type: Type of command (e.g., "SEND_TEXT")
            payload: Command-specific payload (snake_case)
            stream_name: Target stream name
        
        Returns:
            Message ID from Redis
        """
        envelope = {
            "id": str(uuid4()),
            "type": command_type,
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "payload": payload
        }
        
        try:
            # Serialize to JSON
            message_json = orjson.dumps(envelope).decode()
            
            # Publish to stream (XADD)
            message_id = await self.redis.xadd(
                stream_name,
                {"data": message_json},
                maxlen=10000  # Keep last 10k messages
            )
            
            logger.info(
                f"Published command: {command_type} to {stream_name}",
                extra={"message_id": message_id, "envelope_id": envelope["id"]}
            )
            
            return message_id
            
        except Exception as e:
            logger.error(
                f"Failed to publish command: {command_type}",
                extra={"error": str(e), "payload": payload}
            )
            # Publish to error stream
            await self._publish_error(command_type, str(e), payload)
            raise
    
    async def publish_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        stream_name: str = "whatsapp:events"
    ) -> str:
        """Publish an event to Redis Stream (same logic as commands)"""
        return await self.publish_command(event_type, payload, stream_name)
    
    async def _publish_error(
        self,
        operation: str,
        error: str,
        context: Dict[str, Any]
    ):
        """Publish error to error stream for monitoring"""
        error_payload = {
            "operation": operation,
            "error": error,
            "context": context,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            await self.redis.xadd(
                "whatsapp:errors",
                {"data": orjson.dumps(error_payload).decode()},
                maxlen=1000
            )
        except Exception as e:
            logger.critical(f"Failed to log error to stream: {e}")
```

**Pydantic Command Models:**

```python
# apps/api/src/models/commands.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

class CommandType(str, Enum):
    """Available command types"""
    INIT_SESSION = "INIT_SESSION"
    SEND_TEXT = "SEND_TEXT"
    SEND_IMAGE = "SEND_IMAGE"
    SEND_AUDIO = "SEND_AUDIO"
    SEND_VIDEO = "SEND_VIDEO"
    LOGOUT = "LOGOUT"
    GET_STATUS = "GET_STATUS"

class CommandEnvelope(BaseModel):
    """Standard command envelope for Redis Streams"""
    id: UUID = Field(default_factory=uuid4)
    type: CommandType
    version: str = "1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: dict

class InitSessionPayload(BaseModel):
    """Payload for INIT_SESSION command"""
    session_id: str
    user_id: UUID
    webhook_url: str | None = None

class SendTextPayload(BaseModel):
    """Payload for SEND_TEXT command"""
    session_id: str
    to: str  # Phone number in WhatsApp format
    message: str
    
class SendImagePayload(BaseModel):
    """Payload for SEND_IMAGE command"""
    session_id: str
    to: str
    image_url: str
    caption: str | None = None

class SendAudioPayload(BaseModel):
    """Payload for SEND_AUDIO command"""
    session_id: str
    to: str
    audio_url: str
    ptt: bool = False  # Push-to-talk (voice note)

class SendVideoPayload(BaseModel):
    """Payload for SEND_VIDEO command"""
    session_id: str
    to: str
    video_url: str
    caption: str | None = None

class LogoutPayload(BaseModel):
    """Payload for LOGOUT command"""
    session_id: str

class GetStatusPayload(BaseModel):
    """Payload for GET_STATUS command"""
    session_id: str
```

### Node.js Implementation

**Redis Client Setup:**

```typescript
// apps/engine/src/redis/client.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        logger.error('Redis connection error', { error: err.message });
        return true;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
```

**Stream Consumer:**

```typescript
// apps/engine/src/redis/stream-consumer.ts
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { CommandRouter } from '../handlers/command-router';

export interface StreamMessage {
  id: string;
  data: {
    data: string; // JSON string
  };
}

export class StreamConsumer {
  private redis: Redis;
  private consumerGroup: string;
  private consumerName: string;
  private streamName: string;
  private router: CommandRouter;
  private isRunning: boolean = false;

  constructor(
    redis: Redis,
    streamName: string = 'whatsapp:commands',
    consumerGroup: string = 'engine-workers',
    consumerName: string = `worker-${process.pid}`
  ) {
    this.redis = redis;
    this.streamName = streamName;
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.router = new CommandRouter();
  }

  async start(): Promise<void> {
    // Create consumer group if it doesn't exist
    try {
      await this.redis.xgroup(
        'CREATE',
        this.streamName,
        this.consumerGroup,
        '0',
        'MKSTREAM'
      );
      logger.info(`Created consumer group: ${this.consumerGroup}`);
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) {
        throw err;
      }
      logger.info(`Consumer group already exists: ${this.consumerGroup}`);
    }

    this.isRunning = true;
    logger.info(`Stream consumer started: ${this.consumerName}`);

    // Start consuming
    await this.consume();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info(`Stream consumer stopped: ${this.consumerName}`);
  }

  private async consume(): Promise<void> {
    while (this.isRunning) {
      try {
        // Read from stream (XREADGROUP)
        const results = await this.redis.xreadgroup(
          'GROUP',
          this.consumerGroup,
          this.consumerName,
          'BLOCK',
          1000, // Block for 1 second
          'COUNT',
          10, // Process up to 10 messages at once
          'STREAMS',
          this.streamName,
          '>' // Only new messages
        );

        if (!results || results.length === 0) {
          continue;
        }

        // Process messages
        for (const [stream, messages] of results) {
          for (const [messageId, fields] of messages as any) {
            await this.processMessage(messageId, fields);
          }
        }
      } catch (err: any) {
        logger.error('Error consuming stream', {
          error: err.message,
          stream: this.streamName
        });
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processMessage(messageId: string, fields: string[]): Promise<void> {
    const startTime = Date.now();

    try {
      // Extract JSON data
      const dataIndex = fields.indexOf('data');
      if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
        throw new Error('Invalid message format: missing data field');
      }

      const jsonData = fields[dataIndex + 1];
      const envelope = JSON.parse(jsonData);

      logger.info('Processing command', {
        messageId,
        envelopeId: envelope.id,
        type: envelope.type
      });

      // Validate envelope structure
      if (!envelope.id || !envelope.type || !envelope.payload) {
        throw new Error('Invalid envelope structure');
      }

      // Route to appropriate handler
      await this.router.route(envelope);

      // Acknowledge message (XACK)
      await this.redis.xack(this.streamName, this.consumerGroup, messageId);

      const processingTime = Date.now() - startTime;
      logger.info('Command processed successfully', {
        messageId,
        type: envelope.type,
        processingTime
      });

    } catch (err: any) {
      logger.error('Failed to process message', {
        messageId,
        error: err.message
      });

      // Publish to error stream
      await this.publishError(messageId, err.message, fields);

      // Still acknowledge to prevent reprocessing
      await this.redis.xack(this.streamName, this.consumerGroup, messageId);
    }
  }

  private async publishError(
    messageId: string,
    error: string,
    originalFields: string[]
  ): Promise<void> {
    try {
      const errorPayload = {
        message_id: messageId,
        error,
        original_data: originalFields,
        timestamp: new Date().toISOString()
      };

      await this.redis.xadd(
        'whatsapp:errors',
        'MAXLEN',
        '~',
        '1000',
        '*',
        'data',
        JSON.stringify(errorPayload)
      );
    } catch (err: any) {
      logger.critical('Failed to publish error', { error: err.message });
    }
  }
}
```

**Command Router:**

```typescript
// apps/engine/src/handlers/command-router.ts
import { logger } from '../utils/logger';

export interface CommandEnvelope {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  payload: any;
}

export interface CommandHandler<T = any> {
  handle(payload: T): Promise<void>;
}

export class CommandRouter {
  private handlers: Map<string, CommandHandler> = new Map();

  constructor() {
    // Register handlers (stub implementations for now)
    this.registerHandler('INIT_SESSION', new InitSessionHandler());
    this.registerHandler('SEND_TEXT', new SendTextHandler());
    this.registerHandler('SEND_IMAGE', new SendImageHandler());
    this.registerHandler('SEND_AUDIO', new SendAudioHandler());
    this.registerHandler('SEND_VIDEO', new SendVideoHandler());
    this.registerHandler('LOGOUT', new LogoutHandler());
    this.registerHandler('GET_STATUS', new GetStatusHandler());
  }

  registerHandler(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
    logger.info(`Registered handler for command: ${commandType}`);
  }

  async route(envelope: CommandEnvelope): Promise<void> {
    const handler = this.handlers.get(envelope.type);

    if (!handler) {
      throw new Error(`No handler registered for command type: ${envelope.type}`);
    }

    await handler.handle(envelope.payload);
  }
}

// Stub handlers (will be implemented in future stories)
class InitSessionHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('INIT_SESSION handler called', { payload });
    // TODO: Implement in Story 1.5
  }
}

class SendTextHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('SEND_TEXT handler called', { payload });
    // TODO: Implement in Story 2.1
  }
}

class SendImageHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('SEND_IMAGE handler called', { payload });
    // TODO: Implement in Story 2.3
  }
}

class SendAudioHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('SEND_AUDIO handler called', { payload });
    // TODO: Implement in Story 2.4
  }
}

class SendVideoHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('SEND_VIDEO handler called', { payload });
    // TODO: Implement in Story 2.3
  }
}

class LogoutHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('LOGOUT handler called', { payload });
    // TODO: Implement in Story 1.6
  }
}

class GetStatusHandler implements CommandHandler {
  async handle(payload: any): Promise<void> {
    logger.info('GET_STATUS handler called', { payload });
    // TODO: Implement in Story 1.5
  }
}
```

**Main Entry Point:**

```typescript
// apps/engine/src/main.ts
import { getRedisClient, closeRedis } from './redis/client';
import { StreamConsumer } from './redis/stream-consumer';
import { logger } from './utils/logger';

async function main() {
  logger.info('WhatsApp Engine starting...');

  try {
    // Initialize Redis
    const redis = await getRedisClient();

    // Start stream consumer
    const consumer = new StreamConsumer(redis);
    await consumer.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await consumer.stop();
      await closeRedis();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await consumer.stop();
      await closeRedis();
      process.exit(0);
    });

  } catch (err: any) {
    logger.error('Failed to start engine', { error: err.message });
    process.exit(1);
  }
}

main();
```

### Library & Framework Requirements

**Python Dependencies (add to pyproject.toml):**
```toml
dependencies = [
    # ... existing dependencies
    "redis[hiredis]>=5.0.0",  # Async Redis with C parser
    "orjson>=3.9.0",  # Fast JSON serialization
]
```

**Node.js Dependencies (add to package.json):**
```json
{
  "dependencies": {
    "ioredis": "^5.3.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "datamodel-code-generator": "^0.25.0"
  },
  "scripts": {
    "generate:types": "datamodel-code-generator --input ../api/src/models --output src/generated/types.ts"
  }
}
```

### File Structure Requirements

**New Files to Create:**

```
apps/api/src/
├── core/
│   ├── redis_client.py      # NEW: Redis connection singleton
│   └── stream_producer.py   # NEW: Stream publishing utilities
├── models/
│   ├── commands.py          # NEW: Command Pydantic models
│   └── events.py            # NEW: Event Pydantic models
└── tests/
    └── test_redis_streams.py # NEW: Integration tests

apps/engine/src/
├── redis/
│   ├── client.ts            # NEW: Redis connection
│   └── stream-consumer.ts   # NEW: Stream consumer with XREADGROUP
├── handlers/
│   └── command-router.ts    # NEW: Command routing and handlers
├── generated/
│   └── types.ts             # GENERATED: TypeScript types from Pydantic
└── main.ts                  # UPDATED: Start stream consumer
```

### Testing Requirements

**Python Integration Tests:**

```python
# apps/api/src/tests/test_redis_streams.py
import pytest
import asyncio
from redis.asyncio import Redis
from ..core.stream_producer import StreamProducer

@pytest.mark.asyncio
async def test_publish_command_success(redis_client: Redis):
    """Test publishing a command to Redis Stream"""
    producer = StreamProducer(redis_client)
    
    message_id = await producer.publish_command(
        command_type="SEND_TEXT",
        payload={
            "session_id": "test_session",
            "to": "1234567890@s.whatsapp.net",
            "message": "Hello Test"
        }
    )
    
    assert message_id is not None
    
    # Verify message in stream
    messages = await redis_client.xread({"whatsapp:commands": "0-0"}, count=1)
    assert len(messages) > 0
    assert messages[0][0] == b"whatsapp:commands"

@pytest.mark.asyncio
async def test_command_envelope_structure(redis_client: Redis):
    """Test command envelope has correct structure"""
    producer = StreamProducer(redis_client)
    
    await producer.publish_command(
        command_type="INIT_SESSION",
        payload={"session_id": "test"}
    )
    
    messages = await redis_client.xread({"whatsapp:commands": "0-0"}, count=1)
    message_data = messages[0][1][0][1]
    
    import orjson
    envelope = orjson.loads(message_data[b"data"])
    
    assert "id" in envelope
    assert "type" in envelope
    assert envelope["type"] == "INIT_SESSION"
    assert "version" in envelope
    assert "timestamp" in envelope
    assert "payload" in envelope

@pytest.mark.asyncio
async def test_error_stream_on_failure(redis_client: Redis):
    """Test errors are logged to error stream"""
    producer = StreamProducer(redis_client)
    
    # Simulate error by closing Redis connection
    await redis_client.close()
    
    with pytest.raises(Exception):
        await producer.publish_command("TEST", {})
    
    # Reconnect and check error stream
    # (In real implementation, error would be logged)
```

**Node.js Integration Tests:**

```typescript
// apps/engine/src/tests/stream-consumer.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { StreamConsumer } from '../redis/stream-consumer';

describe('StreamConsumer', () => {
  let redis: Redis;
  let consumer: StreamConsumer;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  });

  afterAll(async () => {
    await consumer.stop();
    await redis.quit();
  });

  it('should consume messages from stream', async () => {
    consumer = new StreamConsumer(redis, 'test:commands', 'test-group');
    await consumer.start();

    // Publish test message
    const envelope = {
      id: 'test-123',
      type: 'SEND_TEXT',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload: { message: 'test' }
    };

    await redis.xadd('test:commands', '*', 'data', JSON.stringify(envelope));

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify message was acknowledged
    const pending = await redis.xpending('test:commands', 'test-group');
    expect(pending[0]).toBe(0); // No pending messages
  });

  it('should handle malformed JSON', async () => {
    consumer = new StreamConsumer(redis, 'test:commands', 'test-group');
    await consumer.start();

    // Publish invalid JSON
    await redis.xadd('test:commands', '*', 'data', 'invalid json');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check error stream
    const errors = await redis.xread('COUNT', 1, 'STREAMS', 'whatsapp:errors', '0-0');
    expect(errors).toBeTruthy();
  });
});
```

### Project Structure Notes

**Alignment with Architecture:**
- Redis Streams provide guaranteed delivery (vs Pub/Sub)
- Consumer Groups enable horizontal scaling
- Snake_case in Redis payloads (matches DB convention)
- No shared code between Python and Node.js
- Type safety via Pydantic → TypeScript generation

**Dependencies on Previous Stories:**
- Story 1.1: Requires Redis container in docker-compose.yml
- Story 1.1: Requires basic Python and Node.js structure

**Prepares for Future Stories:**
- Story 1.5: Will use INIT_SESSION command
- Story 2.1: Will use SEND_TEXT command
- Story 2.3: Will use SEND_IMAGE/VIDEO commands
- Story 3.1: Will consume events from whatsapp:events stream

**Performance Considerations:**
- MAXLEN on streams prevents unbounded growth
- Consumer groups enable parallel processing
- XACK ensures at-least-once delivery
- Backpressure support via stream length monitoring

### References

**Primary Documents:**
- [epics.md#L151-L163](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L151-L163) - Story 1.4 complete context
- [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117) - Redis Streams decision
- [architecture.md#L160-L171](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L160-L171) - Message envelope structure

**Key Architecture Sections:**
- Redis Streams Architecture: [architecture.md#L112-L117](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L112-L117)
- Communication Patterns: [architecture.md#L159-L171](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L159-L171)
- Naming Conventions: [architecture.md#L148-L156](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L148-L156)
- Service Boundaries: [architecture.md#L236-L246](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L236-L246)

**Anti-Patterns:**
- [project-context.md#L114](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L114) - No shared code between Python/Node
- [project-context.md#L115](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L115) - Node.js never accesses DB directly

**Previous Stories:**
- [1-1-project-initialization-monorepo-setup.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-1-project-initialization-monorepo-setup.md) - Redis infrastructure

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
