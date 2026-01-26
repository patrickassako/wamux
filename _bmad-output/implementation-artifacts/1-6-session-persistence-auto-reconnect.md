# Story 1.6: Session Persistence & Auto-Reconnect

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my WhatsApp session to remain active after server restarts,
So that I don't have to rescan the QR code every day.

## Acceptance Criteria

**Given** an active connected session
**When** the Node.js container is restarted
**Then** the session should automatically attempt reconnection using saved credentials
**And** the status in Redis should move from `connecting` to `connected` automatically
**And** no user intervention should be required

## Tasks / Subtasks

- [ ] Task 1: Implement Baileys Auth State Persistence (AC: Credentials saved to disk)
  - [ ] Configure `useMultiFileAuthState` with proper folder structure
  - [ ] Create auth state directory: `./auth_state/{session_id}/`
  - [ ] Ensure credentials are saved on `creds.update` event
  - [ ] Add encryption for auth state files (AES-256)
  - [ ] Implement cleanup on session deletion

- [ ] Task 2: Implement Session Recovery on Startup (AC: Sessions restore on restart)
  - [ ] Create session recovery service in Node.js
  - [ ] Query database for all `connected` sessions on startup
  - [ ] Restore Baileys socket for each active session
  - [ ] Update session status based on reconnection result
  - [ ] Handle cases where auth state is corrupted or missing

- [ ] Task 3: Implement Auto-Reconnect Logic (AC: Reconnects on disconnect)
  - [ ] Detect disconnect reasons (network, server restart, etc.)
  - [ ] Implement exponential backoff for reconnection attempts
  - [ ] Max 5 retry attempts with increasing delays (1s, 2s, 4s, 8s, 16s)
  - [ ] Publish reconnection events to Redis
  - [ ] Update session status during reconnection attempts

- [ ] Task 4: Handle DisconnectReason Cases (AC: Proper handling of all disconnect types)
  - [ ] Handle `loggedOut`: Mark session as disconnected, delete auth state
  - [ ] Handle `connectionClosed`: Attempt auto-reconnect
  - [ ] Handle `connectionLost`: Attempt auto-reconnect
  - [ ] Handle `connectionReplaced`: Mark as disconnected (user logged in elsewhere)
  - [ ] Handle `timedOut`: Attempt auto-reconnect with backoff
  - [ ] Handle `badSession`: Delete auth state and mark as failed

- [ ] Task 5: Implement Session Health Monitoring (AC: Unhealthy sessions detected)
  - [ ] Create background job to ping all active sessions every 5 minutes
  - [ ] Check last_activity_at timestamp
  - [ ] Mark sessions as stale if no activity for 24 hours
  - [ ] Send webhook notification for stale sessions
  - [ ] Auto-disconnect sessions inactive for 7 days

- [ ] Task 6: Add Session Keepalive Mechanism (AC: Sessions stay active)
  - [ ] Implement periodic presence update (every 30 minutes)
  - [ ] Send `available` presence to WhatsApp
  - [ ] Update last_activity_at timestamp in database
  - [ ] Handle keepalive failures (trigger reconnection)
  - [ ] Make keepalive configurable per session

- [ ] Task 7: Implement Graceful Shutdown (AC: Clean shutdown on SIGTERM)
  - [ ] Listen for SIGTERM/SIGINT signals
  - [ ] Close all active Baileys sockets gracefully
  - [ ] Save all pending auth state updates
  - [ ] Update session statuses to `disconnected` in database
  - [ ] Close Redis connections
  - [ ] Exit with code 0 after cleanup

- [ ] Task 8: Add Comprehensive Tests (AC: All reconnection scenarios tested)
  - [ ] Test session recovery on startup (mock database query)
  - [ ] Test auto-reconnect on network disconnect
  - [ ] Test exponential backoff logic
  - [ ] Test DisconnectReason.loggedOut (should NOT reconnect)
  - [ ] Test graceful shutdown (all sockets closed)
  - [ ] Test auth state encryption/decryption
  - [ ] Achieve >85% code coverage

## Dev Notes

### Architecture Compliance

**CRITICAL: Session Persistence Rules**

Source: [project-context.md#L53-L56](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L53-L56)

**Baileys Auth State:**
- MUST use `useMultiFileAuthState` (never in-memory only)
- Auth state stored in `./auth_state/{session_id}/` folder
- Contains: `creds.json`, `app-state-sync-key-*.json`, `app-state-sync-version-*.json`
- MUST encrypt sensitive files (AES-256)
- MUST handle `creds.update` event to save changes

**Auto-Reconnect Strategy:**
Source: [architecture.md#L261-L263](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L261-L263)

- Exponential Backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 attempts before marking as failed
- Healthcheck active: Restart container if > 3 failures
- NEVER reconnect on `DisconnectReason.loggedOut`

**Session Lifecycle:**
```
connected → connectionLost → reconnecting → connected
                ↓ (after 5 failures)
              failed → manual intervention required
```

### Technical Requirements

**Auth State Encryption:**

```typescript
// apps/engine/src/whatsapp/auth-encryption.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ENCRYPTION_KEY = process.env.AUTH_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export async function encryptAuthFile(
  filePath: string,
  data: string
): Promise<void> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  const encryptedData = {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted
  };
  
  await fs.writeFile(filePath, JSON.stringify(encryptedData), 'utf8');
}

export async function decryptAuthFile(filePath: string): Promise<string> {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const { iv, authTag, data } = JSON.parse(fileContent);
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Session Recovery Service:**

```typescript
// apps/engine/src/whatsapp/session-recovery.ts
import { SessionManager } from './session-manager';
import { getSupabaseClient } from '../db/supabase';
import { logger } from '../utils/logger';

export class SessionRecoveryService {
  private sessionManager: SessionManager;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  async recoverActiveSessions(): Promise<void> {
    logger.info('Starting session recovery...');

    try {
      // Query all connected sessions from database
      const supabase = getSupabaseClient();
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'connected');

      if (error) {
        throw error;
      }

      logger.info(`Found ${sessions?.length || 0} sessions to recover`);

      // Restore each session
      for (const session of sessions || []) {
        try {
          await this.sessionManager.restoreSession(
            session.id,
            session.user_id
          );
          logger.info('Session recovered successfully', {
            sessionId: session.id
          });
        } catch (err: any) {
          logger.error('Failed to recover session', {
            sessionId: session.id,
            error: err.message
          });

          // Mark session as failed
          await supabase
            .from('sessions')
            .update({ status: 'failed' })
            .eq('id', session.id);
        }
      }

      logger.info('Session recovery completed');
    } catch (err: any) {
      logger.error('Session recovery failed', { error: err.message });
    }
  }
}
```

**Enhanced Session Manager with Auto-Reconnect:**

```typescript
// apps/engine/src/whatsapp/session-manager.ts (updated)
import { DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

export class SessionManager {
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  async restoreSession(sessionId: string, userId: string): Promise<void> {
    logger.info('Restoring session from auth state', { sessionId });

    // Check if auth state exists
    const authFolder = `./auth_state/${sessionId}`;
    const credsPath = path.join(authFolder, 'creds.json');

    try {
      await fs.access(credsPath);
    } catch {
      throw new Error('Auth state not found - session cannot be restored');
    }

    // Initialize session (will use existing auth state)
    await this.initSession(sessionId, userId);
  }

  private async handleConnectionUpdate(
    sessionId: string,
    update: any
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // ... existing QR and connected logic ...

    // Connection closed
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const disconnectReason = statusCode as DisconnectReason;

      logger.info('Session disconnected', {
        sessionId,
        reason: DisconnectReason[disconnectReason] || 'unknown',
        statusCode
      });

      // Handle different disconnect reasons
      switch (disconnectReason) {
        case DisconnectReason.loggedOut:
          // User logged out - DO NOT reconnect
          await this.handleLoggedOut(sessionId);
          break;

        case DisconnectReason.connectionReplaced:
          // User logged in elsewhere - DO NOT reconnect
          await this.handleConnectionReplaced(sessionId);
          break;

        case DisconnectReason.badSession:
          // Corrupted session - delete and fail
          await this.handleBadSession(sessionId);
          break;

        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.timedOut:
          // Network issues - attempt reconnect
          await this.attemptReconnect(sessionId);
          break;

        default:
          // Unknown reason - attempt reconnect
          await this.attemptReconnect(sessionId);
      }
    }
  }

  private async handleLoggedOut(sessionId: string): Promise<void> {
    logger.info('Session logged out by user', { sessionId });

    // Delete auth state
    await this.deleteAuthState(sessionId);

    // Remove from active sessions
    this.sessions.delete(sessionId);
    this.reconnectAttempts.delete(sessionId);

    // Update database
    await this.updateSessionStatus(sessionId, 'disconnected');

    // Publish event
    await this.publishEvent('SESSION_DISCONNECTED', {
      session_id: sessionId,
      reason: 'logged_out'
    });
  }

  private async handleConnectionReplaced(sessionId: string): Promise<void> {
    logger.info('Session replaced (logged in elsewhere)', { sessionId });

    // Keep auth state (user might want to reconnect)
    this.sessions.delete(sessionId);
    this.reconnectAttempts.delete(sessionId);

    await this.updateSessionStatus(sessionId, 'disconnected');

    await this.publishEvent('SESSION_DISCONNECTED', {
      session_id: sessionId,
      reason: 'connection_replaced'
    });
  }

  private async handleBadSession(sessionId: string): Promise<void> {
    logger.error('Bad session detected - deleting auth state', { sessionId });

    await this.deleteAuthState(sessionId);
    this.sessions.delete(sessionId);
    this.reconnectAttempts.delete(sessionId);

    await this.updateSessionStatus(sessionId, 'failed');

    await this.publishEvent('SESSION_FAILED', {
      session_id: sessionId,
      reason: 'bad_session'
    });
  }

  private async attemptReconnect(sessionId: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;

    if (attempts >= 5) {
      logger.error('Max reconnection attempts reached', { sessionId, attempts });

      await this.updateSessionStatus(sessionId, 'failed');
      await this.publishEvent('SESSION_FAILED', {
        session_id: sessionId,
        reason: 'max_reconnect_attempts'
      });

      this.reconnectAttempts.delete(sessionId);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.pow(2, attempts) * 1000;

    logger.info('Scheduling reconnection attempt', {
      sessionId,
      attempt: attempts + 1,
      delayMs: delay
    });

    this.reconnectAttempts.set(sessionId, attempts + 1);

    // Update status to reconnecting
    await this.updateSessionStatus(sessionId, 'connecting');

    // Schedule reconnection
    const timer = setTimeout(async () => {
      try {
        logger.info('Attempting reconnection', {
          sessionId,
          attempt: attempts + 1
        });

        // Get user_id from database
        const session = await this.getSessionFromDb(sessionId);
        if (!session) {
          throw new Error('Session not found in database');
        }

        // Attempt to restore session
        await this.restoreSession(sessionId, session.user_id);

        // Reset attempts on success
        this.reconnectAttempts.delete(sessionId);

        logger.info('Reconnection successful', { sessionId });

      } catch (err: any) {
        logger.error('Reconnection attempt failed', {
          sessionId,
          attempt: attempts + 1,
          error: err.message
        });

        // Will trigger another reconnect attempt via connection.update
      }
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
  }

  private async deleteAuthState(sessionId: string): Promise<void> {
    const authFolder = `./auth_state/${sessionId}`;

    try {
      await fs.rm(authFolder, { recursive: true, force: true });
      logger.info('Auth state deleted', { sessionId });
    } catch (err: any) {
      logger.error('Failed to delete auth state', {
        sessionId,
        error: err.message
      });
    }
  }

  private async updateSessionStatus(
    sessionId: string,
    status: string
  ): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('sessions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  private async getSessionFromDb(sessionId: string): Promise<any> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down session manager...');

    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Close all active sessions
    const closePromises = Array.from(this.sessions.entries()).map(
      async ([sessionId, sock]) => {
        try {
          await sock.end();
          await this.updateSessionStatus(sessionId, 'disconnected');
          logger.info('Session closed gracefully', { sessionId });
        } catch (err: any) {
          logger.error('Failed to close session', {
            sessionId,
            error: err.message
          });
        }
      }
    );

    await Promise.all(closePromises);

    logger.info('Session manager shutdown complete');
  }
}
```

**Session Keepalive Service:**

```typescript
// apps/engine/src/whatsapp/session-keepalive.ts
import { SessionManager } from './session-manager';
import { getSupabaseClient } from '../db/supabase';
import { logger } from '../utils/logger';

export class SessionKeepaliveService {
  private sessionManager: SessionManager;
  private interval: NodeJS.Timeout | null = null;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  start(): void {
    logger.info('Starting session keepalive service');

    // Run every 30 minutes
    this.interval = setInterval(async () => {
      await this.performKeepalive();
    }, 30 * 60 * 1000);

    // Run immediately on start
    this.performKeepalive();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Session keepalive service stopped');
    }
  }

  private async performKeepalive(): Promise<void> {
    logger.info('Performing session keepalive');

    try {
      const supabase = getSupabaseClient();
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'connected');

      for (const session of sessions || []) {
        try {
          // Send presence update
          const sock = this.sessionManager.getSession(session.id);

          if (sock) {
            await sock.sendPresenceUpdate('available');

            // Update last_activity_at
            await supabase
              .from('sessions')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('id', session.id);

            logger.debug('Keepalive sent', { sessionId: session.id });
          }
        } catch (err: any) {
          logger.error('Keepalive failed for session', {
            sessionId: session.id,
            error: err.message
          });
        }
      }
    } catch (err: any) {
      logger.error('Keepalive service error', { error: err.message });
    }
  }
}
```

**Updated Main Entry Point:**

```typescript
// apps/engine/src/main.ts (updated)
import { getRedisClient, closeRedis } from './redis/client';
import { StreamConsumer } from './redis/stream-consumer';
import { SessionManager } from './whatsapp/session-manager';
import { SessionRecoveryService } from './whatsapp/session-recovery';
import { SessionKeepaliveService } from './whatsapp/session-keepalive';
import { logger } from './utils/logger';

async function main() {
  logger.info('WhatsApp Engine starting...');

  try {
    // Initialize Redis
    const redis = await getRedisClient();

    // Initialize session manager
    const sessionManager = new SessionManager(redis);

    // Recover active sessions
    const recoveryService = new SessionRecoveryService(sessionManager);
    await recoveryService.recoverActiveSessions();

    // Start keepalive service
    const keepaliveService = new SessionKeepaliveService(sessionManager);
    keepaliveService.start();

    // Start stream consumer
    const consumer = new StreamConsumer(redis, sessionManager);
    await consumer.start();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      keepaliveService.stop();
      await consumer.stop();
      await sessionManager.shutdown();
      await closeRedis();

      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err: any) {
    logger.error('Failed to start engine', { error: err.message });
    process.exit(1);
  }
}

main();
```

### Library & Framework Requirements

**No new dependencies** - uses existing Node.js crypto module

**Environment Variables (add to .env):**
```bash
# Auth state encryption key (32 bytes hex)
AUTH_ENCRYPTION_KEY=your_32_byte_hex_key_here
```

### File Structure Requirements

**New Files:**
```
apps/engine/src/
├── whatsapp/
│   ├── auth-encryption.ts       # NEW: Auth state encryption
│   ├── session-recovery.ts      # NEW: Session recovery on startup
│   ├── session-keepalive.ts     # NEW: Keepalive service
│   └── session-manager.ts       # UPDATED: Add auto-reconnect logic
├── db/
│   └── supabase.ts              # NEW: Supabase client for Node.js
└── main.ts                      # UPDATED: Add recovery and keepalive
```

### Testing Requirements

**Node.js Tests:**
```typescript
// apps/engine/src/tests/test_session_recovery.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SessionRecoveryService } from '../whatsapp/session-recovery';

describe('SessionRecoveryService', () => {
  it('should recover all connected sessions on startup', async () => {
    const mockSessions = [
      { id: 'session-1', user_id: 'user-1', status: 'connected' },
      { id: 'session-2', user_id: 'user-2', status: 'connected' }
    ];

    const mockSessionManager = {
      restoreSession: vi.fn()
    };

    const service = new SessionRecoveryService(mockSessionManager as any);
    await service.recoverActiveSessions();

    expect(mockSessionManager.restoreSession).toHaveBeenCalledTimes(2);
  });

  it('should handle auth state not found gracefully', async () => {
    // Mock missing auth state
    const mockSessionManager = {
      restoreSession: vi.fn().mockRejectedValue(new Error('Auth state not found'))
    };

    const service = new SessionRecoveryService(mockSessionManager as any);
    await service.recoverActiveSessions();

    // Should not throw, should mark session as failed
  });
});

// apps/engine/src/tests/test_auto_reconnect.test.ts
describe('Auto-Reconnect', () => {
  it('should attempt reconnect with exponential backoff', async () => {
    const manager = new SessionManager(mockRedis);

    // Simulate disconnect
    await manager.attemptReconnect('test-session');

    // Check backoff delays: 1s, 2s, 4s, 8s, 16s
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('should NOT reconnect on loggedOut', async () => {
    const manager = new SessionManager(mockRedis);

    await manager.handleConnectionUpdate('test-session', {
      connection: 'close',
      lastDisconnect: {
        error: new Boom('Logged out', { statusCode: DisconnectReason.loggedOut })
      }
    });

    // Should delete auth state and NOT schedule reconnect
    expect(manager.reconnectAttempts.has('test-session')).toBe(false);
  });
});
```

### Project Structure Notes

**Dependencies:**
- Story 1.1: Requires Docker infrastructure
- Story 1.4: Requires Redis Streams
- Story 1.5: **CRITICAL** - Builds on session initialization

**Completes Epic 1:**
- This is the FINAL story of Epic 1
- After this, Epic 1 is 100% ready for implementation
- All foundation pieces are in place

**Prepares for:**
- Epic 2: Messaging features use persistent sessions
- Epic 3: Webhook events for reconnection status
- Epic 4: Rate limiting uses session health data

### References

**Primary Documents:**
- [epics.md#L180-L192](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L180-L192) - Story 1.6 complete context
- [architecture.md#L261-L263](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/architecture.md#L261-L263) - Auto-healing patches
- [project-context.md#L53-L56](file:///Users/apple/Documents/whatsappAPI/_bmad-output/project-context.md#L53-L56) - Baileys auth rules

**Functional Requirements:**
- FR7: Persistance Session - [epics.md#L27](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L27)
- FR9: Auto-Reconnexion - [epics.md#L29](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L29)
- NFR4: Auto-Healing - [epics.md#L64](file:///Users/apple/Documents/whatsappAPI/_bmad-output/planning-artifacts/epics.md#L64)

**Previous Stories:**
- [1-5-session-connection-qr-stream-sse.md](file:///Users/apple/Documents/whatsappAPI/_bmad-output/implementation-artifacts/1-5-session-connection-qr-stream-sse.md) - Session initialization

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
