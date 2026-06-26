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
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FeatureStatus, FeatureType } from './featureCapabilities';

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
}

interface DegradationState {
  // Track which features are degraded
  degradedFeatures: Set<FeatureType>;
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
}

const DEFAULT_PREFERENCES: DegradationPreferences = {
  showDegradationBanners: true,
  autoDismissDegradationAlerts: true,
  remindPermissionRetry: true,
  enableFallbackUX: true,
};

let notificationIdCounter = 0;

export const useDegradationStore = create<DegradationState>()(
  persist(
    (set, get) => ({
      // Initial state
      degradedFeatures: new Set(),
      featureStatuses: {
        [FeatureType.CAMERA]: FeatureStatus.UNAVAILABLE,
        [FeatureType.PUSH_NOTIFICATIONS]: FeatureStatus.UNAVAILABLE,
        [FeatureType.LOCATION]: FeatureStatus.AVAILABLE,
      },
      notifications: [],
      preferences: DEFAULT_PREFERENCES,

      // Feature status actions
      setFeatureStatus: (feature, status) =>
        set((state) => {
          const newDegraded = new Set(state.degradedFeatures);
          const isDegraded = status === FeatureStatus.PERMISSION_DENIED ||
                            status === FeatureStatus.HARDWARE_UNAVAILABLE ||
                            status === FeatureStatus.UNAVAILABLE;

          if (isDegraded) {
            newDegraded.add(feature);
          } else {
            newDegraded.delete(feature);
          }

          return {
            degradedFeatures: newDegraded,
            featureStatuses: {
              ...state.featureStatuses,
              [feature]: status,
            },
          };
        }),

      isFeatureDegraded: (feature: FeatureType): boolean => {
        const status = get().featureStatuses[feature];
        return status === FeatureStatus.PERMISSION_DENIED ||
               status === FeatureStatus.HARDWARE_UNAVAILABLE ||
               status === FeatureStatus.UNAVAILABLE;
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
      addNotification: (notification: Omit<DegradationNotification, 'id' | 'showedAt'>): string => {
        const id = `notif_${++notificationIdCounter}_${Date.now()}`;
        const newNotification: DegradationNotification = {
          ...notification,
          id,
          showedAt: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
        }));

        return id;
      },

      dismissNotification: (notificationId: string, action?: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
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
        return get().notifications.filter((n) => !n.dismissedAt);
      },

      // Preference actions
      setShowDegradationBanners: (show: boolean) => {
        set((state) => ({
          preferences: { ...state.preferences, showDegradationBanners: show },
        }));
      },

      setAutoDismissAlerts: (autoDismiss: boolean) => {
        set((state) => ({
          preferences: { ...state.preferences, autoDismissDegradationAlerts: autoDismiss },
        }));
      },

      setRemindPermissionRetry: (remind: boolean) => {
        set((state) => ({
          preferences: { ...state.preferences, remindPermissionRetry: remind },
        }));
      },
    }),
    {
      name: 'degradation-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        notifications: state.notifications,
        featureStatuses: state.featureStatuses,
      }),
    }
  )
);
