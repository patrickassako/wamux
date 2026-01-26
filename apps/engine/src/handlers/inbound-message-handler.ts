/**
 * Inbound Message Handler
 * 
 * Handles incoming WhatsApp messages from Baileys,
 * formats them into clean JSON, and publishes to webhook events.
 */
import { WAMessage, WASocket, downloadMediaMessage } from '@whiskeysockets/baileys';
import { getEventPublisher } from '../events/event-publisher.js';
import { Redis } from 'ioredis';

interface FormattedMessage {
    message_id: string;
    from: string;
    to: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'reaction' | 'unknown';
    body: string | null;
    caption: string | null;
    timestamp: string;
    is_group: boolean;
    group_id: string | null;
    group_name: string | null;
    sender_name: string | null;
    quoted_message_id: string | null;
    media?: {
        mimetype: string | null;
        filename: string | null;
        size: number | null;
        url?: string;
        base64?: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    reaction?: {
        emoji: string;
        target_message_id: string;
    };
}

export class InboundMessageHandler {
    private redis: Redis;
    private includeMediaBase64: boolean;

    constructor(redis: Redis, options?: { includeMediaBase64?: boolean }) {
        this.redis = redis;
        this.includeMediaBase64 = options?.includeMediaBase64 ?? false;
    }

    /**
     * Process an incoming message from Baileys
     */
    async handleMessage(
        socket: WASocket,
        sessionId: string,
        message: WAMessage
    ): Promise<FormattedMessage | null> {
        try {
            // Filter out status broadcasts unless explicitly enabled
            const key = message.key;
            if (key.remoteJid === 'status@broadcast') {
                console.log(`[InboundHandler] Filtered status broadcast for session ${sessionId}`);
                return null;
            }

            // Skip our own messages (outbound)
            if (key.fromMe) {
                return null;
            }

            // Format the message
            const formatted = await this.formatMessage(socket, sessionId, message);

            // Publish to event stream
            const publisher = getEventPublisher(this.redis);
            await publisher.messageReceived(sessionId, {
                id: formatted.message_id,
                from: formatted.from,
                to: formatted.to,
                type: formatted.type,
                content: formatted.body || formatted.caption || '',
                timestamp: new Date(formatted.timestamp),
                isGroup: formatted.is_group,
                groupId: formatted.group_id || undefined,
            });

            console.log(`[InboundHandler] Processed ${formatted.type} message from ${formatted.from}`);

            return formatted;

        } catch (error) {
            console.error(`[InboundHandler] Error processing message:`, error);
            return null;
        }
    }

    /**
     * Format a Baileys message into clean JSON
     */
    private async formatMessage(
        _socket: WASocket,
        sessionId: string,
        message: WAMessage
    ): Promise<FormattedMessage> {
        const key = message.key;
        const content = message.message;
        const pushName = message.pushName;

        // Determine if group message
        const isGroup = key.remoteJid?.endsWith('@g.us') ?? false;
        const groupId = isGroup ? key.remoteJid : null;

        // Get sender info
        const from = isGroup
            ? (key.participant || key.remoteJid || 'unknown')
            : (key.remoteJid || 'unknown');

        // Clean phone number (remove @s.whatsapp.net)
        const cleanFrom = from.replace('@s.whatsapp.net', '').replace('@g.us', '');

        // Base formatted message
        const formatted: FormattedMessage = {
            message_id: key.id || `msg_${Date.now()}`,
            from: cleanFrom,
            to: sessionId,
            type: 'unknown',
            body: null,
            caption: null,
            timestamp: new Date(message.messageTimestamp as number * 1000).toISOString(),
            is_group: isGroup,
            group_id: groupId?.replace('@g.us', '') || null,
            group_name: null,
            sender_name: pushName || null,
            quoted_message_id: null,
        };

        // Get quoted message if exists
        const contextInfo = this.getContextInfo(content);
        if (contextInfo?.quotedMessage) {
            formatted.quoted_message_id = contextInfo.stanzaId || null;
        }

        // Parse message content by type
        if (content?.conversation) {
            formatted.type = 'text';
            formatted.body = content.conversation;
        }
        else if (content?.extendedTextMessage) {
            formatted.type = 'text';
            formatted.body = content.extendedTextMessage.text || null;
        }
        else if (content?.imageMessage) {
            formatted.type = 'image';
            formatted.caption = content.imageMessage.caption || null;
            formatted.media = {
                mimetype: content.imageMessage.mimetype || null,
                filename: null,
                size: content.imageMessage.fileLength as number || null,
            };

            // Download media if configured
            if (this.includeMediaBase64) {
                try {
                    const buffer = await downloadMediaMessage(message, 'buffer', {});
                    formatted.media.base64 = (buffer as Buffer).toString('base64');
                } catch (e) {
                    console.error('[InboundHandler] Failed to download image:', e);
                }
            }
        }
        else if (content?.videoMessage) {
            formatted.type = 'video';
            formatted.caption = content.videoMessage.caption || null;
            formatted.media = {
                mimetype: content.videoMessage.mimetype || null,
                filename: null,
                size: content.videoMessage.fileLength as number || null,
            };
        }
        else if (content?.audioMessage) {
            formatted.type = 'audio';
            formatted.media = {
                mimetype: content.audioMessage.mimetype || null,
                filename: null,
                size: content.audioMessage.fileLength as number || null,
            };
        }
        else if (content?.documentMessage) {
            formatted.type = 'document';
            formatted.caption = content.documentMessage.caption || null;
            formatted.media = {
                mimetype: content.documentMessage.mimetype || null,
                filename: content.documentMessage.fileName || null,
                size: content.documentMessage.fileLength as number || null,
            };
        }
        else if (content?.stickerMessage) {
            formatted.type = 'sticker';
            formatted.media = {
                mimetype: content.stickerMessage.mimetype || null,
                filename: null,
                size: content.stickerMessage.fileLength as number || null,
            };
        }
        else if (content?.locationMessage) {
            formatted.type = 'location';
            formatted.location = {
                latitude: content.locationMessage.degreesLatitude || 0,
                longitude: content.locationMessage.degreesLongitude || 0,
                name: content.locationMessage.name || undefined,
                address: content.locationMessage.address || undefined,
            };
        }
        else if (content?.contactMessage) {
            formatted.type = 'contact';
            formatted.body = content.contactMessage.displayName || null;
        }
        else if (content?.reactionMessage) {
            formatted.type = 'reaction';
            formatted.reaction = {
                emoji: content.reactionMessage.text || '',
                target_message_id: content.reactionMessage.key?.id || '',
            };
        }

        return formatted;
    }

    /**
     * Extract context info from message content
     */
    private getContextInfo(content: WAMessage['message']): any {
        if (!content) return null;

        // Check various message types for contextInfo
        return content.extendedTextMessage?.contextInfo
            || content.imageMessage?.contextInfo
            || content.videoMessage?.contextInfo
            || content.audioMessage?.contextInfo
            || content.documentMessage?.contextInfo
            || null;
    }
}
