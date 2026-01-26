import { logger } from '../utils/logger.js';
import { SessionManager } from '../whatsapp/session-manager.js';
import { InitSessionHandler } from './init-session-handler.js';
import { LogoutHandler } from './logout-handler.js';
import { DisconnectSessionHandler } from './disconnect-session-handler.js';
import { RestartSessionHandler } from './restart-session-handler.js';
import { SendTextHandler } from './send-text-handler.js';
import { SendMediaHandler } from './send-media-handler.js';
import { Redis } from 'ioredis';
import { UpdateSettingsHandler } from './update-settings-handler.js';

export interface CommandEnvelope {
    id: string;
    type: string;
    version: string;
    timestamp: string;
    payload: any;
}

export interface CommandHandler<T = any> {
    handle(payload: T): Promise<void>;
}

export class CommandRouter {
    private handlers: Map<string, CommandHandler> = new Map();

    constructor(sessionManager: SessionManager, redis: Redis) {
        // Register handlers with dependencies
        this.registerHandler('INIT_SESSION', new InitSessionHandler(sessionManager));
        this.registerHandler('LOGOUT', new LogoutHandler(sessionManager));
        this.registerHandler('DISCONNECT_SESSION', new DisconnectSessionHandler(sessionManager));
        this.registerHandler('RESTART_SESSION', new RestartSessionHandler(sessionManager));
        this.registerHandler('SEND_TEXT', new SendTextHandler(sessionManager, redis));
        this.registerHandler('UPDATE_SETTINGS', new UpdateSettingsHandler(sessionManager));

        // Media handlers
        const mediaHandler = new SendMediaHandler(sessionManager, redis);
        this.registerHandler('SEND_IMAGE', mediaHandler);
        this.registerHandler('SEND_VIDEO', mediaHandler);
        this.registerHandler('SEND_AUDIO', mediaHandler);

        // Stub handlers for remaining commands
        this.registerHandler('GET_STATUS', new StubHandler('GET_STATUS'));
    }

    registerHandler(commandType: string, handler: CommandHandler): void {
        this.handlers.set(commandType, handler);
        logger.info(`Registered handler for command: ${commandType}`);
    }

    async route(envelope: CommandEnvelope): Promise<void> {
        const handler = this.handlers.get(envelope.type);

        if (!handler) {
            throw new Error(`No handler registered for command type: ${envelope.type}`);
        }

        await handler.handle(envelope.payload);
    }
}

// Stub handler for commands not yet implemented
class StubHandler implements CommandHandler {
    private commandType: string;

    constructor(commandType: string) {
        this.commandType = commandType;
    }

    async handle(payload: any): Promise<void> {
        logger.info({ payload }, `${this.commandType} handler called (stub)`);
    }
}

