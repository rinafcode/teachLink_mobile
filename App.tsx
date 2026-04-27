import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import "./global.css";
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import socketService from './src/services/socket';
import { useAppStore } from './src/store';

// Notification imports
import { setupNotificationNavigation } from './src/navigation/linking';
import {
    addNotificationReceivedListener,
    getLastNotificationResponse,
    removeNotificationListener,
} from './src/services/pushNotifications';
import { handleNotificationReceived } from './src/utils/notificationHandlers';

// Initialize Sentry for performance monitoring and crash reporting
Sentry.init({
  dsn: 'https://your-dsn-here@sentry.io/project-id',
  enableAutoSessionTracking: true,
  enableNativeCrashHandling: true,
  environment: __DEV__ ? 'development' : 'production',
  debug: __DEV__,
});

// Enable error logging to console (visible in Metro bundler)
if (__DEV__) {
  // Log all errors to console
  const originalError = console.error;
  console.error = (...args) => {
    originalError(...args);
    // Errors will appear in Metro bundler terminal
  };

  // Show warnings in console but don't break the app
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
  ]);
}

export default function App() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    // Connect to socket when app starts
    socketService.connect();

    // Set up notification navigation handler
    const notificationCleanup = setupNotificationNavigation();

    // Listen for notifications received while app is foregrounded
    const subscription = addNotificationReceivedListener(handleNotificationReceived);

    // Check if app was launched from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('App launched from notification:', response);
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
      notificationCleanup();
      removeNotificationListener(subscription);
    };
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </Sentry.ErrorBoundary>
  );
}
