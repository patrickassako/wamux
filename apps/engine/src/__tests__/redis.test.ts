/**
 * Tests for Redis connection
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';

describe('Redis Connection', () => {
    let redis: Redis;

    beforeEach(() => {
        // Mock Redis for testing
        redis = new Redis({
            host: process.env.ENGINE_REDIS_HOST || 'localhost',
            port: parseInt(process.env.ENGINE_REDIS_PORT || '6379', 10),
            lazyConnect: true,
        });
    });

    afterEach(async () => {
        if (redis) {
            await redis.quit();
        }
    });

    it('should create Redis client successfully', () => {
        expect(redis).toBeDefined();
        expect(redis).toBeInstanceOf(Redis);
    });

    it('should have correct configuration', () => {
        const options = redis.options;
        expect(options.host).toBe(process.env.ENGINE_REDIS_HOST || 'localhost');
        expect(options.port).toBe(parseInt(process.env.ENGINE_REDIS_PORT || '6379', 10));
    });

    it('should handle connection with retry strategy', () => {
        const retryStrategy = redis.options.retryStrategy;
        expect(retryStrategy).toBeDefined();

        if (retryStrategy) {
            // Test retry delay calculation
            const delay1 = retryStrategy(1);
            const delay2 = retryStrategy(2);

            expect(delay1).toBeGreaterThan(0);
            expect(delay2).toBeGreaterThan(delay1);
        }
    });
});
