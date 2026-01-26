import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export async function getRedisClient(): Promise<Redis> {
    if (!redisClient) {
        const host = process.env.ENGINE_REDIS_HOST || 'localhost';
        const port = process.env.ENGINE_REDIS_PORT || '6379';
        const url = process.env.REDIS_URL || `redis://${host}:${port}`;

        redisClient = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
                return delay;
            },
            reconnectOnError: (err: Error) => {
                logger.error({ error: err.message }, 'Redis connection error');
                return true;
            }
        });

        redisClient.on('connect', () => {
            logger.info('Redis connected successfully');
        });

        redisClient.on('error', (err) => {
            logger.error({ error: err.message }, 'Redis client error');
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
