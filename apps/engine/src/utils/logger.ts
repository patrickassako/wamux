import pino from 'pino';

// Initialize logger
export const logger = pino({
    level: process.env.ENGINE_LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});
