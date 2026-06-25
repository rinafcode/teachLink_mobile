import {
  applyLocalMutation,
  buildConflict,
  createVersionedEntity,
  detectConflict,
  processServerUpdate,
  resolveConflict,
} from './conflictResolver';
import versionStore from './versionStore';

import type {
  ConflictResolutionResult,
  ConflictResolutionStrategy,
  SyncConflict,
  SyncEvent,
  VersionedEntity,
} from './types';

type Listener = (event: SyncEvent) => void;

const makeKey = (entityType: string, entityId: string): string => `${entityType}:${entityId}`;

class SyncEntityManager {
  private readonly baseVersions = new Map<string, VersionedEntity>();
  private readonly listeners = new Set<Listener>();

  trackServerEntity<T extends Record<string, unknown>>(
    entity: VersionedEntity<T>,
  ): VersionedEntity<T> {
    const accepted = { ...entity, clientSeq: 0 };
    versionStore.set(accepted);
    this.baseVersions.set(makeKey(entity.entityType, entity.id), accepted);
    return accepted;
  }

  trackRawEntity<T extends Record<string, unknown>>(
    id: string,
    entityType: string,
    data: T,
    clientId: string,
    serverVersion = 0,
  ): VersionedEntity<T> {
    const entity = createVersionedEntity(id, entityType, data, clientId, serverVersion);
    return this.trackServerEntity(entity);
  }

  applyLocalPatch<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
    patch: Partial<T>,
  ): VersionedEntity<T> | undefined {
    const current = versionStore.get<T>(entityType, entityId);
    if (!current) return undefined;

    const key = makeKey(entityType, entityId);
    if (current.clientSeq === 0) {
      this.baseVersions.set(key, current);
    }

    const next = applyLocalMutation(current, patch);
    versionStore.set(next);
    return next;
  }

  handleServerEntity<T extends Record<string, unknown>>(
    serverEntity: VersionedEntity<T>,
    strategy: ConflictResolutionStrategy = 'merge',
    explicitBase?: VersionedEntity<T>,
  ): ConflictResolutionResult<T> {
    const key = makeKey(serverEntity.entityType, serverEntity.id);
    const local = versionStore.get<T>(serverEntity.entityType, serverEntity.id);
    const base = explicitBase ?? (this.baseVersions.get(key) as VersionedEntity<T> | undefined);

    let result: ConflictResolutionResult<T>;
    if (local && detectConflict(local, serverEntity)) {
      const conflict = buildConflict(local, serverEntity, base);
      this.emit({ type: 'conflictDetected', conflict, timestamp: Date.now() });
      result = resolveConflict(conflict, strategy);
      this.emit({ type: 'conflictResolved', resolution: result, timestamp: Date.now() });
    } else {
      result = processServerUpdate(local, serverEntity, strategy, base);
    }

    versionStore.set(result.resolved);
    this.baseVersions.set(key, result.resolved);
    return result;
  }

  getLocal<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
  ): VersionedEntity<T> | undefined {
    return versionStore.get<T>(entityType, entityId);
  }

  getBase<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
  ): VersionedEntity<T> | undefined {
    return this.baseVersions.get(makeKey(entityType, entityId)) as VersionedEntity<T> | undefined;
  }

  resolveRawConflict<T extends Record<string, unknown>>(
    localData: T,
    serverData: T,
    strategy: ConflictResolutionStrategy = 'merge',
    baseData?: T,
  ): ConflictResolutionResult<T> {
    const clientId = 'local-client';
    const local = createVersionedEntity('raw-conflict', 'raw', localData, clientId, 1);
    const server = createVersionedEntity('raw-conflict', 'raw', serverData, 'server', 2);
    const base = baseData
      ? createVersionedEntity('raw-conflict', 'raw', baseData, 'server', 1)
      : undefined;

    return resolveConflict(
      {
        entityId: local.id,
        entityType: local.entityType,
        baseVersion: base,
        localVersion: { ...local, clientSeq: 1 },
        serverVersion: server,
        detectedAt: Date.now(),
      },
      strategy,
    );
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.baseVersions.clear();
    versionStore.clear();
  }

  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const syncEntityManager = new SyncEntityManager();

export type { SyncConflict };

export default syncEntityManager;
