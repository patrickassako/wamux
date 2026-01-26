/**
 * Standard Webhook Event Types
 * 
 * Maps Baileys internal events to user-facing webhook events.
 * Users can subscribe to any of these events for their webhooks.
 */

// Message Events
export const MESSAGE_EVENTS = {
    // Outbound messages
    MESSAGE_SENT: 'message.sent',
    MESSAGE_DELIVERED: 'message.delivered',
    MESSAGE_READ: 'message.read',
    MESSAGE_FAILED: 'message.failed',

    // Inbound messages
    MESSAGE_RECEIVED: 'message.received',
    MESSAGE_RECEIVED_GROUP: 'message.received.group',
    MESSAGE_RECEIVED_PERSONAL: 'message.received.personal',

    // Message updates
    MESSAGE_UPDATED: 'message.updated',
    MESSAGE_DELETED: 'message.deleted',
    MESSAGE_REACTION: 'message.reaction',
} as const;

// Session Events
export const SESSION_EVENTS = {
    SESSION_CONNECTED: 'session.connected',
    SESSION_DISCONNECTED: 'session.disconnected',
    SESSION_QR_UPDATED: 'session.qr.updated',
    SESSION_RECONNECTING: 'session.reconnecting',
} as const;

// Chat Events
export const CHAT_EVENTS = {
    CHAT_CREATED: 'chat.created',
    CHAT_UPDATED: 'chat.updated',
    CHAT_DELETED: 'chat.deleted',
    CHAT_ARCHIVED: 'chat.archived',
} as const;

// Group Events
export const GROUP_EVENTS = {
    GROUP_CREATED: 'group.created',
    GROUP_UPDATED: 'group.updated',
    GROUP_PARTICIPANT_ADDED: 'group.participant.added',
    GROUP_PARTICIPANT_REMOVED: 'group.participant.removed',
    GROUP_PARTICIPANT_PROMOTED: 'group.participant.promoted',
    GROUP_PARTICIPANT_DEMOTED: 'group.participant.demoted',
} as const;

// Contact Events
export const CONTACT_EVENTS = {
    CONTACT_CREATED: 'contact.created',
    CONTACT_UPDATED: 'contact.updated',
} as const;

// Call Events
export const CALL_EVENTS = {
    CALL_INCOMING: 'call.incoming',
    CALL_MISSED: 'call.missed',
} as const;

// All Event Types (for type safety)
export type MessageEventType = typeof MESSAGE_EVENTS[keyof typeof MESSAGE_EVENTS];
export type SessionEventType = typeof SESSION_EVENTS[keyof typeof SESSION_EVENTS];
export type ChatEventType = typeof CHAT_EVENTS[keyof typeof CHAT_EVENTS];
export type GroupEventType = typeof GROUP_EVENTS[keyof typeof GROUP_EVENTS];
export type ContactEventType = typeof CONTACT_EVENTS[keyof typeof CONTACT_EVENTS];
export type CallEventType = typeof CALL_EVENTS[keyof typeof CALL_EVENTS];

export type WebhookEventType =
    | MessageEventType
    | SessionEventType
    | ChatEventType
    | GroupEventType
    | ContactEventType
    | CallEventType;

// Combined catalog for API response
export const EVENT_CATALOG = {
    messages: Object.values(MESSAGE_EVENTS),
    sessions: Object.values(SESSION_EVENTS),
    chats: Object.values(CHAT_EVENTS),
    groups: Object.values(GROUP_EVENTS),
    contacts: Object.values(CONTACT_EVENTS),
    calls: Object.values(CALL_EVENTS),
};

// All events as flat array
export const ALL_EVENTS: WebhookEventType[] = [
    ...Object.values(MESSAGE_EVENTS),
    ...Object.values(SESSION_EVENTS),
    ...Object.values(CHAT_EVENTS),
    ...Object.values(GROUP_EVENTS),
    ...Object.values(CONTACT_EVENTS),
    ...Object.values(CALL_EVENTS),
];

// Default events for new webhooks
export const DEFAULT_WEBHOOK_EVENTS: WebhookEventType[] = [
    MESSAGE_EVENTS.MESSAGE_RECEIVED,
    MESSAGE_EVENTS.MESSAGE_SENT,
    MESSAGE_EVENTS.MESSAGE_DELIVERED,
    MESSAGE_EVENTS.MESSAGE_READ,
    SESSION_EVENTS.SESSION_CONNECTED,
    SESSION_EVENTS.SESSION_DISCONNECTED,
];
