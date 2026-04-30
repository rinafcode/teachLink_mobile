import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, LogBox } from 'react-native';

import StorybookUI from './.rnstorybook';
import './global.css';

import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { initializeLogging } from './src/config/logging';
import { AuthProvider } from './src/hooks';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotificationNavigation } from './src/navigation/linking';
import { apiClient } from './src/services/api';
import { crashReportingService } from './src/services/cashReporting';
import { mobileAuthService } from './src/services/mobileAuth';
import {
  addNotificationReceivedListener,
  getLastNotificationResponse,
  removeNotificationListener,
} from './src/services/pushNotifications';
import { requestQueue } from './src/services/requestQueue';
import socketService from './src/services/socket';
import syncService from './src/services/syncService';
import { useAppStore } from './src/store';
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

const App = () => {
  const theme = useAppStore((state) => state.theme);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Load fonts
        await Font.loadAsync({
          // You can add custom fonts here later if needed
        });

        // 2. Check Auth State / wait for store hydration
        // Zustand persist automatically hydrates, we can assume it's done or add a small delay
        // to ensure initial data fetching completes.

        // 3. Initial data fetch (simulate or add real fetch)
        await new Promise(resolve => setTimeout(resolve, 500));
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
    // Initialize crash reporting at app startup
    crashReportingService.init();

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

    // Initialize push notifications: request permissions and get device token
    registerForPushNotifications().then(async (token) => {
      if (token) {
        const { setPushToken, setTokenRegistered } = useNotificationStore.getState();
        setPushToken(token);
        const registered = await registerTokenWithBackend(token);
        setTokenRegistered(registered);
      }
    });

    // Start request queue monitoring
    requestQueue.startMonitoring(apiClient);

    // Initialize and start sync service for background sync
    syncService.startAutoSync();

    // Set up notification navigation handler
    const notificationCleanup = setupNotificationNavigation();

    // Listen for notifications received while app is foregrounded
    const subscription = addNotificationReceivedListener(handleNotificationReceived);

    // Check if app was launched from a notification
    getLastNotificationResponse().then(response => {
      if (response) {
        appLogger.infoSync('App launched from notification', { response });
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      syncService.stopAutoSync();
      notificationCleanup();
      removeNotificationListener(subscription);
      // Clean up the unhandled rejection handler
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
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default SHOW_STORYBOOK ? StorybookUI : App;
