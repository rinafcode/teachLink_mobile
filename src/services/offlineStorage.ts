import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '../utils/logger';

// Storage keys
const STORAGE_KEYS = {
  COURSE_DATA: '@teachlink_courses',
  USER_DATA: '@teachlink_user',
  SYNC_QUEUE: '@teachlink_sync_queue',
  SETTINGS: '@teachlink_settings',
  PROGRESS_DATA: '@teachlink_progress',
  BOOKMARKS: '@teachlink_bookmarks',
  NOTES: '@teachlink_notes',
};

// Generic storage interface
interface StorageItem<T> {
  data: T;
  timestamp: number;
  version: number;
}

// Sync operation types
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
export type SyncConflictResolutionStrategy = 'server-wins' | 'client-wins' | 'manual';

// Sync operation interface
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  endpoint: string;
  data?: any;
  localVersion?: number;
  lastModified?: number;
  baseData?: any;
  conflictStrategy?: SyncConflictResolutionStrategy;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

// Input type for addToSyncQueue (without auto-generated fields)
export type SyncOperationInput = Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'maxRetries'>;

class OfflineStorage {
  private readonly MAX_RETRIES = 3;
  private readonly HIGH_PRIORITY_OPERATIONS: SyncOperationType[] = ['CREATE', 'UPDATE'];

  /**
   * Store data locally with metadata
   */
  async store<T>(key: string, data: T, version: number = 1): Promise<void> {
    try {
      const item: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        version,
      };
      await AsyncStorage.setItem(key, JSON.stringify(item));
      logger.info(`Stored data for key: ${key}`);
    } catch (error) {
      logger.error(`Error storing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from local storage
   */
  async retrieve<T>(key: string): Promise<T | null> {
    try {
      const itemStr = await AsyncStorage.getItem(key);
      if (!itemStr) return null;

      const item: StorageItem<T> = JSON.parse(itemStr);
      return item.data;
    } catch (error) {
      logger.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Check if data exists locally
   */
  async exists(key: string): Promise<boolean> {
    try {
      const item = await AsyncStorage.getItem(key);
      return item !== null;
    } catch (error) {
      logger.error(`Error checking existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove data from local storage
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      logger.info(`Removed data for key: ${key}`);
    } catch (error) {
      logger.error(`Error removing data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
      logger.info('Cleared all local storage');
    } catch (error) {
      logger.error('Error clearing local storage:', error);
      throw error;
    }
  }

  /**
   * Get storage size estimation
   */
  async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error('Error getting storage size:', error);
      return 0;
    }
  }

  // === Course Data Methods ===

  async storeCourse(courseId: string, courseData: any): Promise<void> {
    const key = `${STORAGE_KEYS.COURSE_DATA}_${courseId}`;
    await this.store(key, courseData);
  }

  async getCourse(courseId: string): Promise<any | null> {
    const key = `${STORAGE_KEYS.COURSE_DATA}_${courseId}`;
    return await this.retrieve(key);
  }

  async getAllCourses(): Promise<any[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const courseKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.COURSE_DATA));

      const courses = [];
      for (const key of courseKeys) {
        const course = await this.retrieve(key);
        if (course) {
          courses.push(course);
        }
      }

      return courses;
    } catch (error) {
      logger.error('Error getting all courses:', error);
      return [];
    }
  }

  // === Progress Data Methods ===

  async storeProgress(courseId: string, progressData: any): Promise<void> {
    const key = `${STORAGE_KEYS.PROGRESS_DATA}_${courseId}`;
    await this.store(key, progressData);
  }

  async getProgress(courseId: string): Promise<any | null> {
    const key = `${STORAGE_KEYS.PROGRESS_DATA}_${courseId}`;
    return await this.retrieve(key);
  }

  // === Bookmarks Methods ===

  async storeBookmarks(courseId: string, bookmarks: string[]): Promise<void> {
    const key = `${STORAGE_KEYS.BOOKMARKS}_${courseId}`;
    await this.store(key, bookmarks);
  }

  async getBookmarks(courseId: string): Promise<string[]> {
    const key = `${STORAGE_KEYS.BOOKMARKS}_${courseId}`;
    const bookmarks = await this.retrieve<string[]>(key);
    return bookmarks || [];
  }

  // === Notes Methods ===

  async storeNotes(courseId: string, notes: any): Promise<void> {
    const key = `${STORAGE_KEYS.NOTES}_${courseId}`;
    await this.store(key, notes);
  }

  async getNotes(courseId: string): Promise<any> {
    const key = `${STORAGE_KEYS.NOTES}_${courseId}`;
    const notes = await this.retrieve(key);
    return notes || {};
  }

  // === Sync Queue Methods ===

  async addToSyncQueue(operation: SyncOperationInput): Promise<string> {
    try {
      const queue = await this.getSyncQueue();
      const existingIndex = queue.findIndex(
        op =>
          op.endpoint === operation.endpoint &&
          op.type === operation.type &&
          op.retries < op.maxRetries
      );

      const syncOp: SyncOperation = {
        id: existingIndex >= 0 ? queue[existingIndex].id : this.generateOperationId(),
        ...operation,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: this.MAX_RETRIES,
      };

      if (existingIndex >= 0) {
        queue[existingIndex] = syncOp;
      } else {
        queue.push(syncOp);
      }

      // Sort by priority and timestamp
      queue.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });

      await this.store(STORAGE_KEYS.SYNC_QUEUE, queue);
      logger.info(`Queued operation for sync: ${syncOp.type} ${syncOp.endpoint}`);

      return syncOp.id;
    } catch (error) {
      logger.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const queue = await this.retrieve<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE);
    return queue || [];
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filteredQueue = queue.filter(op => op.id !== operationId);
      await this.store(STORAGE_KEYS.SYNC_QUEUE, filteredQueue);
      logger.info(`Removed operation from sync queue: ${operationId}`);
    } catch (error) {
      logger.error(`Error removing operation ${operationId} from sync queue:`, error);
    }
  }

  async incrementRetryCount(operationId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const operation = queue.find(op => op.id === operationId);

      if (operation) {
        operation.retries += 1;
        await this.store(STORAGE_KEYS.SYNC_QUEUE, queue);
      }
    } catch (error) {
      logger.error(`Error incrementing retry count for operation ${operationId}:`, error);
    }
  }

  async clearSyncQueue(): Promise<void> {
    await this.store(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  async getPendingOperationsCount(): Promise<number> {
    const queue = await this.getSyncQueue();
    return queue.length;
  }

  async getFailedOperations(): Promise<SyncOperation[]> {
    const queue = await this.getSyncQueue();
    return queue.filter(op => op.retries >= op.maxRetries);
  }

  // === Utility Methods ===

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all storage keys for debugging
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      logger.error('Error getting all keys:', error);
      return [];
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Export storage keys for external use
export { STORAGE_KEYS };

export default offlineStorage;
