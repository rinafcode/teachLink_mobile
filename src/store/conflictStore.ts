import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import apiClient from '../services/api/axios.config';
import { logger } from '../utils/logger';

/**
 * Resolution strategy for conflicts
 */
export type ConflictResolutionChoice = 'local' | 'server' | 'merge';

/**
 * Data structure representing a detected conflict
 */
export interface ConflictData {
  /** Unique identifier for this conflict instance */
  id: string;
  /** Entity identifier (e.g., note ID, quiz ID) */
  entityId: string;
  /** Entity type (e.g., 'note', 'quiz', 'profile') */
  entityType: string;
  /** Local (client) data that was being sent */
  localData: unknown;
  /** Server's current data */
  serverData: unknown;
  /** Client's last known version number */
  localVersion?: number;
  /** Server's current version number */
  serverVersion?: number;
  /** Timestamp when client mutation was created */
  clientTimestamp: number;
  /** Timestamp when server data was fetched */
  serverTimestamp: number;
  /** API endpoint that triggered the conflict */
  endpoint: string;
  /** HTTP method (PUT, PATCH, POST, DELETE) */
  method: string;
  /** When the conflict was detected */
  detectedAt: number;
}

/**
 * Result of resolving a conflict
 */
export interface ConflictResolution {
  conflictId: string;
  choice: ConflictResolutionChoice;
  resolvedData: unknown;
  resolvedAt: number;
}

interface ConflictStoreState {
  /** Queue of unresolved conflicts */
  conflicts: ConflictData[];
  /** Currently displayed conflict (for modal) */
  activeConflict: ConflictData | null;
  /** Whether the resolution modal is visible */
  isModalVisible: boolean;
  /** History of resolved conflicts for debugging/analytics */
  resolutionHistory: ConflictResolution[];
  /** Whether a resolution is in progress */
  isResolving: boolean;

  // Actions
  addConflict: (conflict: ConflictData) => void;
  removeConflict: (conflictId: string) => void;
  clearAllConflicts: () => void;
  showModal: (conflict?: ConflictData) => void;
  hideModal: () => void;
  resolveConflict: (
    conflictId: string,
    choice: ConflictResolutionChoice,
    mergedData?: unknown
  ) => Promise<void>;
  getConflictById: (conflictId: string) => ConflictData | undefined;
  getPendingCount: () => number;
}

export const useConflictStore = create<ConflictStoreState>()(
  subscribeWithSelector((set, get) => ({
    conflicts: [],
    activeConflict: null,
    isModalVisible: false,
    resolutionHistory: [],
    isResolving: false,

    addConflict: (conflict: ConflictData) => {
      const prevState = get();
      const shouldShowModal = !prevState.isModalVisible && prevState.conflicts.length === 0;

      set(state => {
        // Avoid duplicates for the same entity
        const exists = state.conflicts.some(
          c => c.entityId === conflict.entityId && c.entityType === conflict.entityType
        );
        if (exists) {
          // Replace existing conflict with newer one
          return {
            conflicts: state.conflicts.map(c =>
              c.entityId === conflict.entityId && c.entityType === conflict.entityType
                ? conflict
                : c
            ),
          };
        }
        return { conflicts: [...state.conflicts, conflict] };
      });

      // Auto-show modal for the first conflict if not already showing
      if (shouldShowModal) {
        set({ activeConflict: conflict, isModalVisible: true });
      }

      logger.info(`Conflict added: ${conflict.entityType}/${conflict.entityId}`);
    },

    removeConflict: (conflictId: string) => {
      set(state => ({
        conflicts: state.conflicts.filter(c => c.id !== conflictId),
        activeConflict: state.activeConflict?.id === conflictId ? null : state.activeConflict,
      }));
    },

    clearAllConflicts: () => {
      set({
        conflicts: [],
        activeConflict: null,
        isModalVisible: false,
      });
    },

    showModal: (conflict?: ConflictData) => {
      const state = get();
      const conflictToShow = conflict ?? state.conflicts[0] ?? null;
      set({
        activeConflict: conflictToShow,
        isModalVisible: conflictToShow !== null,
      });
    },

    hideModal: () => {
      set({ isModalVisible: false });
    },

    resolveConflict: async (
      conflictId: string,
      choice: ConflictResolutionChoice,
      mergedData?: unknown
    ) => {
      const state = get();
      const conflict = state.conflicts.find(c => c.id === conflictId);

      if (!conflict) {
        logger.warn(`Conflict not found: ${conflictId}`);
        return;
      }

      set({ isResolving: true });

      try {
        // Determine which data to send
        let resolvedData: unknown;
        switch (choice) {
          case 'local':
            resolvedData = conflict.localData;
            break;
          case 'server':
            resolvedData = conflict.serverData;
            break;
          case 'merge':
            resolvedData = mergedData ?? conflict.localData;
            break;
        }

        // If user chose server version, no need to sync - just accept it
        if (choice !== 'server') {
          // Re-send the mutation with force flag to override server version
          await apiClient({
            method: conflict.method.toLowerCase(),
            url: conflict.endpoint,
            data: resolvedData,
            headers: {
              'X-Force-Override': 'true',
              'X-Conflict-Resolution': choice,
              'X-Server-Version': String(conflict.serverVersion ?? 0),
            },
          });
        }

        // Record resolution
        const resolution: ConflictResolution = {
          conflictId,
          choice,
          resolvedData,
          resolvedAt: Date.now(),
        };

        set(state => ({
          conflicts: state.conflicts.filter(c => c.id !== conflictId),
          resolutionHistory: [...state.resolutionHistory.slice(-49), resolution],
          isResolving: false,
        }));

        // Show next conflict if any
        const remainingConflicts = get().conflicts;
        if (remainingConflicts.length > 0) {
          set({
            activeConflict: remainingConflicts[0],
            isModalVisible: true,
          });
        } else {
          set({
            activeConflict: null,
            isModalVisible: false,
          });
        }

        logger.info(
          `Conflict resolved: ${conflict.entityType}/${conflict.entityId} with choice: ${choice}`
        );
      } catch (error) {
        logger.error('Failed to resolve conflict:', error);
        set({ isResolving: false });
        throw error;
      }
    },

    getConflictById: (conflictId: string) => {
      return get().conflicts.find(c => c.id === conflictId);
    },

    getPendingCount: () => {
      return get().conflicts.length;
    },
  }))
);

// Selector hooks for common use cases
export const useActiveConflict = () => useConflictStore(state => state.activeConflict);

export const useConflictModalVisible = () => useConflictStore(state => state.isModalVisible);

export const usePendingConflictsCount = () => useConflictStore(state => state.conflicts.length);

export const useIsResolvingConflict = () => useConflictStore(state => state.isResolving);

export default useConflictStore;
