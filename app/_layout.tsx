import { Stack, usePathname, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css"; // NativeWind CSS
import { AnalyticsProvider, ErrorBoundary, OfflineIndicatorProvider } from "../src/components";
import { useAnalytics } from '../src/hooks';

// Component to handle auto screen tracking
function ScreenTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const { trackScreen } = useAnalytics();

  useEffect(() => {
    if (pathname) {
      // Basic screen tracking based on pathname
      trackScreen(pathname, { segments: segments.join('/') });
    }
  }, [pathname, segments, trackScreen]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary boundaryName="RootLayout">
      <AnalyticsProvider>
        <ScreenTracker />
        <OfflineIndicatorProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="course-viewer"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="profile/[userId]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="search" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="quiz" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
          </GestureHandlerRootView>
        </OfflineIndicatorProvider>
      </AnalyticsProvider>
    </ErrorBoundary>
  );
}
