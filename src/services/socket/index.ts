import { io, Socket } from 'socket.io-client';

import { decodeBinaryMessage, encodeBinaryMessage } from './binaryProtocol';
import { getEnv } from '../../config';
import syncEntityManager from '../sync/syncEntityManager';
import type { ConflictResolutionStrategy, VersionedSyncMessage } from '../sync/types';
import { appLogger } from '../../utils/logger';

const RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY_MS = 1_000;
const RECONNECTION_DELAY_MAX_MS = 30_000;

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    if (!this.socket) {
      const socketUrl = getEnv('EXPO_PUBLIC_SOCKET_URL');

      this.socket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: RECONNECTION_ATTEMPTS,
        reconnectionDelay: RECONNECTION_DELAY_MS,
        reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
        randomizationFactor: 0.5,
        perMessageDeflate: true,
      });

      this.socket.on('connect', () => {
        appLogger.info('Socket connected:', this.socket?.id);
        const transport = (this.socket as any).io?.engine?.transport;
        if (transport) {
          appLogger.debug(`Socket active transport: ${transport.name}`);
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        appLogger.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          this.socket?.connect();
        }
      });

      this.socket.on('error', (error: unknown) => {
        appLogger.error('Socket error:', error);
      });

      this.socket.on('reconnect_attempt', (attempt: number) => {
        appLogger.info(`Socket reconnection attempt #${attempt}`);
      });

      this.socket.on('reconnect', (attempt: number) => {
        appLogger.info(`Socket reconnected after ${attempt} attempt(s)`);
      });

      this.socket.on('reconnect_error', (error: unknown) => {
        appLogger.warn('Socket reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        appLogger.error(`Socket failed to reconnect after ${RECONNECTION_ATTEMPTS} attempts`);
      });

      this.registerRealtimeHandlers();
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: Record<string, any>) {
    if (!this.socket) return;

    const start = performance.now();
    const encoded = encodeBinaryMessage(event, data);
    const sizeBytes = encoded.byteLength;

    this.socket.emit(event, encoded);

    const end = performance.now();
    appLogger.info(
      `[Socket Out] Event: ${event}, size: ${(sizeBytes / 1024).toFixed(2)} KB, dispatch time: ${(end - start).toFixed(2)}ms`,
    );
  }

  emitVersioned(message: VersionedSyncMessage) {
    this.emit(message.event, {
      ...message,
      baseEntity:
        message.baseEntity ?? syncEntityManager.getBase(message.entity.entityType, message.entity.id),
    });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.on(event, (data: any) => {
      const start = performance.now();
      const parsed = this.parseIncoming(data);
      const rawString = JSON.stringify(parsed);
      const sizeBytes = rawString.length;

      callback(parsed);

      const end = performance.now();
      appLogger.info(
        `[Socket In] Event: ${event}, size: ${(sizeBytes / 1024).toFixed(2)} KB, callback process time: ${(end - start).toFixed(2)}ms`,
      );
    });
  }

  off(event: string) {
    this.socket?.off(event);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private registerRealtimeHandlers(): void {
    this.registerLoggedHandler('notification_created', notification => {
      this.handleVersionedSyncMessage('notification_created', notification);
    });
    this.registerLoggedHandler('course_updated', courseData => {
      this.handleVersionedSyncMessage('course_updated', courseData);
    });
    this.registerLoggedHandler('message_received', message => {
      this.handleVersionedSyncMessage('message_received', message);
    });
    this.registerLoggedHandler('sync_entity_updated', message => {
      this.handleVersionedSyncMessage('sync_entity_updated', message);
    });
  }

  private registerLoggedHandler(event: string, handler: (data: unknown) => void): void {
    this.socket?.on(event, (raw: any) => {
      const start = performance.now();
      const parsed = this.parseIncoming(raw);
      const rawString = JSON.stringify(parsed);
      const sizeBytes = rawString.length;
      appLogger.info(`[Socket In] Event: ${event}, size: ${(sizeBytes / 1024).toFixed(2)} KB`);

      handler(parsed);

      const end = performance.now();
      appLogger.debug(`[Socket In] Processed ${event} in ${(end - start).toFixed(2)}ms`);
    });
  }

  private parseIncoming(data: unknown): unknown {
    return data instanceof ArrayBuffer || data instanceof Uint8Array
      ? decodeBinaryMessage(data).payload
      : data;
  }

  private handleVersionedSyncMessage(event: string, data: unknown): void {
    if (!this.isVersionedMessage(data)) return;

    const strategy = data.strategy ?? this.defaultStrategyForEvent(event);
    const result = syncEntityManager.handleServerEntity(data.entity, strategy, data.baseEntity);
    appLogger.info(
      `Resolved sync update for ${data.entity.entityType}:${data.entity.id} using ${result.strategy}`,
    );
  }

  private isVersionedMessage(data: unknown): data is VersionedSyncMessage {
    if (!data || typeof data !== 'object') return false;

    const message = data as Partial<VersionedSyncMessage>;
    const entity = message.entity as VersionedSyncMessage['entity'] | undefined;

    return Boolean(
      message.event &&
        entity &&
        typeof entity.id === 'string' &&
        typeof entity.entityType === 'string' &&
        typeof entity.version === 'number' &&
        typeof entity.clientSeq === 'number' &&
        entity.data &&
        typeof entity.data === 'object',
    );
  }

  private defaultStrategyForEvent(event: string): ConflictResolutionStrategy {
    if (event === 'notification_created') return 'server-wins';
    return 'merge';
  }
}

export default new SocketService();
