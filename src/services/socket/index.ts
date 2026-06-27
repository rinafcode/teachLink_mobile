import { io, Socket } from 'socket.io-client';

import { useSocketStore } from '../../store';
import { decodeBinaryMessage, encodeBinaryMessage } from './binaryProtocol';
import { getEnv } from '../../config';
import { appLogger } from '../../utils/logger';
import syncEntityManager from '../sync/syncEntityManager';

import type { ConflictResolutionStrategy, VersionedSyncMessage } from '../sync/types';


const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

const BACKOFF_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000];

class SocketService {
  private socket: Socket | null = null;
  private stableConnectionTimeout?: NodeJS.Timeout;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffIndex = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  connect() {
    if (this.socket?.connected) return this.socket;

    if (!this.socket) {
      const socketUrl = getEnv('EXPO_PUBLIC_SOCKET_URL');

      this.socket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: false,
        perMessageDeflate: true,
      });

      this.socket.on('connect', () => {
        appLogger.info('Socket connected:', this.socket?.id);
        const transport = (this.socket as any).io?.engine?.transport;
        if (transport) {
          appLogger.debug(`Socket active transport: ${transport.name}`);
        }
        
        // Reset connection state after stable 60s connection
        if (this.stableConnectionTimeout) {
          clearTimeout(this.stableConnectionTimeout);
        }
        this.stableConnectionTimeout = setTimeout(() => {
          useSocketStore.getState().resetConnection();
        }, 60000);

        this.backoffIndex = 0;
        this.startHeartbeat();
      });

      this.socket.on('disconnect', (reason: string) => {
        appLogger.warn('Socket disconnected:', reason);
        if (this.stableConnectionTimeout) {
          clearTimeout(this.stableConnectionTimeout);
        }
        this.stopHeartbeat();
        if (!this.intentionalDisconnect && reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      this.socket.on('error', (error: unknown) => {
        appLogger.error('Socket error:', error);
      });

      this.socket.on('pong', () => {
        this.clearPongTimeout();
      });

      this.registerRealtimeHandlers();
    }

    return this.socket;
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.pongTimeoutTimer = setTimeout(() => {
          appLogger.warn('Socket heartbeat: pong not received, disconnecting');
          if (this.socket) {
            this.socket.disconnect();
          }
        }, HEARTBEAT_TIMEOUT_MS);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  private clearPongTimeout(): void {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = BACKOFF_DELAYS[this.backoffIndex] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
    const jitter = 0.9 + Math.random() * 0.2;
    const actualDelay = Math.round(delay * jitter);

    appLogger.info(`Socket reconnecting in ${actualDelay}ms (backoff index: ${this.backoffIndex})`);

    useSocketStore.getState().setReconnectAttempts(this.backoffIndex + 1);

    this.reconnectTimer = setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
      if (this.backoffIndex < BACKOFF_DELAYS.length - 1) {
        this.backoffIndex++;
      } else {
        useSocketStore.getState().setConnectionFailed(true);
      }
    }, actualDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
