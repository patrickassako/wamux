import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { logger } from '../utils/logger.js';

export class DisconnectSessionHandler implements CommandHandler {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    async handle(payload: { session_id: string; reason?: string }): Promise<void> {
        const { session_id, reason } = payload;

        logger.info({ session_id, reason }, 'Handling DISCONNECT_SESSION command');

        try {
            await this.sessionManager.logout(session_id);
            logger.info({ session_id }, 'Session disconnected successfully');
        } catch (error) {
            logger.error({ session_id, error }, 'Failed to disconnect session');
            throw error;
        }
    }
}
