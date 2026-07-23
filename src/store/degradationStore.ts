/**
 * Graceful Degradation State Management
 *
 * Tracks feature availability and degradation states across the app.
 * Stores user preferences for feature fallbacks and degradation notifications.
 *
 * Usage:
 * const store = useDegradationStore();
 * if (store.isFeatureDegraded('camera')) {
 *   // Show degradation banner
 * }
 *
 * Persistence notes:
 * - `degradedFeatures` was previously typed as `Set<FeatureType>`.
 *   JSON.stringify(new Set([...])) produces `{}` — an empty object — so the
 *   Set was silently lost on every app restart.  It is now stored as a plain
 *   `FeatureType[]` array (version 2) and converted to a Set only at read
 *   time for O(1) membership tests via `selectDegradedFeaturesSet`.
 * - The persistence `version` was bumped to 2 so that any previously-written
 *   corrupt state (where degradedFeatures serialised as `{}`) is discarded and
 *   the store starts fresh with correct defaults.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useFeatureFlagStore } from './featureFlagStore';
import { asyncStorageJSONStorage, createHydrationErrorRecovery } from './persistence';
import { FeatureStatus, FeatureType } from '../services/featureCapabilities';

export interface DegradationNotification {
  id: string;
  feature: FeatureType;
  status: FeatureStatus;
  message: string;
  showedAt: string; // ISO timestamp
  dismissedAt?: string;
  actionTaken?: string; // 'retryRequested' | 'dismissed' | 'acknowledged'
}

export interface DegradationPreferences {
  showDegradationBanners: boolean; // Show UI notices for degraded features
  autoDismissDegradationAlerts: boolean; // Auto-dismiss alerts after 5 seconds
  remindPermissionRetry: boolean; // Remind user to grant permissions after 1 hour
  enableFallbackUX: boolean; // Use fallback UX when features unavailable (always true)
  respectRemoteFlags: boolean; // Check remote feature flags before marking feature available
}

interface DegradationState {
  // Track which features are degraded.
  // Stored as a plain array so Zustand's persist middleware can serialize it
  // through JSON without data loss (Set serialises to {}).
  degradedFeatures: FeatureType[];
  featureStatuses: Record<FeatureType, FeatureStatus>;

  // Notifications about degradation
  notifications: DegradationNotification[];

  // User preferences
  preferences: DegradationPreferences;

  // Actions - Feature status
  setFeatureStatus: (feature: FeatureType, status: FeatureStatus) => void;
  isFeatureDegraded: (feature: FeatureType) => boolean;
  getDegradedFeatures: () => FeatureType[];

  // Actions - Notifications
  addNotification: (notification: Omit<DegradationNotification, 'id' | 'showedAt'>) => string;
  dismissNotification: (notificationId: string, action?: string) => void;
  clearNotifications: () => void;
  getUnreadNotifications: () => DegradationNotification[];

  // Actions - Preferences
  setShowDegradationBanners: (show: boolean) => void;
  setAutoDismissAlerts: (autoDismiss: boolean) => void;
  setRemindPermissionRetry: (remind: boolean) => void;
  setRespectRemoteFlags: (respect: boolean) => void;

  // Actions - Runtime feature toggling (e.g. memory pressure)
  disableFeature: (feature: FeatureType, reason?: string) => void;
  enableFeature: (feature: FeatureType) => void;
}

const DEFAULT_PREFERENCES: DegradationPreferences = {
  showDegradationBanners: true,
  autoDismissDegradationAlerts: true,
  remindPermissionRetry: true,
  enableFallbackUX: true,
  respectRemoteFlags: true,
};

let notificationIdCounter = 0;

const createInitialDegradationState = () => ({
  degradedFeatures: [],
  featureStatuses: {
    [FeatureType.CAMERA]: FeatureStatus.UNAVAILABLE,
    [FeatureType.PUSH_NOTIFICATIONS]: FeatureStatus.UNAVAILABLE,
    [FeatureType.LOCATION]: FeatureStatus.AVAILABLE,
  },
  notifications: [],
  preferences: DEFAULT_PREFERENCES,
});

let resetDegradationStoreAfterHydrationError = () => {};

/**
 * Convert the stored `degradedFeatures` array to a Set for O(1) membership
 * tests.  This is the canonical read-time selector; it does not mutate state.
 */
export function selectDegradedFeaturesSet(
  state: Pick<DegradationState, 'degradedFeatures'>
): Set<FeatureType> {
  return new Set(state.degradedFeatures);
}

export const useDegradationStore = create<DegradationState>()(
  persist(
    (set, get): DegradationState => {
      resetDegradationStoreAfterHydrationError = () => set(createInitialDegradationState());

      return {
        // Initial state
        // Stored as FeatureType[] — not Set — to survive JSON round-trips.
        ...createInitialDegradationState(),

        // Feature status actions
        setFeatureStatus: (feature, status) =>
          set(state => {
            const isDegraded =
              status === FeatureStatus.PERMISSION_DENIED ||
              status === FeatureStatus.HARDWARE_UNAVAILABLE ||
              status === FeatureStatus.UNAVAILABLE;

            // Use a Set for deduplication, then spread back to array for
            // JSON-serialisability (Set -> {} under JSON.stringify).
            const updatedSet = new Set(state.degradedFeatures);
            if (isDegraded) {
              updatedSet.add(feature);
            } else {
              updatedSet.delete(feature);
            }

            return {
              degradedFeatures: [...updatedSet],
              featureStatuses: {
                ...state.featureStatuses,
                [feature]: status,
              },
            };
          }),

        isFeatureDegraded: (feature: FeatureType): boolean => {
          const status = get().featureStatuses[feature];
          const hardwareDegraded =
            status === FeatureStatus.PERMISSION_DENIED ||
            status === FeatureStatus.HARDWARE_UNAVAILABLE ||
            status === FeatureStatus.UNAVAILABLE ||
            status === FeatureStatus.DEGRADED;

          if (hardwareDegraded) return true;

          if (get().preferences.respectRemoteFlags) {
            const featureFlags = useFeatureFlagStore.getState();
            if (featureFlags.isEnabled(feature, true) === false) {
              return true;
            }
          }

          return false;
        },

        getDegradedFeatures: (): FeatureType[] => {
          const features: FeatureType[] = [];
          for (const feature of Object.values(FeatureType)) {
            if (get().isFeatureDegraded(feature as FeatureType)) {
              features.push(feature as FeatureType);
            }
          }
          return features;
        },

        // Notification actions
        addNotification: (
          notification: Omit<DegradationNotification, 'id' | 'showedAt'>
        ): string => {
          const id = `notif_${++notificationIdCounter}_${Date.now()}`;
          const newNotification: DegradationNotification = {
            ...notification,
            id,
            showedAt: new Date().toISOString(),
          };

          set(state => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
          }));

          return id;
        },

        dismissNotification: (notificationId: string, action?: string) => {
          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === notificationId
                ? { ...n, dismissedAt: new Date().toISOString(), actionTaken: action }
                : n
            ),
          }));
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        getUnreadNotifications: (): DegradationNotification[] => {
          return get().notifications.filter(n => !n.dismissedAt);
        },

        // Preference actions
        setShowDegradationBanners: (show: boolean) => {
          set(state => ({
            preferences: { ...state.preferences, showDegradationBanners: show },
          }));
        },

        setAutoDismissAlerts: (autoDismiss: boolean) => {
          set(state => ({
            preferences: { ...state.preferences, autoDismissDegradationAlerts: autoDismiss },
          }));
        },

        setRemindPermissionRetry: (remind: boolean) => {
          set(state => ({
            preferences: { ...state.preferences, remindPermissionRetry: remind },
          }));
        },

        setRespectRemoteFlags: (respect: boolean) => {
          set(state => ({
            preferences: { ...state.preferences, respectRemoteFlags: respect },
          }));
        },

        // Runtime feature toggling (used by memoryPressureService for graceful degradation)
        disableFeature: (feature: FeatureType, reason?: string) => {
          set(state => {
            const updatedSet = new Set(state.degradedFeatures);
            updatedSet.add(feature);
            return {
              degradedFeatures: [...updatedSet],
              featureStatuses: {
                ...state.featureStatuses,
                [feature]: FeatureStatus.DEGRADED,
              },
            };
          });
        },

        enableFeature: (feature: FeatureType) => {
          set(state => {
            const updatedSet = new Set(state.degradedFeatures);
            updatedSet.delete(feature);
            return {
              degradedFeatures: [...updatedSet],
              featureStatuses: {
                ...state.featureStatuses,
                [feature]: FeatureStatus.AVAILABLE,
              },
            };
          });
        },
      };
    },
    {
      name: 'degradation-store',
      storage: asyncStorageJSONStorage,
      onRehydrateStorage: createHydrationErrorRecovery(
        'degradation-store',
        resetDegradationStoreAfterHydrationError
      ),
      /**
       * Version 2: bumped from 1 (implicit) to discard any previously-persisted
       * state where `degradedFeatures` was serialised as `{}` (empty object)
       * due to JSON.stringify(Set) producing `{}`.
       */
      version: 2,
      migrate: (_persistedState, _fromVersion) => {
        // Any state written by version 1 (or earlier) had a corrupt
        // `degradedFeatures: {}`.  Return undefined so Zustand falls back to
        // the initial state defined above.
        return undefined;
      },
      partialize: state => ({
        preferences: state.preferences,
        notifications: state.notifications,
        featureStatuses: state.featureStatuses,
        // Include degradedFeatures so it survives app restarts.
        // Safe to persist now that it is a plain array, not a Set.
        degradedFeatures: state.degradedFeatures,
      }),
    }
  )
);
