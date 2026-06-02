import { checksum } from './checksum';
import type { VersionedEntity } from './types';

type EntityKey = string;
type StoreListener = (key: EntityKey, entity: VersionedEntity) => void;

const makeKey = (entityType: string, entityId: string): EntityKey =>
  `${entityType}:${entityId}`;

class VersionStore {
  private readonly store = new Map<EntityKey, VersionedEntity>();
  private readonly listeners = new Set<StoreListener>();

  set<T extends Record<string, unknown>>(entity: VersionedEntity<T>): void {
    const key = makeKey(entity.entityType, entity.id);
    const withChecksum: VersionedEntity<T> = entity.checksum
      ? entity
      : { ...entity, checksum: checksum(entity.data) };

    this.store.set(key, withChecksum as unknown as VersionedEntity);
    this.notifyListeners(key, withChecksum as unknown as VersionedEntity);
  }

  get<T extends Record<string, unknown>>(
    entityType: string,
    entityId: string,
  ): VersionedEntity<T> | undefined {
    return this.store.get(makeKey(entityType, entityId)) as VersionedEntity<T> | undefined;
  }

  has(entityType: string, entityId: string): boolean {
    return this.store.has(makeKey(entityType, entityId));
  }

  getVersion(entityType: string, entityId: string): number {
    return this.get(entityType, entityId)?.version ?? -1;
  }

  delete(entityType: string, entityId: string): boolean {
    return this.store.delete(makeKey(entityType, entityId));
  }

  clear(): void {
    this.store.clear();
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): ReadonlyMap<EntityKey, VersionedEntity> {
    return new Map(this.store);
  }

  private notifyListeners(key: EntityKey, entity: VersionedEntity): void {
    for (const listener of this.listeners) {
      try {
        listener(key, entity);
      } catch {
        // Listener failures should not break sync state updates.
      }
    }
  }
}

export const versionStore = new VersionStore();

export default versionStore;
