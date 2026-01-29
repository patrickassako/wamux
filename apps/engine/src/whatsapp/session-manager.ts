import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { logger } from '../utils/logger.js';
import { getSupabaseClient } from '../db/supabase.js';
import { Redis } from 'ioredis';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { SessionSettings } from './types.js';

export class SessionManager {
    private sessions: Map<string, any> = new Map();
    private redis: Redis;
    private authDir: string;
    private reconnectAttempts: Map<string, number> = new Map();
    private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
    private settings: Map<string, SessionSettings> = new Map();
    private presenceIntervals: Map<string, NodeJS.Timeout> = new Map();
    private keepaliveTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(redis: Redis, authDir: string = './auth_state') {
        this.redis = redis;
        this.authDir = authDir;

        // Ensure auth directory exists
        if (!fs.existsSync(this.authDir)) {
            fs.mkdirSync(this.authDir, { recursive: true });
        }
    }

    /**
     * Get an active session socket
     */
    getSession(sessionId: string): any {
        return this.sessions.get(sessionId);
    }

    getSettings(sessionId: string): SessionSettings | undefined {
        return this.settings.get(sessionId);
    }

    /**
     * Initialize a new WhatsApp session
     */
    async initSession(sessionId: string, userId: string): Promise<void> {
        logger.info({ sessionId, userId }, 'Initializing WhatsApp session');

        try {
            // Setup auth state (persistent storage)
            const authFolder = path.join(this.authDir, sessionId);
            const { state, saveCreds } = await useMultiFileAuthState(authFolder);

            // Get latest Baileys version
            const { version } = await fetchLatestBaileysVersion();

            // Create WhatsApp socket with optimized settings for datacenter stability
            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false, // CRITICAL: Don't print to terminal
                logger: logger.child({ sessionId }) as any,
                browser: ['WhatsApp API Gateway', 'Chrome', '1.0.0'],

                // === STABILITY FIXES FOR 503 ERRORS ===
                // Don't mark as online immediately - reduces server load
                markOnlineOnConnect: false,
                // Don't sync full history - reduces bandwidth and server requests
                syncFullHistory: false,
                // Send keepalive ping every 25 seconds to maintain WebSocket connection
                keepAliveIntervalMs: 25000,
                // Delay between retry requests to avoid rate limiting
                retryRequestDelayMs: 2000,
                // Increase connection timeout for slower networks
                connectTimeoutMs: 60000,
                // Default timeout for queries
                defaultQueryTimeoutMs: 60000,
                // Emit only essential events to reduce processing
                emitOwnEvents: true,
                // Avoid generating link preview (reduces external requests)
                generateHighQualityLinkPreview: false,
            });

            // Store socket reference
            this.sessions.set(sessionId, sock);

            // Listen to connection updates
            sock.ev.on('connection.update', async (update) => {
                await this.handleConnectionUpdate(sessionId, update);
            });

            // Listen to credentials update (save auth state)
            sock.ev.on('creds.update', saveCreds);

            // Listen to messages (Story 3.4 & 3.6)
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                console.log(`[DEBUG] messages.upsert received: type=${type}, count=${messages.length}`);
                if (type === 'notify') {
                    for (const msg of messages) {
                        try {
                            // Story 3.4: Inbound Message Handling
                            const { InboundMessageHandler } = await import('../handlers/inbound-message-handler.js');
                            const inboundHandler = new InboundMessageHandler(this.redis);
                            await inboundHandler.handleMessage(sock, sessionId, msg);

                            // Story 3.6: Auto Read Messages
                            const settings = this.settings.get(sessionId);
                            if (settings?.auto_read_messages && msg.key.remoteJid && !msg.key.fromMe) {
                                await sock.readMessages([msg.key]);
                            }
                        } catch (error: any) {
                            console.error('[CRITICAL] Error in messages.upsert loop:', error);
                            if (error instanceof Error) {
                                console.error('Stack:', error.stack);
                            }
                            logger.error({ sessionId, error }, 'Error handling message');
                        }
                    }
                }
            });

            // Listen to calls (Story 3.6: Reject Calls)
            sock.ev.on('call', async (calls) => {
                const settings = this.settings.get(sessionId);
                if (settings?.reject_calls) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            await sock.rejectCall(call.id, call.from);
                            logger.info({ sessionId, callId: call.id, from: call.from }, 'Auto-rejected call');
                        }
                    }
                }
            });

            // Load settings
            await this.loadSessionSettings(sessionId);

            logger.info({ sessionId }, 'Session initialized successfully');

        } catch (error: any) {
            logger.error({ sessionId, error: error.message }, 'Failed to initialize session');

            await this.publishEvent('SESSION_FAILED', {
                session_id: sessionId,
                error: error.message
            });
        }
    }

    /**
     * Restore a session from existing auth state
     */
    async restoreSession(sessionId: string, userId: string): Promise<void> {
        logger.info({ sessionId }, 'Restoring session from auth state');

        // Check if auth state exists
        const authFolder = path.join(this.authDir, sessionId);
        const credsPath = path.join(authFolder, 'creds.json');

        if (!fs.existsSync(credsPath)) {
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

        // QR code generated
        if (qr) {
            logger.info({ sessionId }, 'QR code generated');

            // Convert QR to Base64 image
            const qrBase64 = await QRCode.toDataURL(qr);

            // Publish QR event to main events stream
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
            logger.info({ sessionId }, 'Session connected');

            // Reset reconnect attempts on successful connection
            this.reconnectAttempts.delete(sessionId);

            const sock = this.sessions.get(sessionId);
            const phoneNumber = sock?.user?.id?.split(':')[0] || 'unknown';

            // Update database status
            await this.updateSessionStatus(sessionId, 'connected', { phone_number: phoneNumber });

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

            // Start keepalive to maintain connection
            this.startKeepalive(sessionId);
        }

        // Connection closed
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const disconnectReason = statusCode as DisconnectReason;

            logger.info({
                sessionId,
                reason: DisconnectReason[disconnectReason] || 'unknown',
                statusCode
            }, 'Session disconnected');

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

                case DisconnectReason.restartRequired:
                    // Error 515 - WhatsApp requires restart (stream error)
                    // This is NOT a fatal error, just reconnect immediately
                    logger.warn({ sessionId }, 'Stream error (515) - restarting connection');
                    await this.attemptReconnect(sessionId);
                    break;

                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.timedOut:
                default:
                    // Network issues - attempt reconnect
                    await this.attemptReconnect(sessionId);
            }
        }
    }

    private async handleLoggedOut(sessionId: string): Promise<void> {
        logger.info({ sessionId }, 'Session logged out by user');

        // Stop keepalive
        this.stopKeepalive(sessionId);

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
            reason: 'logged_out',
            timestamp: new Date().toISOString()
        });
    }

    private async handleConnectionReplaced(sessionId: string): Promise<void> {
        logger.info({ sessionId }, 'Session replaced (logged in elsewhere)');

        // Stop keepalive
        this.stopKeepalive(sessionId);

        // Keep auth state (user might want to reconnect)
        this.sessions.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);

        await this.updateSessionStatus(sessionId, 'disconnected');

        await this.publishEvent('SESSION_DISCONNECTED', {
            session_id: sessionId,
            reason: 'connection_replaced',
            timestamp: new Date().toISOString()
        });
    }

    private async handleBadSession(sessionId: string): Promise<void> {
        logger.error({ sessionId }, 'Bad session detected - deleting auth state');

        // Stop keepalive
        this.stopKeepalive(sessionId);

        await this.deleteAuthState(sessionId);
        this.sessions.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);

        await this.updateSessionStatus(sessionId, 'failed');

        await this.publishEvent('SESSION_FAILED', {
            session_id: sessionId,
            reason: 'bad_session',
            timestamp: new Date().toISOString()
        });
    }

    private async attemptReconnect(sessionId: string): Promise<void> {
        const attempts = this.reconnectAttempts.get(sessionId) || 0;

        // Increased max attempts for 503 errors on datacenter IPs
        const MAX_RECONNECT_ATTEMPTS = 10;

        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.error({ sessionId, attempts }, 'Max reconnection attempts reached');

            await this.updateSessionStatus(sessionId, 'failed');
            await this.publishEvent('SESSION_FAILED', {
                session_id: sessionId,
                reason: 'max_reconnect_attempts',
                timestamp: new Date().toISOString()
            });

            this.reconnectAttempts.delete(sessionId);
            return;
        }

        // Exponential backoff with jitter: base 2s, max ~17 minutes
        // Adding jitter helps avoid thundering herd when WhatsApp servers recover
        const baseDelay = 2000; // 2 seconds base (increased from 1s)
        const exponentialDelay = Math.pow(2, attempts) * baseDelay;
        const jitter = Math.random() * 1000; // 0-1 second random jitter
        const delay = Math.min(exponentialDelay + jitter, 300000); // Cap at 5 minutes

        logger.info({
            sessionId,
            attempt: attempts + 1,
            delayMs: delay
        }, 'Scheduling reconnection attempt');

        this.reconnectAttempts.set(sessionId, attempts + 1);

        // Update status to connecting
        await this.updateSessionStatus(sessionId, 'connecting');

        // Schedule reconnection
        const timer = setTimeout(async () => {
            try {
                logger.info({
                    sessionId,
                    attempt: attempts + 1
                }, 'Attempting reconnection');

                // Get user_id from database
                const session = await this.getSessionFromDb(sessionId);
                if (!session) {
                    throw new Error('Session not found in database');
                }

                // Attempt to restore session
                await this.restoreSession(sessionId, session.user_id);

                // Reset attempts on success
                this.reconnectAttempts.delete(sessionId);

                logger.info({ sessionId }, 'Reconnection successful');

            } catch (err: any) {
                logger.error({
                    sessionId,
                    attempt: attempts + 1,
                    error: err.message
                }, 'Reconnection attempt failed');

                // Will trigger another reconnect attempt via connection.update
            }
        }, delay);

        this.reconnectTimers.set(sessionId, timer);
    }

    private async deleteAuthState(sessionId: string): Promise<void> {
        const authFolder = path.join(this.authDir, sessionId);

        try {
            fs.rmSync(authFolder, { recursive: true, force: true });
            logger.info({ sessionId }, 'Auth state deleted');
        } catch (err: any) {
            logger.error({ sessionId, error: err.message }, 'Failed to delete auth state');
        }
    }

    private async updateSessionStatus(
        sessionId: string,
        status: string,
        extra: Record<string, any> = {}
    ): Promise<void> {
        try {
            const supabase = getSupabaseClient();
            await supabase
                .from('sessions')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                    ...extra
                })
                .eq('id', sessionId);
        } catch (err: any) {
            logger.error({ sessionId, error: err.message }, 'Failed to update session status');
        }
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

    async logout(sessionId: string): Promise<void> {
        const sock = this.sessions.get(sessionId);

        if (!sock) {
            logger.warn({ sessionId }, 'Session not found for logout');
            // Still update the database status even if socket not found
            await this.updateSessionStatus(sessionId, 'disconnected');
            return;
        }

        try {
            await sock.logout();
            this.sessions.delete(sessionId);
            await this.deleteAuthState(sessionId);
            // Update database status to disconnected
            await this.updateSessionStatus(sessionId, 'disconnected');
            logger.info({ sessionId }, 'Session logged out successfully');
        } catch (error: any) {
            logger.error({ sessionId, error: error.message }, 'Failed to logout session');
            // Still try to update status on error
            await this.updateSessionStatus(sessionId, 'disconnected');
        }
    }

    /**
     * Graceful shutdown - close all sessions
     */
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
                    logger.info({ sessionId }, 'Session closed gracefully');
                } catch (err: any) {
                    logger.error({ sessionId, error: err.message }, 'Failed to close session');
                }
            }
        );

        await Promise.all(closePromises);

        logger.info('Session manager shutdown complete');
    }

    async loadSessionSettings(sessionId: string): Promise<void> {
        try {
            const supabase = getSupabaseClient();
            const { data } = await supabase
                .from('session_settings')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (data) {
                this.settings.set(sessionId, data);
                this.handleAlwaysOnline(sessionId, data.always_online);
            }
        } catch (error) {
            logger.error({ sessionId, error }, 'Failed to load session settings');
        }
    }

    async updateSettings(sessionId: string, newSettings: Partial<SessionSettings>): Promise<void> {
        const current = this.settings.get(sessionId) || {} as SessionSettings;
        const updated = { ...current, ...newSettings };
        this.settings.set(sessionId, updated);

        // Handle side effects
        if (newSettings.always_online !== undefined) {
            this.handleAlwaysOnline(sessionId, newSettings.always_online);
        }
    }

    private handleAlwaysOnline(sessionId: string, enabled: boolean): void {
        // Clear existing interval
        if (this.presenceIntervals.has(sessionId)) {
            clearInterval(this.presenceIntervals.get(sessionId)!);
            this.presenceIntervals.delete(sessionId);
        }

        if (enabled) {
            const sock = this.sessions.get(sessionId);
            if (sock) {
                // Send immediate presence
                sock.sendPresenceUpdate('available');
                logger.info({ sessionId }, 'Set presence to available');

                // Set interval to keep it alive every 30s
                const interval = setInterval(() => {
                    const s = this.sessions.get(sessionId);
                    if (s) {
                        s.sendPresenceUpdate('available');
                    } else {
                        clearInterval(interval);
                    }
                }, 30000);

                this.presenceIntervals.set(sessionId, interval);
            }
        }
    }

    /**
     * Start keepalive to maintain connection health
     * Pings WhatsApp every 30s and updates DB timestamp every 2 minutes
     */
    private startKeepalive(sessionId: string): void {
        // Clear any existing keepalive
        this.stopKeepalive(sessionId);

        const sock = this.sessions.get(sessionId);
        if (!sock) return;

        logger.info({ sessionId }, 'Starting keepalive');

        let updateCounter = 0;

        const keepaliveInterval = setInterval(async () => {
            const s = this.sessions.get(sessionId);

            if (!s) {
                // Session no longer exists, clear interval
                clearInterval(keepaliveInterval);
                this.keepaliveTimers.delete(sessionId);
                return;
            }

            try {
                // Send presence update to keep connection alive
                await s.sendPresenceUpdate('available');

                // Update DB timestamp every 2 minutes (4 * 30s = 2 minutes)
                updateCounter++;
                if (updateCounter >= 4) {
                    updateCounter = 0;
                    await this.updateSessionLastActive(sessionId);
                }
            } catch (error: any) {
                logger.error({ sessionId, error: error.message }, 'Keepalive ping failed');
            }
        }, 30000); // 30 seconds

        this.keepaliveTimers.set(sessionId, keepaliveInterval);
    }

    /**
     * Stop keepalive for a session
     */
    private stopKeepalive(sessionId: string): void {
        const existing = this.keepaliveTimers.get(sessionId);
        if (existing) {
            clearInterval(existing);
            this.keepaliveTimers.delete(sessionId);
            logger.info({ sessionId }, 'Stopped keepalive');
        }
    }

    /**
     * Update session last_active timestamp in database
     */
    private async updateSessionLastActive(sessionId: string): Promise<void> {
        try {
            const supabase = getSupabaseClient();
            await supabase
                .from('whatsapp_sessions')
                .update({ last_active: new Date().toISOString() })
                .eq('id', sessionId);
        } catch (error: any) {
            logger.error({ sessionId, error: error.message }, 'Failed to update last_active');
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

        const envelopeJson = JSON.stringify(envelope);

        // Publish to main events stream (for logging/processing)
        await this.redis.xadd(
            'whatsapp:events',
            'MAXLEN',
            '~',
            '10000',
            '*',
            'data',
            envelopeJson
        );

        // ALSO publish to session-specific Pub/Sub channel for SSE
        if (payload.session_id) {
            const channel = `session:${payload.session_id}:events`;
            await this.redis.publish(channel, envelopeJson);
            logger.info({ sessionId: payload.session_id, eventType, channel }, 'Event published to Pub/Sub');
        }
    }
}
