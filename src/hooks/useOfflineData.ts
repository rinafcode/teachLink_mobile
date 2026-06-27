import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useNetworkStatus } from './useNetworkStatus';
import { offlineStorage } from '../services/offlineStorage';
import { syncService } from '../services/syncService';
import { logger } from '../utils/logger';

import type { SyncConflictResolutionStrategy, SyncOperationType } from '../services/offlineStorage';
import type { SyncStats } from '../services/syncService';

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

export interface UseOfflineDataOptions<T = unknown> {
  autoSync?: boolean;
  maxSyncAttempts?: number;
  conflictResolutionStrategy?: OfflineConflictResolutionStrategy;
  endpointForItem?: (dataType: string, id: string, item?: OfflineDataItem<T>) => string;
}

const defaultSyncStats: SyncStats = {
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  successCount: 0,
  failureCount: 0,
  conflictCount: 0,
  successRate: 1,
};

function normalizeConflictStrategy(
  strategy: OfflineConflictResolutionStrategy
): SyncConflictResolutionStrategy {
  if (strategy === 'serverWins') return 'server-wins';
  if (strategy === 'clientWins') return 'client-wins';
  if (strategy === 'merge') return 'manual';
  return strategy;
}

function mergeItemData<T>(currentData: T, patchData: Partial<T>): T {
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

function normalizeStoredData<T>(
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
 * Hook for persisted offline-first data with queued mutations and conflict resolution.
 */
export function useOfflineData<T>(dataType: string, options: UseOfflineDataOptions<T> = {}) {
  const {
    autoSync = true,
    maxSyncAttempts = 3,
    conflictResolutionStrategy = 'server-wins',
    endpointForItem = defaultEndpointForItem,
  } = options;

  const defaultConflictStrategy = useMemo(
    () => normalizeConflictStrategy(conflictResolutionStrategy),
    [conflictResolutionStrategy]
  );

  const [data, setData] = useState<Record<string, OfflineDataItem<T>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>(defaultSyncStats);
  const syncStartedForConnection = useRef(false);
  const { isOnline, refresh: refreshNetworkStatus } = useNetworkStatus();

  const refreshSyncStats = useCallback(async () => {
    try {
      const stats = await syncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      logger.error('Error loading sync stats:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedData =
        await offlineStorage.retrieve<Record<string, OfflineDataItem<T>>>(dataType);

      setData(normalizeStoredData(storedData));
    } catch (error) {
      logger.error(`Error loading ${dataType} data:`, error);
      setData({});
    } finally {
      setIsLoading(false);
    }
  }, [dataType]);

  const saveData = useCallback(
    async (newData: Record<string, OfflineDataItem<T>>) => {
      try {
        await offlineStorage.store(dataType, newData);
        setData(newData);
      } catch (error) {
        logger.error(`Error saving ${dataType} data:`, error);
        throw error;
      }
    },
    [dataType]
  );

  const getEndpoint = useCallback(
    (id: string, item?: OfflineDataItem<T>) => endpointForItem(dataType, id, item),
    [dataType, endpointForItem]
  );

  const queueMutation = useCallback(
    async (item: OfflineDataItem<T>, operation: MutationOperationType) => {
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
    },
    [defaultConflictStrategy, getEndpoint]
  );

  const flushIfOnline = useCallback(async () => {
    if (!autoSync || !isOnline) return;

    try {
      await syncService.manualSync();
      await refreshSyncStats();
    } catch (error) {
      logger.error('Error flushing offline queue:', error);
    }
  }, [autoSync, isOnline, refreshSyncStats]);

  const addItem = useCallback(
    async (id: string, itemData: T): Promise<void> => {
      try {
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

        const updatedData = {
          ...data,
          [id]: newItem,
        };

        await saveData(updatedData);
        await queueMutation(newItem, 'CREATE');
        await flushIfOnline();
      } catch (error) {
        logger.error(`Error adding ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, defaultConflictStrategy, flushIfOnline, queueMutation, saveData]
  );

  const updateItem = useCallback(
    async (id: string, itemData: Partial<T>): Promise<void> => {
      try {
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

        const updatedData = {
          ...data,
          [id]: updatedItem,
        };

        await saveData(updatedData);
        await queueMutation(updatedItem, nextOperation);
        await flushIfOnline();
      } catch (error) {
        logger.error(`Error updating ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, defaultConflictStrategy, flushIfOnline, queueMutation, saveData]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        const existingItem = data[id];
        if (!existingItem) return;

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

        const updatedData = {
          ...data,
          [id]: deletedItem,
        };

        await saveData(updatedData);
        await queueMutation(deletedItem, 'DELETE');
        await flushIfOnline();
      } catch (error) {
        logger.error(`Error deleting ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, defaultConflictStrategy, flushIfOnline, queueMutation, saveData]
  );

  const getItem = useCallback(
    (id: string): T | null => {
      const item = data[id];
      return item && !item.deleted ? item.data : null;
    },
    [data]
  );

  const getRecordsByStatus = useCallback(
    (status: DataSyncStatus): OfflineDataItem<T>[] =>
      Object.values(data).filter(item => item.status === status),
    [data]
  );

  const getItemsByStatus = useCallback(
    (status: DataSyncStatus): T[] =>
      getRecordsByStatus(status)
        .filter(item => !item.deleted)
        .map(item => item.data),
    [getRecordsByStatus]
  );

  const syncItem = useCallback(
    async (id: string): Promise<void> => {
      const item = data[id];
      if (!item) return;

      try {
        setIsSyncing(true);

        const operation = item.operation ?? (item.deleted ? 'DELETE' : 'UPDATE');
        await queueMutation(item, operation);

        const updatedItem: OfflineDataItem<T> = {
          ...item,
          status: 'pending',
          syncAttempts: item.syncAttempts + 1,
          errorMessage: undefined,
        };

        const updatedData = {
          ...data,
          [id]: updatedItem,
        };

        await saveData(updatedData);
        await flushIfOnline();
      } catch (error) {
        logger.error(`Error syncing ${dataType} item ${id}:`, error);

        const errorItem: OfflineDataItem<T> = {
          ...item,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          syncAttempts: item.syncAttempts + 1,
        };

        await saveData({
          ...data,
          [id]: errorItem,
        });
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [data, dataType, flushIfOnline, queueMutation, saveData]
  );

  const syncAll = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);

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
      await flushIfOnline();
    } catch (error) {
      logger.error(`Error syncing all ${dataType} items:`, error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [data, dataType, flushIfOnline, maxSyncAttempts, queueMutation, saveData]);

  const markAsSynced = useCallback(
    async (id: string): Promise<void> => {
      const item = data[id];
      if (!item) return;

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
    },
    [data, saveData]
  );

  const markConflict = useCallback(
    async (id: string, serverData: T, baseData?: T): Promise<void> => {
      const item = data[id];
      if (!item) return;

      await saveData({
        ...data,
        [id]: {
          ...item,
          status: 'conflict',
          serverData,
          baseData: baseData ?? item.baseData ?? item.data,
          errorMessage: 'Conflict detected during sync',
          conflictResolutionStrategy: item.conflictResolutionStrategy ?? defaultConflictStrategy,
        },
      });
    },
    [data, defaultConflictStrategy, saveData]
  );

  const resolveConflict = useCallback(
    async (
      id: string,
      resolvedData?: T,
      strategy: OfflineConflictResolutionStrategy = conflictResolutionStrategy
    ): Promise<void> => {
      try {
        const item = data[id];
        if (!item) return;

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

        await saveData({
          ...data,
          [id]: resolvedItem,
        });
        await queueMutation(resolvedItem, 'UPDATE');
        await flushIfOnline();
      } catch (error) {
        logger.error(`Error resolving conflict for ${dataType} item ${id}:`, error);
        throw error;
      }
    },
    [conflictResolutionStrategy, data, dataType, flushIfOnline, queueMutation, saveData]
  );

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await offlineStorage.remove(dataType);
      setData({});
    } catch (error) {
      logger.error(`Error clearing ${dataType} data:`, error);
      throw error;
    }
  }, [dataType]);

  const refresh = useCallback(async (): Promise<void> => {
    await loadData();
    await refreshNetworkStatus();
    await refreshSyncStats();
  }, [loadData, refreshNetworkStatus, refreshSyncStats]);

  const records = useMemo(() => Object.values(data), [data]);
  const pendingRecords = useMemo(
    () => records.filter(item => item.status === 'pending'),
    [records]
  );
  const hasSyncableItems = useMemo(
    () => records.some(item => item.status === 'pending' || item.status === 'error'),
    [records]
  );

  useEffect(() => {
    const listener = (event: { type: string }) => {
      if (
        event.type === 'operationProcessed' ||
        event.type === 'syncCompleted' ||
        event.type === 'syncFailed' ||
        event.type === 'conflictDetected'
      ) {
        void refreshSyncStats();
      }
    };

    void refreshSyncStats();
    syncService.addEventListener(listener);

    return () => {
      syncService.removeEventListener(listener);
    };
  }, [refreshSyncStats]);

  useEffect(() => {
    if (!isOnline) {
      syncStartedForConnection.current = false;
      return;
    }

    if (!autoSync || !hasSyncableItems || syncStartedForConnection.current) {
      return;
    }

    syncStartedForConnection.current = true;
    syncAll().catch(error => {
      logger.error('Auto-sync failed:', error);
    });
  }, [autoSync, hasSyncableItems, isOnline, syncAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    getItem,
    getItemsByStatus,
    getRecordsByStatus,

    addItem,
    updateItem,
    deleteItem,

    syncItem,
    syncAll,
    markAsSynced,
    markConflict,
    resolveConflict,

    isLoading,
    isSyncing,
    isOnline,

    clearAll,
    refresh,
    refreshSyncStats,

    totalCount: records.filter(item => !item.deleted).length,
    pendingCount: pendingRecords.length,
    syncedCount: records.filter(item => item.status === 'synced' && !item.deleted).length,
    conflictCount: records.filter(item => item.status === 'conflict').length,
    errorCount: records.filter(item => item.status === 'error').length,
    deletedCount: records.filter(item => item.deleted).length,
    syncSuccessRate: syncStats.successRate,
    syncSuccessCount: syncStats.successCount,
    syncFailureCount: syncStats.failureCount,
    syncConflictCount: syncStats.conflictCount,
    lastSyncTime: syncStats.lastSyncTime,
  };
}

/**
 * Specialized hook for course data
 */
export function useOfflineCourses() {
  return useOfflineData<any>('courses', {
    autoSync: true,
    conflictResolutionStrategy: 'server-wins',
  });
}

/**
 * Specialized hook for user data
 */
export function useOfflineUserData() {
  return useOfflineData<any>('userData', {
    autoSync: true,
    conflictResolutionStrategy: 'client-wins',
  });
}

/**
 * Specialized hook for settings
 */
export function useOfflineSettings() {
  return useOfflineData<any>('settings', {
    autoSync: false,
    conflictResolutionStrategy: 'client-wins',
  });
}

export default useOfflineData;
