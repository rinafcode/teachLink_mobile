import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { useNetworkStatus } from './useNetworkStatus';
import logger from '../utils/logger';

// Data sync status
export type DataSyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

// Offline data item interface
export interface OfflineDataItem<T> {
  id: string;
  data: T;
  status: DataSyncStatus;
  lastModified: number;
  syncAttempts: number;
  errorMessage?: string;
}

// Hook options
interface UseOfflineDataOptions {
  autoSync?: boolean;
  maxSyncAttempts?: number;
  conflictResolutionStrategy?: 'serverWins' | 'clientWins' | 'merge';
}

/**
 * Hook for managing offline data with automatic synchronization
 */
export function useOfflineData<T>(dataType: string, options: UseOfflineDataOptions = {}) {
  const {
    autoSync = true,
    maxSyncAttempts = 3,
    conflictResolutionStrategy = 'serverWins',
  } = options;

  const [data, setData] = useState<Record<string, OfflineDataItem<T>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline, refresh: refreshNetworkStatus } = useNetworkStatus();

  // Load data from offline storage
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedData =
        await offlineStorage.retrieve<Record<string, OfflineDataItem<T>>>(dataType);

      if (storedData) {
        setData(storedData);
      } else {
        setData({});
      }
    } catch (error) {
      logger.error(`Error loading ${dataType} data:`, error);
      setData({});
    } finally {
      setIsLoading(false);
    }
  }, [dataType]);

  // Save data to offline storage
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

  // Add new item
  const addItem = useCallback(
    async (id: string, itemData: T): Promise<void> => {
      try {
        const newItem: OfflineDataItem<T> = {
          id,
          data: itemData,
          status: 'pending',
          lastModified: Date.now(),
          syncAttempts: 0,
        };

        const updatedData = {
          ...data,
          [id]: newItem,
        };

        await saveData(updatedData);

        // Add to sync queue if online
        if (isOnline) {
          await offlineStorage.addToSyncQueue({
            type: 'CREATE',
            endpoint: `/${dataType}/${id}`,
            data: itemData,
            priority: 'high',
          });
        }
      } catch (error) {
        logger.error(`Error adding ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, saveData]
  );

  // Update existing item
  const updateItem = useCallback(
    async (id: string, itemData: Partial<T>): Promise<void> => {
      try {
        const existingItem = data[id];
        if (!existingItem) {
          throw new Error(`Item with id ${id} not found`);
        }

        const updatedItem: OfflineDataItem<T> = {
          ...existingItem,
          data: { ...existingItem.data, ...itemData },
          status: 'pending',
          lastModified: Date.now(),
          syncAttempts: 0,
        };

        const updatedData = {
          ...data,
          [id]: updatedItem,
        };

        await saveData(updatedData);

        // Add to sync queue if online
        if (isOnline) {
          await offlineStorage.addToSyncQueue({
            type: 'UPDATE',
            endpoint: `/${dataType}/${id}`,
            data: updatedItem.data,
            priority: 'medium',
          });
        }
      } catch (error) {
        logger.error(`Error updating ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, saveData]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        const updatedData = { ...data };
        delete updatedData[id];

        await saveData(updatedData);

        // Add to sync queue if online
        if (isOnline) {
          await offlineStorage.addToSyncQueue({
            type: 'DELETE',
            endpoint: `/${dataType}/${id}`,
            priority: 'medium',
          });
        }
      } catch (error) {
        logger.error(`Error deleting ${dataType} item:`, error);
        throw error;
      }
    },
    [data, dataType, isOnline, saveData]
  );

  // Get item by ID
  const getItem = useCallback(
    (id: string): T | null => {
      const item = data[id];
      return item ? item.data : null;
    },
    [data]
  );

  // Get items with specific status
  const getItemsByStatus = useCallback(
    (status: DataSyncStatus): T[] => {
      return Object.values(data)
        .filter(item => item.status === status)
        .map(item => item.data);
    },
    [data]
  );

  // Sync specific item
  const syncItem = useCallback(
    async (id: string): Promise<void> => {
      const item = data[id];
      if (!item) return;

      try {
        setIsSyncing(true);

        // Add to sync queue
        await offlineStorage.addToSyncQueue({
          type: 'UPDATE',
          endpoint: `/${dataType}/${id}`,
          data: item.data,
          priority: 'high',
        });

        // Update local status
        const updatedItem: OfflineDataItem<T> = {
          ...item,
          status: 'pending',
          syncAttempts: item.syncAttempts + 1,
        };

        const updatedData = {
          ...data,
          [id]: updatedItem,
        };

        await saveData(updatedData);
      } catch (error) {
        logger.error(`Error syncing ${dataType} item ${id}:`, error);

        // Update error status
        const errorItem: OfflineDataItem<T> = {
          ...item,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          syncAttempts: item.syncAttempts + 1,
        };

        const updatedData = {
          ...data,
          [id]: errorItem,
        };

        await saveData(updatedData);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [data, dataType, saveData]
  );

  // Sync all pending items
  const syncAll = useCallback(async (): Promise<void> => {
    try {
      setIsSyncing(true);

      const pendingItems = getItemsByStatus('pending');
      const promises = pendingItems.map((_, index) => {
        const id = Object.keys(data)[index];
        return syncItem(id);
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error(`Error syncing all ${dataType} items:`, error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [data, getItemsByStatus, syncItem]);

  // Mark item as synced
  const markAsSynced = useCallback(
    async (id: string): Promise<void> => {
      const item = data[id];
      if (!item) return;

      const updatedItem: OfflineDataItem<T> = {
        ...item,
        status: 'synced',
        syncAttempts: 0,
        errorMessage: undefined,
      };

      const updatedData = {
        ...data,
        [id]: updatedItem,
      };

      await saveData(updatedData);
    },
    [data, saveData]
  );

  // Resolve conflict for item
  const resolveConflict = useCallback(
    async (
      id: string,
      resolvedData: T,
      strategy: 'serverWins' | 'clientWins' | 'merge' = conflictResolutionStrategy
    ): Promise<void> => {
      try {
        const item = data[id];
        if (!item) return;

        const resolvedItem: OfflineDataItem<T> = {
          ...item,
          data: resolvedData,
          status: 'pending',
          lastModified: Date.now(),
          syncAttempts: 0,
          errorMessage: undefined,
        };

        const updatedData = {
          ...data,
          [id]: resolvedItem,
        };

        await saveData(updatedData);
      } catch (error) {
        logger.error(`Error resolving conflict for ${dataType} item ${id}:`, error);
        throw error;
      }
    },
    [data, dataType, conflictResolutionStrategy, saveData]
  );

  // Clear all data
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await offlineStorage.remove(dataType);
      setData({});
    } catch (error) {
      logger.error(`Error clearing ${dataType} data:`, error);
      throw error;
    }
  }, [dataType]);

  // Refresh data from storage
  const refresh = useCallback(async (): Promise<void> => {
    await loadData();
    await refreshNetworkStatus();
  }, [loadData, refreshNetworkStatus]);

  // Auto-sync when coming online
  useEffect(() => {
    if (autoSync && isOnline && Object.keys(data).length > 0) {
      const pendingItems = getItemsByStatus('pending');
      if (pendingItems.length > 0) {
        syncAll().catch(error => {
          logger.error('Auto-sync failed:', error);
        });
      }
    }
  }, [autoSync, isOnline, data, getItemsByStatus, syncAll]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Data access
    data,
    getItem,
    getItemsByStatus,

    // CRUD operations
    addItem,
    updateItem,
    deleteItem,

    // Sync operations
    syncItem,
    syncAll,
    markAsSynced,
    resolveConflict,

    // Status
    isLoading,
    isSyncing,
    isOnline,

    // Management
    clearAll,
    refresh,

    // Stats
    totalCount: Object.keys(data).length,
    pendingCount: getItemsByStatus('pending').length,
    syncedCount: getItemsByStatus('synced').length,
    errorCount: getItemsByStatus('error').length,
  };
}

/**
 * Specialized hook for course data
 */
export function useOfflineCourses() {
  return useOfflineData<any>('courses', {
    autoSync: true,
    conflictResolutionStrategy: 'serverWins',
  });
}

/**
 * Specialized hook for user data
 */
export function useOfflineUserData() {
  return useOfflineData<any>('userData', {
    autoSync: true,
    conflictResolutionStrategy: 'clientWins',
  });
}

/**
 * Specialized hook for settings
 */
export function useOfflineSettings() {
  return useOfflineData<any>('settings', {
    autoSync: false, // Settings typically don't need server sync
    conflictResolutionStrategy: 'clientWins',
  });
}

export default useOfflineData;
