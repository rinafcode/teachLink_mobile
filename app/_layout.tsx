import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import '../global.css'; // NativeWind CSS
import { MemoryProfilerOverlay } from '../components/DevTools';
import { RetryErrorBoundary } from '../components/ErrorBoundary/RetryErrorBoundary';

import { AnalyticsProvider, ErrorBoundary, OfflineIndicatorProvider } from '../src/components';
import { useAnalytics } from '../src/hooks';
import { useDeepLink } from '../src/hooks/useDeepLink';
import { sessionRestorationService } from '../src/services/sessionRestoration';
import { preloadService } from '../src/services/preloadService';
import { useAppStore } from '../src/store';
import { getPathFromDeepLink, type ParsedDeepLink } from '../src/utils/linkParser';
import { prefetchExternalResources } from '../src/utils/resourceHints';

// Kick off resource hints early
prefetchExternalResources();

const ScreenTracker = () => {
  const pathname = usePathname();
  const segments = useSegments();
  const { trackScreen } = useAnalytics();
  const prevPathname = useRef<string | null>(null);
  const router = useRouter();

  // Initialize preload service
  useEffect(() => {
    preloadService.init();
  }, []);

  useEffect(() => {
    if (pathname) {
      trackScreen(pathname, { segments: segments.join('/') });
      
      // Track and record transitions + trigger predictive preloading

      if (prevPathname.current !== pathname) {
        const fromScreen = prevPathname.current;
        prevPathname.current = pathname;

        if (fromScreen) {
          preloadService.recordTransition(fromScreen, pathname);
        }

        sessionRestorationService.saveRoute(pathname);
        
        // Trigger background preloading for predicted destinations
        preloadService.preload(pathname, router);
      }
    }
  }, [pathname, segments, trackScreen, router]);

  return null;
};

const ThemeSync = () => {
  const { theme } = useAppStore();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  return null;
};

const RootLayout = () => {
  const router = useRouter();

  const handleDeepLink = useCallback((deepLink: ParsedDeepLink) => {
    const path = getPathFromDeepLink(deepLink);
    if (path) {
      router.replace(path);
    }
  }, [router]);

  useDeepLink(handleDeepLink);

  useEffect(() => {
    let cancelled = false;

    async function checkCrash() {
      await sessionRestorationService.beginSession();

      const crashed = await sessionRestorationService.detectCrash();
      if (cancelled || !crashed) return;

      const snapshot = await sessionRestorationService.getSnapshot();
      if (cancelled || !snapshot) return;

      const age = Date.now() - snapshot.timestamp;

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
        ]
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
      {/* ✅ Wrap with RetryErrorBoundary */}
      <RetryErrorBoundary>
        <AnalyticsProvider>
          <ScreenTracker />
          <ThemeSync />
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
              {/* DEV-only memory profiler overlay; renders null in production. */}
              <MemoryProfilerOverlay />
            </GestureHandlerRootView>
          </OfflineIndicatorProvider>
        </AnalyticsProvider>
      </RetryErrorBoundary>
    </ErrorBoundary>
  );
};

export default RootLayout;

