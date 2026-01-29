import { SessionManager } from './session-manager.js';
import { getSupabaseClient } from '../db/supabase.js';
import { logger } from '../utils/logger.js';

export class SessionRecoveryService {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    async recoverActiveSessions(): Promise<void> {
        logger.info('Starting session recovery...');

        try {
            // Query all connected sessions from database
            const supabase = getSupabaseClient();
            const { data: sessions, error } = await supabase
                .from('sessions')
                .select('*')
                .in('status', ['connected', 'connecting']);

            if (error) {
                throw error;
            }

            logger.info({ count: sessions?.length || 0 }, 'Found sessions to recover');

            // Restore each session
            for (const session of sessions || []) {
                try {
                    await this.sessionManager.restoreSession(
                        session.id,
                        session.user_id
                    );
                    logger.info({ sessionId: session.id }, 'Session recovered successfully');
                } catch (err: any) {
                    logger.error({
                        sessionId: session.id,
                        error: err.message
                    }, 'Failed to recover session');

                    // Mark session as failed
                    await supabase
                        .from('sessions')
                        .update({ status: 'failed' })
                        .eq('id', session.id);
                }
            }

            logger.info('Session recovery completed');
        } catch (err: any) {
            logger.error({ error: err.message }, 'Session recovery failed');
        }
    }
}
