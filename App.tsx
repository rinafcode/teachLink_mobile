import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox } from "react-native";
import "..//assets/global.css";
import { ErrorBoundary } from "./src/components/common/ErrorBoundary";
import crashReportingService from "./src/services/crashReporting";
import socketService from "./src/services/socket";
import { useAppStore } from "./src/store";
import logger from "./src/utils/logger";
// Notification imports
import { setupNotificationNavigation } from "./src/navigation/linking";
import apiClient from "./src/services/api/axios.config";
import requestQueue from "./src/services/api/requestQueue";
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
}

export default function App() {
  const theme = useAppStore((state) => state.theme);

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
        logger.info("App launched from notification:", response);
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

  return (
    <ErrorBoundary>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
    </ErrorBoundary>
  );
}
