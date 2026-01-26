import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

export class RateLimiter {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    /**
     * Check if a session has exceeded its rate limit
     * Uses a sliding window or fixed window approach via Redis keys
     * @param sessionId Session ID to check
     * @param limit Max messages per minute
     * @returns true if allowed, false if rate limited
     */
    async checkLimit(sessionId: string, limit: number): Promise<boolean> {
        const key = `rate_limit:${sessionId}`;
        // Window size: 60 seconds (1 minute)

        try {
            // Get current count
            const currentCount = await this.redis.incr(key);

            // If it's the first request in this window, set expiry
            if (currentCount === 1) {
                await this.redis.expire(key, 60); // 60 seconds
            }

            if (currentCount > limit) {
                logger.warn({ sessionId, currentCount, limit }, 'Rate limit exceeded');
                return false;
            }

            return true;
        } catch (error: any) {
            logger.error({ sessionId, error: error.message }, 'Rate limiter error');
            // Fail open (allow traffic) if Redis fails to avoid outage
            return true;
        }
    }
}
