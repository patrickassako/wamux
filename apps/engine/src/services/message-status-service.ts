import { getSupabaseClient } from '../db/supabase.js';
import { logger } from '../utils/logger.js';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageStatusUpdate {
    message_id: string;
    status: MessageStatus;
    whatsapp_message_id?: string;
    error_message?: string;
    sent_at?: string;
    delivered_at?: string;
    read_at?: string;
}

/**
 * Service to update message status in Supabase database
 */
export class MessageStatusService {

    /**
     * Update message status in the database
     */
    async updateStatus(update: MessageStatusUpdate): Promise<boolean> {
        const supabase = getSupabaseClient();

        try {
            const updateData: Record<string, any> = {
                status: update.status
            };

            if (update.whatsapp_message_id) {
                updateData.whatsapp_message_id = update.whatsapp_message_id;
            }

            if (update.error_message) {
                updateData.error_message = update.error_message;
            }

            if (update.sent_at) {
                updateData.sent_at = update.sent_at;
            }

            if (update.delivered_at) {
                updateData.delivered_at = update.delivered_at;
            }

            if (update.read_at) {
                updateData.read_at = update.read_at;
            }

            const { error } = await supabase
                .from('messages')
                .update(updateData)
                .eq('id', update.message_id);

            if (error) {
                logger.error({ error, messageId: update.message_id }, 'Failed to update message status');
                return false;
            }

            logger.info({ messageId: update.message_id, status: update.status }, 'Message status updated');
            return true;

        } catch (error: any) {
            logger.error({ error: error.message, messageId: update.message_id }, 'Error updating message status');
            return false;
        }
    }

    /**
     * Mark message as sent
     */
    async markSent(messageId: string, whatsappMessageId: string): Promise<boolean> {
        return this.updateStatus({
            message_id: messageId,
            status: 'sent',
            whatsapp_message_id: whatsappMessageId,
            sent_at: new Date().toISOString()
        });
    }

    /**
     * Mark message as failed
     */
    async markFailed(messageId: string, errorMessage: string): Promise<boolean> {
        return this.updateStatus({
            message_id: messageId,
            status: 'failed',
            error_message: errorMessage
        });
    }

    /**
     * Mark message as delivered
     */
    async markDelivered(messageId: string): Promise<boolean> {
        return this.updateStatus({
            message_id: messageId,
            status: 'delivered',
            delivered_at: new Date().toISOString()
        });
    }

    /**
     * Mark message as read
     */
    async markRead(messageId: string): Promise<boolean> {
        return this.updateStatus({
            message_id: messageId,
            status: 'read',
            read_at: new Date().toISOString()
        });
    }
}

// Export singleton instance
export const messageStatusService = new MessageStatusService();
