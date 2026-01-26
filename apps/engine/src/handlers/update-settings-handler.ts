import { CommandHandler } from './command-router.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { logger } from '../utils/logger.js';

interface UpdateSettingsPayload {
    session_id: string;
    settings: any;
}

export class UpdateSettingsHandler implements CommandHandler<UpdateSettingsPayload> {
    constructor(private sessionManager: SessionManager) { }

    async handle(payload: UpdateSettingsPayload): Promise<void> {
        const { session_id, settings } = payload;

        logger.info({ sessionId: session_id, settings }, 'Updating session settings');

        await this.sessionManager.updateSettings(session_id, settings);
    }
}
