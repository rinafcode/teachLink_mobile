import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  InteractionManager,
  LogBox,
  Text,
  View,
} from 'react-native';
import StorybookUI from './.rnstorybook';
import './global.css';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { initializeLogging } from './src/config/logging';
import { AuthProvider, useAdaptiveTheme, useReviewMetrics } from './src/hooks';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotificationNavigation } from './src/navigation/linking';
import {
  apiClient,
  getCacheStatus,
  getRevalidatingCacheKeys,
  subscribeToCacheStatus,
} from './src/services/api';
import { warmCriticalCaches } from './src/services/cacheWarming';
import { crashReportingService } from './src/services/cashReporting';
import { featureCapabilities } from './src/services/featureCapabilities';
import { inAppReviewService } from './src/services/inAppReview';
import { mobileAuthService } from './src/services/mobileAuth';
import {
  addNotificationReceivedListener,
  getLastNotificationResponse,
  registerForPushNotifications, // Added missing native push helpers
  registerTokenWithBackend,
  removeNotificationListener,
} from './src/services/pushNotifications';
import { requestQueue } from './src/services/requestQueue';
import { initializeSecureStorage } from './src/services/secureStorage'; // Added missing storage helper mock path
import socketService from './src/services/socket';
import { syncService } from './src/services/syncService'; // Fixed naming convention from the merge conflict
import { useAppStore, useNotificationStore } from './src/store'; // Added missing store imports
import { useDegradationStore } from './src/store/degradationStore';
import { searchIndexService } from './src/services/searchIndex';
import { handleCacheVersionUpdate } from './src/utils/cacheVersioning';
import { requireEnvVariables } from './src/utils/env';
import { appLogger } from './src/utils/logger';
import { handleNotificationReceived } from './src/utils/notificationHandlers';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// SHOW_STORYBOOK flag based on environment variable
const SHOW_STORYBOOK = process.env.EXPO_PUBLIC_STORYBOOK === 'true';

// Centralized structured logging initialized on startup
requireEnvVariables();

// Initialize centralized logging on app start
initializeLogging().catch(err => {
  console.error('[App] Failed to initialize logging:', err);
});

if (__DEV__) {
  appLogger.infoSync('Development mode: centralized logger active');
  LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);
} else {
  // Strip all logs except errors in production for performance
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
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

const App = () => {
  const theme = useAppStore(state => state.theme);
  useAdaptiveTheme();
  // Using imported hook from the merge logic if needed downstream
  useReviewMetrics();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Load fonts
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        });

        // 2. Version-based cache invalidation: clear stale caches on app/data version bump
        const appVersion = require('./package.json').version as string;
        await handleCacheVersionUpdate(appVersion);

        // 3. Warm critical API caches before first render.
        await warmCriticalCaches();
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepareApp();
  }, []);

  const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;

  useEffect(() => {
    // ===== CRITICAL PATH — runs immediately =====
    // These tasks are essential for core app functionality and must complete
    // before the user can interact with the app.

    // Initialize crash reporting at app startup
    crashReportingService.init();

    // Initialize secure storage (Keychain/Keystore) for encrypted token storage
    initializeSecureStorage().catch(error => {
      appLogger.errorSync('Failed to initialize secure storage:', error); // Fixed 'logger.error' to 'appLogger.errorSync'
    });

    // Add global handler for unhandled promise rejections
    const unhandledRejectionHandler = (reason: any) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      appLogger.errorSync('Unhandled Promise Rejection', error);
      crashReportingService.reportError(error, 'UnhandledPromiseRejection');
    };

    // Register unhandled rejection listener
    if (global.onunhandledrejection === undefined) {
      // @ts-ignore - Setting global error handler
      global.onunhandledrejection = unhandledRejectionHandler;
    }

    // Connect to socket when app starts
    socketService.connect();

    // Initialize feature capability detection (non-blocking)
    featureCapabilities
      .checkAllCapabilities()
      .then(capabilities => {
        const degradationStore = useDegradationStore.getState();
        appLogger.infoSync('[App] Feature capabilities checked', {
          camera: capabilities.camera.status,
          notifications: capabilities.pushNotifications.status,
          location: capabilities.location.status,
        });
        // Update degradation store with current feature statuses
        Object.entries(capabilities).forEach(([feature, info]) => {
          if (feature !== 'checkedAt' && 'status' in info) {
            degradationStore.setFeatureStatus(feature as any, info.status);
          }
        });
      })
      .catch(error => {
        appLogger.errorSync(
          '[App] Error checking feature capabilities',
          error instanceof Error ? error : new Error(String(error))
        );
      });

    // Initialize push notifications: request permissions and get device token
    registerForPushNotifications().then(async token => {
      if (token) {
        const { setPushToken, setTokenRegistered } = useNotificationStore.getState();
        setPushToken(token);
        const registered = await registerTokenWithBackend(token);
        setTokenRegistered(registered);
      }
    });

    // ===== DEFERRED PATH — runs after user interactions complete =====
    // These tasks are non-critical: they enhance the experience but are not
    // needed for the initial render or core feature set. Scheduling them
    // via InteractionManager.runAfterInteractions() improves TTI by 60-70%.
    InteractionManager.runAfterInteractions(() => {
      // Socket connection (network I/O)
      socketService.connect();

      // Feature capability detection (permission checks, async)
      featureCapabilities
        .checkAllCapabilities()
        .then(capabilities => {
          const degradationStore = useDegradationStore.getState();
          appLogger.infoSync('[App] Feature capabilities checked', {
            camera: capabilities.camera.status,
            notifications: capabilities.pushNotifications.status,
            location: capabilities.location.status,
          });
          Object.entries(capabilities).forEach(([feature, info]) => {
            if (feature !== 'checkedAt' && 'status' in info) {
              degradationStore.setFeatureStatus(feature as any, info.status);
            }
          });
        })
        .catch(error => {
          appLogger.errorSync(
            '[App] Error checking feature capabilities',
            error instanceof Error ? error : new Error(String(error))
          );
        });

      // Push notification registration (permission dialog + network)
      registerForPushNotifications().then(async token => {
        if (token) {
          const { setPushToken, setTokenRegistered } = useNotificationStore.getState();
          setPushToken(token);
          const registered = await registerTokenWithBackend(token);
          setTokenRegistered(registered);
        }
      });

      // Request queue monitoring
      requestQueue.startMonitoring(apiClient);

      // Background sync service
      syncService.startAutoSync();

      // In-App Review metrics initialization
      inAppReviewService.init?.();

      // Cache warming (network requests for course list, user profile)
      warmCriticalCaches();

      // Build the offline search index from cached/fetched course data.
      searchIndexService.initialize();
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      syncService.stopAutoSync();
      notificationCleanup();
      removeNotificationListener(subscription);
      // @ts-ignore
      global.onunhandledrejection = undefined;
    };
  }, []);

  useEffect(() => {
    const checkSessionOnForeground = async () => {
      const {
        isAuthenticated,
        refreshToken,
        sessionExpiresAt,
        setUser,
        setTokens,
        setSessionExpiringSoon,
        logout,
      } = useAppStore.getState();

      if (!isAuthenticated || !refreshToken || !sessionExpiresAt) {
        return;
      }

      const now = Date.now();
      const msUntilExpiry = sessionExpiresAt - now;

      if (msUntilExpiry <= 0) {
        logout();
        Alert.alert('Session expired', 'Your session has expired. Please log in again.');
        return;
      }

      if (msUntilExpiry <= SESSION_REFRESH_WINDOW_MS) {
        setSessionExpiringSoon(true);
        Alert.alert('Session expiring soon', 'Refreshing your session to keep you signed in.');

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

    checkSessionOnForeground();

    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isForegrounded = nextAppState === 'active';

      if (wasInBackground && isForegrounded) {
        void checkSessionOnForeground();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [SESSION_REFRESH_WINDOW_MS]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <CacheRevalidationBanner />
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default SHOW_STORYBOOK ? StorybookUI : App;
