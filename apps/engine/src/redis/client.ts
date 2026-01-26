import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export async function getRedisClient(): Promise<Redis> {
    if (!redisClient) {
        // Resolve Host: Check specific, then standard (Redis), then Railway convention (REDISHOST)
        const host = process.env.ENGINE_REDIS_HOST || process.env.REDIS_HOST || process.env.REDISHOST || 'localhost';

        // Resolve Port: Check specific, then standard, then Railway convention
        const port = process.env.ENGINE_REDIS_PORT || process.env.REDIS_PORT || process.env.REDISPORT || '6379';

        // Resolve Password: Check specific, then standard, then Railway convention
        const password = process.env.ENGINE_REDIS_PASSWORD || process.env.REDIS_PASSWORD || process.env.REDISPASSWORD;

        // Check if REDIS_URL is strictly provided
        const connectionUrl = process.env.REDIS_URL || `redis://${host}:${port}`;

        logger.info({
            host,
            port,
            usingRedisUrl: !!process.env.REDIS_URL,
            hasPassword: !!password,
            connectionUrlMatchesHost: connectionUrl.includes(host)
        }, 'Initializing Redis connection');

        // Pass explicit undefined for password if it's empty string to avoid empty password auth attempt if not needed
        const redisOptions: any = {
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
                return delay;
            },
            reconnectOnError: (err: Error) => {
                logger.error({ err }, 'Redis connection error (reconnect)');
                return true;
            }
        };

        if (password) {
            redisOptions.password = password;
        }

        redisClient = new Redis(connectionUrl, redisOptions);

        redisClient.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        redisClient.on('error', (err) => {
            logger.error({ err }, 'Redis client error');
        });
    }

    return redisClient;
}

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
