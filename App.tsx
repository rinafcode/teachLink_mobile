import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import socketService from './src/services/socket';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import mobileAuthService from './src/services/mobileAuth';
import "./global.css";

requireEnvVariables();
// Notification imports
import { AuthProvider } from "./src/hooks";
import { setupNotificationNavigation } from "./src/navigation/linking";
import {
  addNotificationReceivedListener,
  getLastNotificationResponse,
  removeNotificationListener,
} from "./src/services/pushNotifications";
import { handleNotificationReceived } from "./src/utils/notificationHandlers";

// Centralized logging is handled by src/utils/logger.
// Suppress known non-actionable navigation warnings in all environments.
if (__DEV__) {
  logger.debug("Development mode: centralized logger active");
  LogBox.ignoreLogs([
    "Non-serializable values were found in the navigation state",
  ]);
} else {
  // Strip all logs except errors in production for performance and security
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
}

export default function App() {
  const theme = useAppStore((state) => state.theme);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;

  useEffect(() => {
    // Initialize crash reporting at app startup
    crashReportingService.init();

    // Add global handler for unhandled promise rejections
    const unhandledRejectionHandler = (reason: any) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      logger.error("Unhandled Promise Rejection:", error);
      crashReportingService.reportError(error, "UnhandledPromiseRejection");
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
    const subscription = addNotificationReceivedListener(
      handleNotificationReceived,
    );

    // Check if app was launched from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        console.log("App launched from notification:", response);
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
            refreshedSession.tokens.expiresAt,
          );
          setSessionExpiringSoon(false);
        } catch {
          logout();
          Alert.alert(
            'Session expired',
            'We could not refresh your session. Please log in again.',
          );
        }
      } else {
        setSessionExpiringSoon(false);
      }
    };

    checkSessionOnForeground();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
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
      <AuthProvider>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
