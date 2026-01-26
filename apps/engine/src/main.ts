/**
 * WhatsApp Engine - Main Entry Point
 * Manages Redis Stream consumption and WhatsApp socket connections
 */
import { getRedisClient, closeRedis } from './redis/client.js';
import { StreamConsumer } from './redis/stream-consumer.js';
import { CommandRouter } from './handlers/command-router.js';
import { SessionManager } from './whatsapp/session-manager.js';
import { SessionRecoveryService } from './whatsapp/session-recovery.js';
import { cleanupService } from './media/cleanup.js';
import { logger } from './utils/logger.js';

/**
 * Main application startup
 */
async function main(): Promise<void> {
    try {
        logger.info('🚀 WhatsApp Engine starting...');

        // Initialize Redis
        const redis = await getRedisClient();

        // Initialize Session Manager
        logger.info('📱 Initializing Session Manager...');
        const sessionManager = new SessionManager(redis, './auth_state');

        // Recover active sessions from database
        logger.info('🔄 Recovering active sessions...');
        const recoveryService = new SessionRecoveryService(sessionManager);
        await recoveryService.recoverActiveSessions();

        // Initialize Command Router with SessionManager and Redis
        const router = new CommandRouter(sessionManager, redis);

        // Start stream consumer
        logger.info('📡 Initializing Command Consumer...');
        const consumer = new StreamConsumer(redis, router);
        await consumer.start();

        // Start media cleanup service (hourly cleanup)
        logger.info('🧹 Starting Media Cleanup Service...');
        cleanupService.start();

        logger.info('✅ WhatsApp Engine ready');

        // Graceful shutdown handler
        const shutdown = async (signal: string) => {
            logger.info(`${signal} received. Shutting down gracefully...`);
            try {
                cleanupService.stop();
                await consumer.stop();
                await sessionManager.shutdown();
                await closeRedis();
                logger.info('✅ Shutdown complete');
                process.exit(0);
            } catch (error) {
                logger.error({ error }, '❌ Error during shutdown');
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error({ error }, '❌ Failed to start WhatsApp Engine');
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.fatal({ error }, '❌ Uncaught exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, '❌ Unhandled rejection');
    process.exit(1);
});

// Start the application
main();
