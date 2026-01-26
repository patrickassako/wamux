import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { logger } from '../utils/logger.js';

export class InitSessionHandler implements CommandHandler {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    async handle(payload: any): Promise<void> {
        const { session_id, user_id } = payload;

        logger.info({
            sessionId: session_id,
            userId: user_id
        }, 'Handling INIT_SESSION command');

        await this.sessionManager.initSession(session_id, user_id);
    }
}
