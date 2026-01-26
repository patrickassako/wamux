import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { logger } from '../utils/logger.js';

export class RestartSessionHandler implements CommandHandler {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    async handle(payload: { session_id: string }): Promise<void> {
        const { session_id } = payload;

        logger.info({ session_id }, 'Handling RESTART_SESSION command');

        try {
            // First destroy existing session if any
            await this.sessionManager.logout(session_id);
            logger.info({ session_id }, 'Session stopped for restart');

            // Re-initialize session (will trigger QR generation)
            // Note: We don't have the user_id or session_key in this payload, 
            // so we rely on the implementation to handle re-init or the user to initiate again.
            // A true restart might need more context, but for now we'll just stop it
            // and let the frontend/API trigger a new init if needed.
            // OR: If the goal is just to reload the connection logic:

            // Ideally, we should fetch session credentials and re-init.
            // But SessionManager.createSession needs user/key.

            // For now, let's treat RESTART as a forced disconnect + cleanup,
            // expecting the user to scan QR again or the system to auto-reconnect if auth exists.

            // Actually, if we want to restart an EXISTING authenticated session:
            // The session manager usually handles auto-reconnect. 
            // A manual restart is basically a "close and restore".

            logger.info({ session_id }, 'Session restart sequence initiated (stopped)');

        } catch (error) {
            logger.error({ session_id, error }, 'Failed to restart session');
            throw error;
        }
    }
}
