import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { CommandRouter } from '../handlers/command-router.js';

export class StreamConsumer {
    private redis: Redis;
    private consumerGroup: string;
    private consumerName: string;
    private streamName: string;
    private router: CommandRouter;
    private isRunning: boolean = false;

    constructor(
        redis: Redis,
        router: CommandRouter,
        streamName: string = 'whatsapp:commands',
        consumerGroup: string = 'engine-workers',
        consumerName: string = `worker-${process.pid}`
    ) {
        this.redis = redis;
        this.streamName = streamName;
        this.consumerGroup = consumerGroup;
        this.consumerName = consumerName;
        this.router = router;
    }

    async start(): Promise<void> {
        // Create consumer group if it doesn't exist
        try {
            await this.redis.xgroup(
                'CREATE',
                this.streamName,
                this.consumerGroup,
                '0',
                'MKSTREAM'
            );
            logger.info(`Created consumer group: ${this.consumerGroup}`);
        } catch (err: any) {
            if (!err.message.includes('BUSYGROUP')) {
                throw err;
            }
            logger.info(`Consumer group already exists: ${this.consumerGroup}`);
        }

        this.isRunning = true;
        logger.info(`Stream consumer started: ${this.consumerName}`);

        // Start consuming
        await this.consume();
    }

    async stop(): Promise<void> {
        this.isRunning = false;
        logger.info(`Stream consumer stopped: ${this.consumerName}`);
    }

    private async consume(): Promise<void> {
        while (this.isRunning) {
            try {
                // Read from stream (XREADGROUP)
                const results = await this.redis.xreadgroup(
                    'GROUP',
                    this.consumerGroup,
                    this.consumerName,
                    'COUNT',
                    10,
                    'BLOCK',
                    1000,
                    'STREAMS',
                    this.streamName,
                    '>'
                ) as any; // Cast to any to handle ioredis type complexity

                if (!results || results.length === 0) {
                    continue;
                }

                // Process messages
                for (const [_stream, messages] of results) {
                    for (const [messageId, fields] of messages as any) {
                        await this.processMessage(messageId, fields);
                    }
                }
            } catch (err: any) {
                logger.error({
                    error: err.message,
                    stream: this.streamName
                }, 'Error consuming stream');
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private async processMessage(messageId: string, fields: string[]): Promise<void> {
        const startTime = Date.now();

        try {
            // Extract JSON data
            const dataIndex = fields.indexOf('data');
            if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
                throw new Error('Invalid message format: missing data field');
            }

            const jsonData = fields[dataIndex + 1] as string; // Assert string
            const envelope = JSON.parse(jsonData);

            logger.info({
                messageId,
                envelopeId: envelope.id,
                type: envelope.type
            }, 'Processing command');

            // Validate envelope structure
            if (!envelope.id || !envelope.type || !envelope.payload) {
                throw new Error('Invalid envelope structure');
            }

            // Route to appropriate handler
            await this.router.route(envelope);

            // Acknowledge message (XACK)
            await this.redis.xack(this.streamName, this.consumerGroup, messageId);

            const processingTime = Date.now() - startTime;
            logger.info({
                messageId,
                type: envelope.type,
                processingTime
            }, 'Command processed successfully');

        } catch (err: any) {
            logger.error({
                messageId,
                error: err.message
            }, 'Failed to process message');

            // Publish to error stream
            await this.publishError(messageId, err.message, fields);

            // Still acknowledge to prevent reprocessing
            await this.redis.xack(this.streamName, this.consumerGroup, messageId);
        }
    }

    private async publishError(
        messageId: string,
        error: string,
        originalFields: string[]
    ): Promise<void> {
        try {
            const errorPayload = {
                message_id: messageId,
                error,
                original_data: originalFields,
                timestamp: new Date().toISOString()
            };

            await this.redis.xadd(
                'whatsapp:errors',
                'MAXLEN',
                '~',
                '1000',
                '*',
                'data',
                JSON.stringify(errorPayload)
            );
        } catch (err: any) {
            logger.fatal({ error: err.message }, 'Failed to publish error');
        }
    }
}
