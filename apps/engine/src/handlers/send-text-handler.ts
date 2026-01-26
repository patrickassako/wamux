import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { messageStatusService } from '../services/message-status-service.js';
import { logger } from '../utils/logger.js';
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

        logger.info({
            messageId: message_id,
            sessionId: session_id,
            to
        }, 'Handling SEND_TEXT command');

        try {
            // Get active socket
            const sock = this.sessionManager.getSession(session_id);

            if (!sock) {
                throw new Error(`Session not found or not connected: ${session_id}`);
            }

            // Format phone to WhatsApp JID
            const jid = this.formatToJID(to);

            // Get session settings
            const settings = this.sessionManager.getSettings(session_id);
            const rateLimit = settings?.rate_limit_per_minute || 60; // Default to 60 if missing

            // Check Rate Limit
            const RateLimiter = (await import('../services/rate-limiter.js')).RateLimiter;
            const rateLimiter = new RateLimiter(this.redis);

            const allowed = await rateLimiter.checkLimit(session_id, rateLimit);
            if (!allowed) {
                logger.warn({ session_id, rateLimit }, 'Rate limit exceeded, rejecting message');
                throw new Error(`Rate limit exceeded (${rateLimit} msgs/min). Please try again later.`);
            }

            const shouldType = settings?.typing_indicator ?? true; // Default to true if not set
            const linkPreview = settings?.link_preview ?? true;

            // Handle Typing Indicator
            if (shouldType) {
                await sock.sendPresenceUpdate('composing', jid);
                // Simulate typing delay (500ms - 1500ms)
                const delay = Math.floor(Math.random() * 1000) + 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                await sock.sendPresenceUpdate('paused', jid);
            }

            // Send message via Baileys
            const result = await sock.sendMessage(jid, {
                text: message,
                linkPreview: linkPreview ? undefined : null // null or undefined to disable/enable might vary, but Baileys usually respects this structure or specific linkPreview object
            });

            logger.info({
                messageId: message_id,
                whatsappMessageId: result.key.id
            }, 'Message sent successfully');

            // Update message status in database
            await messageStatusService.markSent(message_id, result.key.id);

            // Publish MESSAGE_SENT event
            await this.publishEvent('MESSAGE_SENT', {
                message_id,
                session_id,
                whatsapp_message_id: result.key.id,
                sent_at: new Date().toISOString()
            });

        } catch (error: any) {
            logger.error({
                messageId: message_id,
                error: error.message
            }, 'Failed to send message');

            // Update message status in database
            await messageStatusService.markFailed(message_id, error.message);

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
