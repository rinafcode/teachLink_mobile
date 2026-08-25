import { offlineStorage } from './offlineStorage';
import { syncService } from './syncService';
import { logger } from '../utils/logger';

import type { SyncConflictResolutionStrategy, SyncOperationType } from './offlineStorage';
import type { SyncStats } from './syncService';

export type DataSyncStatus = 'synced' | 'pending' | 'conflict' | 'error';
export type OfflineConflictResolutionStrategy =
  | SyncConflictResolutionStrategy
  | 'serverWins'
  | 'clientWins'
  | 'merge';

type MutationOperationType = Exclude<SyncOperationType, 'READ'>;

export interface OfflineDataItem<T> {
  id: string;
  data: T;
  status: DataSyncStatus;
  lastModified: number;
  syncAttempts: number;
  errorMessage?: string;
  version?: number;
  baseData?: T;
  serverData?: T;
  operation?: MutationOperationType;
  deleted?: boolean;
  conflictResolutionStrategy?: SyncConflictResolutionStrategy;
}

export interface OfflineFirstOptions<T = unknown> {
  autoSync?: boolean;
  maxSyncAttempts?: number;
  conflictResolutionStrategy?: OfflineConflictResolutionStrategy;
  endpointForItem?: (dataType: string, id: string, item?: OfflineDataItem<T>) => string;
}

export const defaultSyncStats: SyncStats = {
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  successCount: 0,
  failureCount: 0,
  conflictCount: 0,
  successRate: 1,
};

export function normalizeConflictStrategy(
  strategy: OfflineConflictResolutionStrategy
): SyncConflictResolutionStrategy {
  if (strategy === 'serverWins') return 'server-wins';
  if (strategy === 'clientWins') return 'client-wins';
  if (strategy === 'merge') return 'manual';
  return strategy;
}

export function mergeItemData<T>(currentData: T, patchData: Partial<T>): T {
  if (
    currentData !== null &&
    typeof currentData === 'object' &&
    patchData !== null &&
    typeof patchData === 'object'
  ) {
    return {
      ...(currentData as Record<string, unknown>),
      ...(patchData as Record<string, unknown>),
    } as T;
  }

  return patchData as T;
}

export function normalizeStoredData<T>(
  storedData: Record<string, OfflineDataItem<T>> | null
): Record<string, OfflineDataItem<T>> {
  if (!storedData) return {};

  return Object.entries(storedData).reduce<Record<string, OfflineDataItem<T>>>(
    (normalized, [id, item]) => {
      normalized[id] = {
        ...item,
        id: item.id ?? id,
        status: item.status ?? 'synced',
        lastModified: item.lastModified ?? Date.now(),
        syncAttempts: item.syncAttempts ?? 0,
        version: item.version ?? 1,
        deleted: item.deleted ?? false,
      };
      return normalized;
    },
    {}
  );
}

function defaultEndpointForItem(dataType: string, id: string): string {
  return `/${dataType}/${id}`;
}

/**
 * Pure data-layer for offline-first operations.
 * No React hooks — safe to call from services, tests, or non-component code.
 */
export function getOfflineFirst<T>(dataType: string, options: OfflineFirstOptions<T> = {}) {
  const {
    autoSync = true,
    maxSyncAttempts = 3,
    conflictResolutionStrategy = 'server-wins',
    endpointForItem = defaultEndpointForItem,
  } = options;

  const defaultConflictStrategy = normalizeConflictStrategy(conflictResolutionStrategy);

  const getEndpoint = (id: string, item?: OfflineDataItem<T>) =>
    endpointForItem(dataType, id, item);

  const queueMutation = async (item: OfflineDataItem<T>, operation: MutationOperationType) => {
    await offlineStorage.addToSyncQueue({
      type: operation,
      endpoint: getEndpoint(item.id, item),
      data: operation === 'DELETE' ? undefined : item.data,
      priority: operation === 'CREATE' ? 'high' : 'medium',
      localVersion: item.version,
      lastModified: item.lastModified,
      baseData: item.baseData,
      conflictStrategy: item.conflictResolutionStrategy ?? defaultConflictStrategy,
    });
  };

  const loadData = async (): Promise<Record<string, OfflineDataItem<T>>> => {
    try {
      const storedData =
        await offlineStorage.retrieve<Record<string, OfflineDataItem<T>>>(dataType);
      return normalizeStoredData(storedData);
    } catch (error) {
      logger.error(`Error loading ${dataType} data:`, error);
      return {};
    }
  };

  const saveData = async (newData: Record<string, OfflineDataItem<T>>): Promise<void> => {
    try {
      await offlineStorage.store(dataType, newData);
    } catch (error) {
      logger.error(`Error saving ${dataType} data:`, error);
      throw error;
    }
  };

  const flushIfOnline = async (isOnline: boolean): Promise<void> => {
    if (!autoSync || !isOnline) return;

    try {
      await syncService.manualSync();
    } catch (error) {
      logger.error('Error flushing offline queue:', error);
    }
  };

  const addItem = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string,
    itemData: T
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const now = Date.now();
    const newItem: OfflineDataItem<T> = {
      id,
      data: itemData,
      status: 'pending',
      lastModified: now,
      syncAttempts: 0,
      version: 1,
      operation: 'CREATE',
      deleted: false,
      conflictResolutionStrategy: defaultConflictStrategy,
    };

    const updatedData = { ...data, [id]: newItem };
    await saveData(updatedData);
    await queueMutation(newItem, 'CREATE');
    return updatedData;
  };

  const updateItem = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string,
    itemData: Partial<T>
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const existingItem = data[id];
    if (!existingItem || existingItem.deleted) {
      throw new Error(`Item with id ${id} not found`);
    }

    const nextOperation: MutationOperationType =
      existingItem.operation === 'CREATE' ? 'CREATE' : 'UPDATE';
    const updatedItem: OfflineDataItem<T> = {
      ...existingItem,
      data: mergeItemData(existingItem.data, itemData),
      status: 'pending',
      lastModified: Date.now(),
      syncAttempts: 0,
      errorMessage: undefined,
      version: (existingItem.version ?? 1) + 1,
      baseData: existingItem.baseData ?? existingItem.data,
      operation: nextOperation,
      deleted: false,
      conflictResolutionStrategy:
        existingItem.conflictResolutionStrategy ?? defaultConflictStrategy,
    };

    const updatedData = { ...data, [id]: updatedItem };
    await saveData(updatedData);
    await queueMutation(updatedItem, nextOperation);
    return updatedData;
  };

  const deleteItem = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const existingItem = data[id];
    if (!existingItem) return data;

    const deletedItem: OfflineDataItem<T> = {
      ...existingItem,
      status: 'pending',
      lastModified: Date.now(),
      syncAttempts: 0,
      errorMessage: undefined,
      version: (existingItem.version ?? 1) + 1,
      baseData: existingItem.baseData ?? existingItem.data,
      operation: 'DELETE',
      deleted: true,
      conflictResolutionStrategy:
        existingItem.conflictResolutionStrategy ?? defaultConflictStrategy,
    };

    const updatedData = { ...data, [id]: deletedItem };
    await saveData(updatedData);
    await queueMutation(deletedItem, 'DELETE');
    return updatedData;
  };

  const syncItem = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const item = data[id];
    if (!item) return data;

    const operation = item.operation ?? (item.deleted ? 'DELETE' : 'UPDATE');
    await queueMutation(item, operation);

    const updatedItem: OfflineDataItem<T> = {
      ...item,
      status: 'pending',
      syncAttempts: item.syncAttempts + 1,
      errorMessage: undefined,
    };

    const updatedData = { ...data, [id]: updatedItem };
    await saveData(updatedData);
    return updatedData;
  };

  const syncAll = async (
    data: Record<string, OfflineDataItem<T>>
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const updatedData = { ...data };
    const syncableItems = Object.values(data).filter(
      item =>
        (item.status === 'pending' || item.status === 'error') &&
        item.syncAttempts < maxSyncAttempts
    );

    for (const item of syncableItems) {
      const operation = item.operation ?? (item.deleted ? 'DELETE' : 'UPDATE');
      await queueMutation(item, operation);
      updatedData[item.id] = {
        ...item,
        status: 'pending',
        syncAttempts: item.syncAttempts + 1,
        errorMessage: undefined,
      };
    }

    await saveData(updatedData);
    return updatedData;
  };

  const markAsSynced = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const item = data[id];
    if (!item) return data;

    const updatedData = { ...data };
    if (item.deleted) {
      delete updatedData[id];
    } else {
      updatedData[id] = {
        ...item,
        status: 'synced',
        syncAttempts: 0,
        errorMessage: undefined,
        baseData: item.data,
        serverData: undefined,
        operation: undefined,
        deleted: false,
      };
    }

    await saveData(updatedData);
    return updatedData;
  };

  const markConflict = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string,
    serverData: T,
    baseData?: T
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const item = data[id];
    if (!item) return data;

    const updatedData = {
      ...data,
      [id]: {
        ...item,
        status: 'conflict' as const,
        serverData,
        baseData: baseData ?? item.baseData ?? item.data,
        errorMessage: 'Conflict detected during sync',
        conflictResolutionStrategy: item.conflictResolutionStrategy ?? defaultConflictStrategy,
      },
    };

    await saveData(updatedData);
    return updatedData;
  };

  const resolveConflict = async (
    data: Record<string, OfflineDataItem<T>>,
    id: string,
    resolvedData?: T,
    strategy: OfflineConflictResolutionStrategy = conflictResolutionStrategy
  ): Promise<Record<string, OfflineDataItem<T>>> => {
    const item = data[id];
    if (!item) return data;

    const normalizedStrategy = normalizeConflictStrategy(strategy);
    let nextData: T;

    if (normalizedStrategy === 'server-wins') {
      if (typeof item.serverData === 'undefined' && typeof resolvedData === 'undefined') {
        throw new Error(`Server data is required to resolve conflict for ${id}`);
      }
      nextData = typeof item.serverData === 'undefined' ? (resolvedData as T) : item.serverData;
    } else if (normalizedStrategy === 'client-wins') {
      nextData = item.data;
    } else {
      if (typeof resolvedData === 'undefined') {
        throw new Error(`Manual conflict resolution requires resolved data for ${id}`);
      }
      nextData = resolvedData;
    }

    const resolvedItem: OfflineDataItem<T> = {
      ...item,
      data: nextData,
      status: 'pending',
      lastModified: Date.now(),
      syncAttempts: 0,
      errorMessage: undefined,
      version: (item.version ?? 1) + 1,
      baseData: item.baseData ?? item.data,
      serverData: undefined,
      operation: 'UPDATE',
      deleted: false,
      conflictResolutionStrategy: normalizedStrategy,
    };

    const updatedData = { ...data, [id]: resolvedItem };
    await saveData(updatedData);
    await queueMutation(resolvedItem, 'UPDATE');
    return updatedData;
  };

  const clearAll = async (): Promise<void> => {
    await offlineStorage.remove(dataType);
  };

  const getRefreshSyncStats = async (): Promise<SyncStats> => {
    return syncService.getSyncStats();
  };

  return {
    loadData,
    saveData,
    flushIfOnline,
    addItem,
    updateItem,
    deleteItem,
    syncItem,
    syncAll,
    markAsSynced,
    markConflict,
    resolveConflict,
    clearAll,
    getRefreshSyncStats,
    maxSyncAttempts,
    defaultConflictStrategy,
  };
}

export type OfflineFirstInstance<T> = ReturnType<typeof getOfflineFirst<T>>;
