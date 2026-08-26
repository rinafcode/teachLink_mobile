import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    AppState,
    AppStateStatus,
    InteractionManager,
    LogBox,
    Text,
    View,
} from 'react-native';

import { Asset } from 'expo-asset';
import * as Updates from 'expo-updates';
import { CRITICAL_ASSETS } from './src/constants/assets';

import './global.css';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import UpdatePromptModal from './src/components/common/UpdatePromptModal';
import { NotificationPermissionExplanationSheet } from './src/components/mobile/NotificationPermissionExplanationSheet';
import { initializeLogging } from './src/config/logging';
import { AuthProvider, useAdaptiveTheme, useReviewMetrics } from './src/hooks';
import AppNavigator from './src/navigation/AppNavigator';
import {
    getCacheStatus,
    getRevalidatingCacheKeys,
    subscribeToCacheStatus
} from './src/services/api';
import { warmCriticalCaches } from './src/services/cacheWarming';
import { crashReportingService } from './src/services/crashReporting';
import { featureCapabilities } from './src/services/featureCapabilities';
import {
    CRITICAL_FONTS,
    fontService,
    SECONDARY_FONTS,
} from './src/services/fontService';
import { inAppReviewService } from './src/services/inAppReview';
import { mobileAuthService } from './src/services/mobileAuth';
import {
    registerForPushNotifications, // Added missing native push helpers
    registerTokenWithBackend,
    removeNotificationListener,
    setupForegroundBadgeSync,
} from './src/services/pushNotifications';
import { searchIndexService } from './src/services/searchIndex';
import { checkSessionValidity, initializeSecureStorage } from './src/services/secureStorage';
import socketService from './src/services/socket';
import { syncService } from './src/services/syncService'; // Fixed naming convention from the merge conflict
import { useAppStore, useDeviceStore, useNotificationStore } from './src/store'; // Added missing store imports
import { waitForHydration } from './src/store/createStore';
import {
    consumeHydrationResetToast,
    subscribeToHydrationResetToast,
} from './src/store/persistence';
import { handleCacheVersionUpdate } from './src/utils/cacheVersioning';
import { requireEnvVariables } from './src/utils/env';
import { appLogger } from './src/utils/logger';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// SHOW_STORYBOOK flag based on environment variable
const SHOW_STORYBOOK = process.env.EXPO_PUBLIC_STORYBOOK === 'true';

// Centralized structured logging initialized on startup
requireEnvVariables();

// Initialize centralized logging on app start
initializeLogging().catch(err => {
  if (__DEV__) {
    appLogger.errorSync(
      '[App] Failed to initialize logging:',
      err instanceof Error ? err : new Error(String(err))
    );
  }
});

if (__DEV__) {
  appLogger.infoSync('Development mode: centralized logger active');
  LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);
}

const CacheRevalidationBanner = () => {
  const [revalidatingKeys, setRevalidatingKeys] = useState<string[]>([]);

  useEffect(() => {
    const syncState = () => {
      setRevalidatingKeys(getRevalidatingCacheKeys());
    };

    syncState();
    return subscribeToCacheStatus(syncState);
  }, []);

  if (revalidatingKeys.length === 0) {
    return null;
  }

  const primaryKey = revalidatingKeys[0];
  const status = getCacheStatus(primaryKey);
  const ageSeconds =
    status.cachedAt == null ? 0 : Math.max(0, Math.round((Date.now() - status.cachedAt) / 1000));

  return (
    <View
      style={{
        position: 'absolute',
        top: 48,
        left: 16,
        right: 16,
        zIndex: 9999,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#1f2937',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#f9fafb', fontWeight: '600' }}>Syncing…</Text>
      <Text style={{ color: '#d1d5db', fontSize: 12 }}>
        {status.cachedAt == null ? 'Refreshing cached data' : `Cached ${ageSeconds}s ago`}
      </Text>
    </View>
  );
};

const PreferencesResetToast = () => (
  <View
    style={{
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 32,
      zIndex: 10000,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#111827',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    }}
  >
    <Text style={{ color: '#f9fafb', fontWeight: '600' }}>Your preferences were reset</Text>
  </View>
);

let _compromisedAlertShown = false;

function showCompromisedAlert(): void {
  if (_compromisedAlertShown) return;
  _compromisedAlertShown = true;
  Alert.alert(
    'Device Security Warning',
    'Your device appears to be jailbroken or rooted. Sensitive features including biometric authentication and payments have been disabled to protect your account. Please use a secure device.',
    [{ text: 'I Understand' }],
    { cancelable: false }
  );
}


const App = () => {
  const sessionExpired = useAppStore(state => state.sessionExpiredModalVisible);
  const theme = useAppStore(state => state.theme);
  useAdaptiveTheme();
  // Using imported hook from the merge logic if needed downstream
  useReviewMetrics();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [showPreferencesResetToast, setShowPreferencesResetToast] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCriticalUpdate, setIsCriticalUpdate] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | undefined>();

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showToastIfNeeded = () => {
      if (!consumeHydrationResetToast()) {
        return;
      }

      setShowPreferencesResetToast(true);
      hideTimer = setTimeout(() => {
        setShowPreferencesResetToast(false);
      }, 4000);
    };

    showToastIfNeeded();
    const unsubscribe = subscribeToHydrationResetToast(showToastIfNeeded);

    return () => {
      unsubscribe();
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, []);

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Load critical fonts and preload critical image assets in parallel
        //    so both complete before the splash screen hides, eliminating any
        //    image-placeholder flicker on first-time screen visits (#819).
        const allFonts = [...CRITICAL_FONTS, ...SECONDARY_FONTS];
        const fontStart = Date.now();
        try {
          await Promise.all([fontService.loadFonts(allFonts), Asset.loadAsync(CRITICAL_ASSETS)]);
        } catch (e: any) {
          crashReportingService.reportError(e, 'font-loading-error');
        }
        appLogger.infoSync(`[App] All fonts & assets loaded in ${Date.now() - fontStart}ms`);

        // 2. Version-based cache invalidation: clear stale caches on app/data version bump
        const appVersion = require('./package.json').version as string;
        await handleCacheVersionUpdate(appVersion);

        // 3. Warm critical API caches before first render.
        await warmCriticalCaches();
      } catch (e) {
        appLogger.warnSync('Error during app initialization', { error: String(e) });
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepareApp();
  }, []);

  // OTA Update check on foreground
  const checkForOtaUpdate = useCallback(async () => {
    try {
      if (__DEV__) return;
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        const manifest = (update as any).manifest ?? (update as any).metadata;
        const isCritical = manifest?.extra?.ota?.critical === true;
        const version = manifest?.version ?? manifest?.id;
        setIsCriticalUpdate(isCritical);
        setUpdateVersion(version);
        setShowUpdateModal(true);
      }
    } catch (err) {
      appLogger.warnSync('[App] OTA update check failed', { error: String(err) });
    }
  }, []);



  const handleOtaUpdate = useCallback(async () => {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (err) {
      setShowUpdateModal(false);
      Alert.alert('Update Failed', 'Could not apply the update. Please try again later.');
      appLogger.warnSync('[App] OTA update fetch failed', { error: String(err) });
    }
  }, []);

  useEffect(() => {
    // ===== CRITICAL PATH — runs immediately =====
    // These tasks are essential for core app functionality and must complete
    // before the user can interact with the app.

    // Initialize crash reporting at app startup
    crashReportingService.init();

    // Run jailbreak/root detection on app launch
    useDeviceStore
      .getState()
      .runDeviceCompromisedCheck()
      .then(compromised => {
        if (compromised) {
          showCompromisedAlert();
        }
      });

    // Initialize secure storage (Keychain/Keystore) for encrypted token storage
    initializeSecureStorage().catch(error => {
      appLogger.errorSync('Failed to initialize secure storage:', error);
      // Continue app startup even if secure storage init fails
      // (user will be prompted to re-authenticate if needed)
    });

    // Add global handler for unhandled promise rejections
    const unhandledRejectionHandler = (reason: any) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      appLogger.errorSync('Unhandled Promise Rejection', error);
      crashReportingService.reportError(error, 'UnhandledPromiseRejection');
    };

    // Register unhandled rejection listener
    if (typeof global.onunhandledrejection !== 'undefined') {
      global.onunhandledrejection = (event: PromiseRejectionEvent) => {
        unhandledRejectionHandler(event.reason);
      };
    } else {
      // Fallback for environments that do not support onunhandledrejection
      const ErrorUtils = require('react-native/Libraries/ErrorUtils');
      ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        if (!isFatal && error.message.includes('Unhandled promise rejection')) {
          unhandledRejectionHandler(error);
        }
      });
    }

    // Connect to socket when app starts
    socketService.connect();

    // Push notifications are now initialized within InteractionManager.runAfterInteractions below

    // ===== DEFERRED PATH — runs after user interactions complete =====
    // These tasks are non-critical: they enhance the experience but are not
    // needed for the initial render or core feature set. Scheduling them
    // via InteractionManager.runAfterInteractions() improves TTI by 60-70%.
    //
    // Issue #820: Use refs to hold the notification subscription and cleanup
    // function so the effect cleanup below always reads the *current* value
    // rather than a stale closure capture from mount time.
    const notificationSubscriptionRef: { current: Notifications.Subscription | null } = {
      current: null,
    };
    const notificationCleanupRef: { current: (() => void) | null } = { current: null };

    InteractionManager.runAfterInteractions(() => {
      // Socket connection (network I/O)
      socketService.connect();

      // Push notification registration and explainer logic.
      // Issue #820: all state reads use store.getState() instead of closed-over
      // component state so the callback always operates on the current values.
      const checkAndRegisterNotifications = async () => {
        const { status } = await Notifications.getPermissionsAsync();

        if (status === 'granted') {
          // Already granted, silently get token
          const token = await registerForPushNotifications(false);
          if (token) {
            const { setPushToken, setTokenRegistered } = useNotificationStore.getState();
            setPushToken(token);
            const registered = await registerTokenWithBackend(token);
            setTokenRegistered(registered);
          }
          return;
        }

        // Check explainer status
        const hasSeen = await AsyncStorage.getItem('hasSeenNotificationExplainer');

        if (hasSeen === 'true') {
          // Explainer already seen and accepted, do not show sheet again
          return;
        }

        if (hasSeen === null) {
          // First launch
          useNotificationStore.getState().setShowNotificationExplainer(true);
        } else if (hasSeen === 'deferred') {
          // Deferred users
          const deferredCountStr = (await AsyncStorage.getItem('appOpenCountSinceDeferral')) || '0';
          let deferredCount = parseInt(deferredCountStr, 10);
          deferredCount += 1;
          await AsyncStorage.setItem('appOpenCountSinceDeferral', deferredCount.toString());

          if (deferredCount >= 3) {
            useNotificationStore.getState().setShowNotificationExplainer(true);
          }
        }
      };

      checkAndRegisterNotifications();

      // Store the subscription so the cleanup closure can remove it.
      notificationSubscriptionRef.current = Notifications.addNotificationReceivedListener(
        notification => {
          // Issue #820: read store directly rather than closed-over component state.
          const store = useNotificationStore.getState();
          store.addNotification({
            id: notification.request.identifier,
            type: (notification.request.content.data?.type as any) ?? 'general',
            title: notification.request.content.title ?? '',
            body: notification.request.content.body ?? '',
            data: notification.request.content.data as any,
            receivedAt: new Date().toISOString(),
            read: false,
          });
        }
      );

      // Store the badge-sync teardown so we can call it on unmount.
      notificationCleanupRef.current = setupForegroundBadgeSync();

      // Background sync service
      syncService.startAutoSync();

      // In-App Review metrics initialization
      inAppReviewService.init?.();

      // Cache warming (network requests for course list, user profile)
      warmCriticalCaches();

      // Build the offline search index from cached/fetched course data.
      searchIndexService.initialize().catch((err: unknown) => {
        appLogger.errorSync('[App] searchIndexService.initialize failed', err as Error);
      });
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      syncService.stopAutoSync();
      // Issue #820: call cleanup via refs so we always get the current function,
      // not a stale closure from the time this effect ran.
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
      }
      if (notificationSubscriptionRef.current) {
        removeNotificationListener(notificationSubscriptionRef.current);
      }
      global.onunhandledrejection = null;
    };
  }, []);

  useEffect(() => {
    // This effect consolidates all AppState 'change' listeners to prevent race
    // conditions and duplicate calls when the app is rapidly backgrounded and
    // foregrounded. A 200ms debounce is used to handle these events.

    const checkSessionOnForeground = async () => {
      // Don't read the store before it has rehydrated — destructured actions
      // would be undefined and calling them would throw / silently no-op.
      if (!useAppStore.persist?.hasHydrated?.()) {
        return;
      }

      const { isAuthenticated, refreshToken, setUser, setTokens, setSessionExpiringSoon, logout } =
        useAppStore.getState();

      if (!isAuthenticated || !refreshToken) return;

      const { valid, expiringSoon } = await checkSessionValidity();

      if (!valid) {
        // TODO: Persist any unsaved form data to AsyncStorage here.
        useAppStore.getState().setSessionExpiredModalVisible(true);
        return;
      }

      if (expiringSoon) {
        setSessionExpiringSoon(true);
        try {
          const refreshedSession = await mobileAuthService.refreshSession();
          setUser(refreshedSession.user);
          setTokens(
            refreshedSession.tokens.accessToken,
            refreshedSession.tokens.refreshToken,
            refreshedSession.tokens.expiresAt
          );
          setSessionExpiringSoon(false);
        } catch (error) {
          appLogger.errorSync('Failed to refresh session on app foreground', error as Error);
          logout();
          Alert.alert('Session expired', 'We could not refresh your session. Please log in again.');
        }
      } else {
        setSessionExpiringSoon(false);
      }
    };

    const checkCompromisedOnForeground = async () => {
      await useDeviceStore.getState().runDeviceCompromisedCheck();
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const wasInBackground = appStateRef.current.match(/inactive|background/);
        const isForegrounded = nextAppState === 'active';

        if (wasInBackground && isForegrounded) {
          // All foreground actions are consolidated here
          void checkForOtaUpdate();
          void checkSessionOnForeground();
          void checkCompromisedOnForeground();
        }

        appStateRef.current = nextAppState;
      }, 200);
    };

    // Initial checks on app ready. The AppState listener will handle subsequent
    // foregrounding events.
    if (appIsReady) {
      void checkForOtaUpdate();
      void waitForHydration(useAppStore).then(() => {
        void checkSessionOnForeground();
      });
      checkCompromisedOnForeground();
    }

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [appIsReady, checkForOtaUpdate]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <FeatureCapabilityHandler />
        <CacheRevalidationBanner />
        <ScreenErrorBoundary screenName="AppNavigator">
          <AppNavigator />
        </ScreenErrorBoundary>
        <NotificationPermissionExplanationSheet />
        {showPreferencesResetToast ? <PreferencesResetToast /> : null}
        <UpdatePromptModal
          visible={showUpdateModal}
          isCritical={isCriticalUpdate}
          version={updateVersion}
          onUpdate={handleOtaUpdate}
          onDismiss={isCriticalUpdate ? undefined : () => setShowUpdateModal(false)}
        />
        <SessionExpiredModal
          visible={sessionExpired}
          onClose={() => {
            useAppStore.getState().setSessionExpiredModalVisible(false);
            useAppStore.getState().logout();
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
};

const StorybookScreen = SHOW_STORYBOOK
  ? require('./.rnstorybook').default
  : null;

export default SHOW_STORYBOOK ? StorybookScreen : App;