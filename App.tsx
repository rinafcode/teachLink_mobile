import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, LogBox } from 'react-native';
import './global.css';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import mobileAuthService from './src/services/mobileAuth';
import socketService from './src/services/socket';
import { useAppStore } from './src/store';
import { apiClient } from './src/services/api';
import { crashReportingService } from './src/services/cashReporting';
import { requestQueue } from './src/services/requestQueue';
import { requireEnvVariables } from './src/utils/env';
import { appLogger } from './src/utils/logger';
import { initializeLogging } from './src/config/logging';

// Notification imports
import { setupNotificationNavigation } from './src/navigation/linking';
import {
  addNotificationReceivedListener,
  getLastNotificationResponse,
  removeNotificationListener,
} from './src/services/pushNotifications';
import { handleNotificationReceived } from './src/utils/notificationHandlers';

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

export default function App() {
  const theme = useAppStore(state => state.theme);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

    // Start request queue monitoring
    requestQueue.startMonitoring(apiClient);

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
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </ErrorBoundary>
  );
}
