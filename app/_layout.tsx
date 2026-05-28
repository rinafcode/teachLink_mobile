import { Stack, useRouter, usePathname, useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css"; // NativeWind CSS
import { AnalyticsProvider, ErrorBoundary, OfflineIndicatorProvider } from "../src/components";
import { useAnalytics } from '../src/hooks';
import { useDeepLink } from '../src/hooks/useDeepLink';
import { sessionRestorationService } from '../src/services/sessionRestoration';
import { getPathFromDeepLink } from '../src/utils/linkParser';

// Component to handle auto screen tracking and session state persistence
function ScreenTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const { trackScreen } = useAnalytics();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname) {
      trackScreen(pathname, { segments: segments.join('/') });
      // Persist route only on actual navigation changes (not the initial mount duplicate)
      if (prevPathname.current !== pathname) {
        prevPathname.current = pathname;
        sessionRestorationService.saveRoute(pathname);
      }
    }
  }, [pathname, segments, trackScreen]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();

  const handleDeepLink = useCallback((deepLink) => {
    const path = getPathFromDeepLink(deepLink);
    if (path) {
      router.replace(path);
    }
  }, [router]);

  useDeepLink(handleDeepLink);

  // Begin session and detect crash on mount
  useEffect(() => {
    let cancelled = false;

    async function checkCrash() {
      await sessionRestorationService.beginSession();

      const crashed = await sessionRestorationService.detectCrash();
      if (cancelled || !crashed) return;

      const snapshot = await sessionRestorationService.getSnapshot();
      if (cancelled || !snapshot) return;

      const age = Date.now() - snapshot.timestamp;
      // Ignore stale snapshots (> 1 hour old)
      if (age > 3600_000) {
        await sessionRestorationService.clearSnapshot();
        return;
      }

      Alert.alert(
        'Restore session',
        'It looks like the app closed unexpectedly. Would you like to return to where you left off?',
        [
          {
            text: 'Start fresh',
            style: 'cancel',
            onPress: () => sessionRestorationService.clearSnapshot(),
          },
          {
            text: 'Restore',
            onPress: async () => {
              await sessionRestorationService.clearSnapshot();
              router.replace(snapshot.route as any);
            },
          },
        ],
      );
    }

    checkCrash();

    return () => {
      cancelled = true;
      sessionRestorationService.endSession();
    };
  }, [router]);

  return (
    <ErrorBoundary boundaryName="RootLayout">
      <AnalyticsProvider>
        <ScreenTracker />
        <OfflineIndicatorProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="course-viewer" options={{ headerShown: false }} />
              <Stack.Screen name="profile/[userId]" options={{ headerShown: false }} />
              <Stack.Screen name="search" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="qr-scanner" options={{ headerShown: false }} />
              <Stack.Screen name="quiz" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </GestureHandlerRootView>
        </OfflineIndicatorProvider>
      </AnalyticsProvider>
    </ErrorBoundary>
  );
}
