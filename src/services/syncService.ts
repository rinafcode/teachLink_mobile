import * as Network from 'expo-network';

import apiService from './api';
import batchClient from './api/batchClient';
import { offlineStorage, SyncOperation, SyncOperationType } from './offlineStorage';
import syncEntityManager from './sync/syncEntityManager';
import { useSettingsStore } from '../store/settingsStore';
import logger from '../utils/logger';

import type {
    ConflictResolutionStrategy as VersionedConflictResolutionStrategy,
    VersionedEntity,
} from './sync/types';


// Sync service configuration
interface SyncConfig {
  maxConcurrentSyncs: number;
  retryDelay: number;
  syncInterval: number;
  batchSize: number;
}

// Conflict resolution strategies
type LegacyConflictResolutionStrategy = 'serverWins' | 'clientWins' | 'merge' | 'manual';
type ConflictResolutionStrategy =
  | VersionedConflictResolutionStrategy
  | LegacyConflictResolutionStrategy;

// Sync event types
type SyncEventType =
  | 'syncStarted'
  | 'syncCompleted'
  | 'syncFailed'
  | 'operationProcessed'
  | 'conflictDetected'
  | 'conflictResolved';

// Sync event interface
interface SyncEvent {
  type: SyncEventType;
  operationId?: string;
  data?: any;
  error?: any;
  timestamp: number;
}

class SyncService {
  private isSyncing: boolean = false;
  private syncIntervalId: any = null;
  private eventListeners: ((event: SyncEvent) => void)[] = [];
  private config: SyncConfig;

  constructor(config?: Partial<SyncConfig>) {
    this.config = {
      maxConcurrentSyncs: 3,
      retryDelay: 5000, // 5 seconds
      syncInterval: 30000, // 30 seconds
      batchSize: 10,
      ...config,
    };
  }

  /**
   * Start automatic sync process
   */
  startAutoSync(): void {
    if (this.syncIntervalId) {
      logger.warn('Auto sync is already running');
      return;
    }

    this.syncIntervalId = setInterval(() => {
      this.syncPendingOperations();
    }, this.config.syncInterval);

    logger.info('Auto sync started');
    this.emitEvent({ type: 'syncStarted', timestamp: Date.now() });
  }

  /**
   * Stop automatic sync process
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      logger.info('Auto sync stopped');
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    logger.info('Manual sync triggered');
    await this.syncPendingOperations(true);
  }

  /**
   * Main sync process
   */
  private async syncPendingOperations(isManual = false): Promise<void> {
    if (this.isSyncing) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    const settings = useSettingsStore.getState();
    if (settings.dataSaverEnabled && !isManual) {
      logger.debug('SyncService: Skipped auto-sync — Data Saver mode enabled');
      return;
    }

    // Check network connectivity
    const isConnected = await this.checkConnectivity();
    if (!isConnected) {
      logger.debug('No network connectivity, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) {
        logger.debug('No pending operations to sync');
        return;
      }

      logger.info(`Starting sync for ${queue.length} operations`);

      // Process operations in batches
      const batches = this.createBatches(queue, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      logger.info('Sync completed successfully');
      this.emitEvent({ type: 'syncCompleted', timestamp: Date.now() });
    } catch (error) {
      logger.error('Sync failed:', error);
      this.emitEvent({ 
        type: 'syncFailed', 
        error, 
        timestamp: Date.now() 
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a batch of operations — mutation types are combined into a single
   * POST /api/batch request; READ operations continue on the individual path.
   */
  private async processBatch(operations: SyncOperation[]): Promise<void> {
    const reads = operations.filter(op => op.type === 'READ');
    const mutations = operations.filter(op => op.type !== 'READ');

    const readPromises = reads.map(op => this.processOperation(op));

    const mutationPromises = mutations.map(op => {
      const method = this.mapOperationToMethod(op.type);
      if (!method) return this.processOperation(op);

      return batchClient
        .mutate(method, op.endpoint, op.data)
        .then(async result => {
          await offlineStorage.removeFromSyncQueue(op.id);
          logger.info(`Batch operation completed: ${op.id}`);
          this.emitEvent({
            type: 'operationProcessed',
            operationId: op.id,
            data: result,
            timestamp: Date.now(),
          });
        })
        .catch(async (error: any) => {
          logger.error(`Batch operation failed: ${op.id}`, error);
          if (op.retries < op.maxRetries) {
            await offlineStorage.incrementRetryCount(op.id);
            setTimeout(
              () => this.retryOperation(op.id),
              this.calculateRetryDelay(op.retries),
            );
          } else {
            this.handlePermanentFailure(op, error);
          }
          this.emitEvent({
            type: 'syncFailed',
            operationId: op.id,
            error,
            timestamp: Date.now(),
          });
        });
    });

    // mutate() calls above are synchronous enqueues; flush sends them as one request.
    await Promise.all([batchClient.flush(), ...mutationPromises, ...readPromises]);
  }

  private mapOperationToMethod(
    type: SyncOperationType,
  ): 'POST' | 'PUT' | 'DELETE' | null {
    if (type === 'CREATE') return 'POST';
    if (type === 'UPDATE') return 'PUT';
    if (type === 'DELETE') return 'DELETE';
    return null;
  }

  /**
   * Process individual operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      logger.debug(`Processing operation: ${operation.type} ${operation.endpoint}`);

      // Execute API call based on operation type
      let result;
      switch (operation.type) {
        case 'CREATE':
          result = await apiService.post(operation.endpoint, operation.data);
          break;
        case 'UPDATE':
          result = await apiService.put(operation.endpoint, operation.data);
          break;
        case 'DELETE':
          result = await apiService.delete(operation.endpoint);
          break;
        case 'READ':
          result = await apiService.get(operation.endpoint);
          break;
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      // Remove successful operation from queue
      await offlineStorage.removeFromSyncQueue(operation.id);
      
      logger.info(`Operation completed: ${operation.id}`);
      this.emitEvent({
        type: 'operationProcessed',
        operationId: operation.id,
        data: result,
        timestamp: Date.now()
      });

    } catch (error: any) {
      logger.error(`Operation failed: ${operation.id}`, error);

      // Handle retry logic
      if (operation.retries < operation.maxRetries) {
        await offlineStorage.incrementRetryCount(operation.id);
        
        // Schedule retry with exponential backoff
        setTimeout(() => {
          this.retryOperation(operation.id);
        }, this.calculateRetryDelay(operation.retries));
      } else {
        logger.error(`Operation failed permanently after ${operation.maxRetries} retries: ${operation.id}`);
        // Move to failed operations for manual handling
        this.handlePermanentFailure(operation, error);
      }

      this.emitEvent({
        type: 'syncFailed',
        operationId: operation.id,
        error,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Retry a failed operation
   */
  private async retryOperation(operationId: string): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();
    const operation = queue.find(op => op.id === operationId);
    
    if (operation) {
      await this.processOperation(operation);
    }
  }

  /**
   * Handle permanent failure
   */
  private async handlePermanentFailure(operation: SyncOperation, error: any): Promise<void> {
    // Log failed operation for manual review
    logger.error('Permanent sync failure:', {
      operation,
      error: error.message,
      timestamp: Date.now()
    });

    // Could implement notification system here
    // For now, we keep it in the queue for manual intervention
  }

  /**
   * Check network connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return (networkState.isConnected ?? false) && (networkState.isInternetReachable ?? false);
    } catch (error) {
      logger.error('Error checking connectivity:', error);
      return false;
    }
  }

  /**
   * Create batches from operations array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelay * Math.pow(2, retryCount);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: SyncEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  removeAllEventListeners(): void {
    if (this.eventListeners.length > 0) {
      this.eventListeners = [];
      logger.info('SyncService: Cleared all sync event listeners due to memory pressure');
    }
  }

  /**
   * Emit sync event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in sync event listener:', error);
      }
    });
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pendingCount: number;
    failedCount: number;
    isSyncing: boolean;
    lastSyncTime?: number;
  }> {
    const pendingCount = await offlineStorage.getPendingOperationsCount();
    const failedOperations = await offlineStorage.getFailedOperations();
    
    return {
      pendingCount,
      failedCount: failedOperations.length,
      isSyncing: this.isSyncing,
      // Could store last sync time in AsyncStorage if needed
    };
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflicts(
    localData: any,
    serverData: any,
    strategy: ConflictResolutionStrategy = 'server-wins',
    baseData?: any,
  ): Promise<any> {
    const normalizedStrategy = this.normalizeConflictStrategy(strategy);

    this.emitEvent({
      type: 'conflictDetected',
      data: { localData, serverData, strategy: normalizedStrategy },
      timestamp: Date.now()
    });

    if (strategy === 'manual') {
      return { local: localData, server: serverData, base: baseData };
    }

    const result = syncEntityManager.resolveRawConflict(
      localData,
      serverData,
      normalizedStrategy,
      baseData,
    );

    this.emitEvent({
      type: 'conflictResolved',
      data: result,
      timestamp: Date.now()
    });

    return result.resolved.data;
  }

  /**
   * Resolve a versioned conflict and persist the result in the version store.
   */
  resolveVersionedConflict<T extends Record<string, unknown>>(
    serverEntity: VersionedEntity<T>,
    strategy: ConflictResolutionStrategy = 'merge',
    baseEntity?: VersionedEntity<T>,
  ) {
    const normalizedStrategy = this.normalizeConflictStrategy(strategy);
    return syncEntityManager.handleServerEntity(serverEntity, normalizedStrategy, baseEntity);
  }

  private normalizeConflictStrategy(
    strategy: ConflictResolutionStrategy,
  ): VersionedConflictResolutionStrategy {
    switch (strategy) {
      case 'serverWins':
        return 'server-wins';
      case 'clientWins':
        return 'client-wins';
      case 'manual':
        return 'server-wins';
      default:
        return strategy;
    }
  }

  /**
   * Clear failed operations
   */
  async clearFailedOperations(): Promise<void> {
    const failedOps = await offlineStorage.getFailedOperations();
    for (const op of failedOps) {
      await offlineStorage.removeFromSyncQueue(op.id);
    }
    logger.info(`Cleared ${failedOps.length} failed operations`);
  }
}

// Export singleton instance
export const syncService = new SyncService();

export default syncService;
