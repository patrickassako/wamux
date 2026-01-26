import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { logger } from '../utils/logger.js';

export class LogoutHandler implements CommandHandler {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    async handle(payload: any): Promise<void> {
        const { session_id } = payload;

        logger.info({ sessionId: session_id }, 'Handling LOGOUT command');

        await this.sessionManager.logout(session_id);
    }
}
