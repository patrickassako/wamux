import { SessionManager } from '../whatsapp/session-manager.js';
import { mediaDownloader, MediaType, validateMediaUrl } from '../media/index.js';
import { messageStatusService } from '../services/message-status-service.js';
import { Redis } from 'ioredis';

interface SendMediaPayload {
    message_id: string;
    session_id: string;
    to: string;
    media_url: string;
    media_type: MediaType;
    caption?: string;
    filename?: string;
    ptt?: boolean;  // Push-to-talk: true for voice notes
}

/**
 * Handler for sending media messages (image, video, audio)
 */
export class SendMediaHandler {
    constructor(
        private sessionManager: SessionManager,
        private redis: Redis
    ) { }

    async handle(payload: SendMediaPayload): Promise<void> {
        const { message_id, session_id, to, media_url, media_type, caption, ptt } = payload;

        console.log(`[SendMediaHandler] Processing ${media_type} message:`, message_id);

        try {
            // Get the socket for this session
            const socket = this.sessionManager.getSession(session_id);
            if (!socket) {
                throw new Error(`No active socket for session: ${session_id}`);
            }

            // Validate the URL first
            const validation = await validateMediaUrl(media_url, media_type);
            if (!validation.valid) {
                throw new Error(`Invalid media URL: ${validation.error}`);
            }

            // Download the media
            const downloadResult = await mediaDownloader.downloadFromUrl(
                media_url,
                media_type,
                session_id
            );

            // Format the WhatsApp JID
            const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

            // Prepare message based on media type
            let message: any;

            switch (media_type) {
                case 'image':
                    message = {
                        image: downloadResult.buffer,
                        caption: caption || undefined,
                        mimetype: downloadResult.mimeType
                    };
                    break;

                case 'video':
                    message = {
                        video: downloadResult.buffer,
                        caption: caption || undefined,
                        mimetype: downloadResult.mimeType
                    };
                    break;

                case 'audio':
                    message = {
                        audio: downloadResult.buffer,
                        mimetype: downloadResult.mimeType,
                        ptt: ptt ?? false  // Use ptt from payload, default false
                    };
                    break;

                default:
                    throw new Error(`Unsupported media type: ${media_type}`);
            }

            // Send via Baileys
            const result = await socket.sendMessage(jid, message);

            console.log(`[SendMediaHandler] ${media_type} sent successfully:`, result?.key?.id);

            // Update message status in database
            await this.updateMessageStatus(message_id, 'sent', result?.key?.id);

            // Cleanup temp file
            await mediaDownloader.cleanup(downloadResult.tempPath);

            // Publish success event
            await this.publishEvent(session_id, 'MESSAGE_SENT', {
                message_id,
                whatsapp_message_id: result?.key?.id,
                media_type,
                size: downloadResult.size
            });

        } catch (error: any) {
            console.error(`[SendMediaHandler] Failed to send ${media_type}:`, error.message);

            // Update message status to failed
            await this.updateMessageStatus(message_id, 'failed', undefined, error.message);

            // Publish failure event
            await this.publishEvent(session_id, 'MESSAGE_FAILED', {
                message_id,
                error: error.message,
                media_type
            });
        }
    }

    private async updateMessageStatus(
        messageId: string,
        status: string,
        whatsappMessageId?: string,
        errorMessage?: string
    ): Promise<void> {
        try {
            // Update message status in database via service
            if (status === 'sent' && whatsappMessageId) {
                await messageStatusService.markSent(messageId, whatsappMessageId);
            } else if (status === 'failed') {
                await messageStatusService.markFailed(messageId, errorMessage || 'Unknown error');
            }
        } catch (error) {
            console.error('[SendMediaHandler] Failed to update message status:', error);
        }
    }

    private async publishEvent(
        sessionId: string,
        eventType: string,
        data: any
    ): Promise<void> {
        try {
            await this.redis.xadd(
                'whatsapp:events',
                '*',
                'type', eventType,
                'session_id', sessionId,
                'data', JSON.stringify(data),
                'timestamp', new Date().toISOString()
            );
        } catch (error) {
            console.error('[SendMediaHandler] Failed to publish event:', error);
        }
    }
}
