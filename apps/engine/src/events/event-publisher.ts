/**
 * Event Publisher Service
 * 
 * Publishes webhook events to Redis stream for the Python dispatcher to consume.
 */
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { WebhookEventType } from './event-types.js';

interface WebhookEventPayload {
    session_id: string;
    [key: string]: any;
}

interface PublishedEvent {
    id: string;
    type: WebhookEventType;
    timestamp: string;
    payload: WebhookEventPayload;
}

export class EventPublisher {
    private redis: Redis;
    private streamKey = 'whatsapp:events';

    constructor(redis: Redis) {
        this.redis = redis;
    }

    /**
     * Publish an event to the Redis stream for webhook dispatch
     */
    async publish(
        eventType: WebhookEventType,
        payload: WebhookEventPayload
    ): Promise<string> {
        const event: PublishedEvent = {
            id: randomUUID(),
            type: eventType,
            timestamp: new Date().toISOString(),
            payload,
        };

        const messageId = await this.redis.xadd(
            this.streamKey,
            '*',
            'data',
            JSON.stringify(event)
        );

        console.log(`[EventPublisher] Published ${eventType}: ${messageId}`);

        return messageId || event.id;
    }

    /**
     * Publish message sent event
     */
    async messageReceived(
        sessionId: string,
        message: {
            id: string;
            from: string;
            to: string;
            type: string;
            content: string;
            timestamp: Date;
            isGroup: boolean;
            groupId?: string;
        }
    ): Promise<void> {
        const eventType = message.isGroup
            ? 'message.received.group'
            : 'message.received.personal';

        await this.publish(eventType as WebhookEventType, {
            session_id: sessionId,
            message_id: message.id,
            from: message.from,
            to: message.to,
            type: message.type,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
            is_group: message.isGroup,
            group_id: message.groupId,
        });

        // Also publish generic message.received
        await this.publish('message.received', {
            session_id: sessionId,
            message_id: message.id,
            from: message.from,
            to: message.to,
            type: message.type,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
            is_group: message.isGroup,
            group_id: message.groupId,
        });
    }

    /**
     * Publish message status update events
     */
    async messageStatusUpdated(
        sessionId: string,
        messageId: string,
        status: 'sent' | 'delivered' | 'read' | 'failed',
        details?: Record<string, any>
    ): Promise<void> {
        const eventTypeMap = {
            sent: 'message.sent',
            delivered: 'message.delivered',
            read: 'message.read',
            failed: 'message.failed',
        };

        await this.publish(eventTypeMap[status] as WebhookEventType, {
            session_id: sessionId,
            message_id: messageId,
            status,
            ...details,
        });
    }

    /**
     * Publish group participant events
     */
    async groupParticipantUpdated(
        sessionId: string,
        groupId: string,
        participants: string[],
        action: 'add' | 'remove' | 'promote' | 'demote'
    ): Promise<void> {
        const eventTypeMap = {
            add: 'group.participant.added',
            remove: 'group.participant.removed',
            promote: 'group.participant.promoted',
            demote: 'group.participant.demoted',
        };

        await this.publish(eventTypeMap[action] as WebhookEventType, {
            session_id: sessionId,
            group_id: groupId,
            participants,
            action,
        });
    }

    /**
     * Publish session events
     */
    async sessionEvent(
        sessionId: string,
        event: 'connected' | 'disconnected' | 'reconnecting',
        details?: Record<string, any>
    ): Promise<void> {
        const eventTypeMap = {
            connected: 'session.connected',
            disconnected: 'session.disconnected',
            reconnecting: 'session.reconnecting',
        };

        await this.publish(eventTypeMap[event] as WebhookEventType, {
            session_id: sessionId,
            ...details,
        });
    }
}

// Singleton instance
let eventPublisher: EventPublisher | null = null;

export function getEventPublisher(redis: Redis): EventPublisher {
    if (!eventPublisher) {
        eventPublisher = new EventPublisher(redis);
    }
    return eventPublisher;
}
