import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useNetworkStatus } from './useNetworkStatus';
import { syncService } from '../services/syncService';
import { logger } from '../utils/logger';

import {
  getOfflineFirst,
  defaultSyncStats,
  normalizeConflictStrategy,
  mergeItemData,
  normalizeStoredData,
} from '../services/offlineFirst';

import type { SyncStats } from '../services/syncService';
import type {
  DataSyncStatus,
  OfflineConflictResolutionStrategy,
  OfflineDataItem,
  OfflineFirstOptions,
} from '../services/offlineFirst';

export type { DataSyncStatus, OfflineConflictResolutionStrategy, OfflineDataItem };

export interface UseOfflineDataOptions<T = unknown> extends OfflineFirstOptions<T> {}

/**
 * Hook for persisted offline-first data with queued mutations and conflict resolution.
 */
export function useOfflineData<T>(dataType: string, options: UseOfflineDataOptions<T> = {}) {
  const {
    autoSync = true,
    maxSyncAttempts = 3,
    conflictResolutionStrategy = 'server-wins',
    endpointForItem,
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

  const layer = useMemo(
    () =>
      getOfflineFirst<T>(dataType, {
        autoSync,
        maxSyncAttempts,
        conflictResolutionStrategy,
        endpointForItem,
      }),
    [dataType, autoSync, maxSyncAttempts, conflictResolutionStrategy, endpointForItem]
  );

  const refreshSyncStats = useCallback(async () => {
    try {
      const stats = await layer.getRefreshSyncStats();
      setSyncStats(stats);
    } catch (error) {
      logger.error('Error loading sync stats:', error);
    }
  }, [layer]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const loaded = await layer.loadData();
      setData(loaded);
    } catch (error) {
      logger.error(`Error loading ${dataType} data:`, error);
      setData({});
    } finally {
      setIsLoading(false);
    }
  }, [dataType, layer]);

  const addItem = useCallback(
    async (id: string, itemData: T): Promise<void> => {
      try {
        const updated = await layer.addItem(data, id, itemData);
        setData(updated);
        await layer.flushIfOnline(isOnline);
      } catch (error) {
        logger.error(`Error adding ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, layer]
  );

  const updateItem = useCallback(
    async (id: string, itemData: Partial<T>): Promise<void> => {
      try {
        const updated = await layer.updateItem(data, id, itemData);
        setData(updated);
        await layer.flushIfOnline(isOnline);
      } catch (error) {
        logger.error(`Error updating ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, layer]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        const updated = await layer.deleteItem(data, id);
        setData(updated);
        await layer.flushIfOnline(isOnline);
      } catch (error) {
        logger.error(`Error deleting ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, layer]
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
      try {
        setIsSyncing(true);
        const updated = await layer.syncItem(data, id);
        setData(updated);
        await layer.flushIfOnline(isOnline);
      } catch (error) {
        logger.error(`Error syncing ${dataType} item ${id}:`, error);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [data, dataType, isOnline, layer]
  );

  const syncAll = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);
      const updated = await layer.syncAll(data);
      setData(updated);
      await layer.flushIfOnline(isOnline);
    } catch (error) {
      logger.error(`Error syncing all ${dataType} items:`, error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [data, dataType, isOnline, layer]);

  const markAsSynced = useCallback(
    async (id: string): Promise<void> => {
      const updated = await layer.markAsSynced(data, id);
      setData(updated);
    },
    [data, layer]
  );

  const markConflict = useCallback(
    async (id: string, serverData: T, baseData?: T): Promise<void> => {
      const updated = await layer.markConflict(data, id, serverData, baseData);
      setData(updated);
    },
    [data, layer]
  );

  const resolveConflict = useCallback(
    async (
      id: string,
      resolvedData?: T,
      strategy: OfflineConflictResolutionStrategy = conflictResolutionStrategy
    ): Promise<void> => {
      try {
        const updated = await layer.resolveConflict(data, id, resolvedData, strategy);
        setData(updated);
        await layer.flushIfOnline(isOnline);
      } catch (error) {
        logger.error(`Error resolving conflict for ${dataType} item ${id}:`, error);
        throw error;
      }
    },
    [conflictResolutionStrategy, data, dataType, isOnline, layer]
  );

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await layer.clearAll();
      setData({});
    } catch (error) {
      logger.error(`Error clearing ${dataType} data:`, error);
      throw error;
    }
  }, [dataType, layer]);

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
