import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { CacheStatusOverlay, MemoryProfilerOverlay } from '../components/DevTools';
import { RetryErrorBoundary } from '../components/ErrorBoundary/RetryErrorBoundary';
import '../global.css'; // NativeWind CSS
import { AnalyticsProvider, ErrorBoundary, OfflineIndicatorProvider } from '../src/components';
import AppLifecycleManager from '../src/components/AppLifecycleManager';
import { KeyboardDelegateProvider } from '../src/components/common/KeyboardDelegateProvider';
import { UpdateNotificationModal } from '../src/components/common/UpdateNotificationModal';
import { useAnalytics } from '../src/hooks';
import { useAppUpdate } from '../src/hooks/useAppUpdate';
import { useDeepLink } from '../src/hooks/useDeepLink';
import { preloadService } from '../src/services/preloadService';
import { scrollPositionService } from '../src/services/scrollPositionService';
import { sessionRestorationService } from '../src/services/sessionRestoration';
import { useAppStore } from '../src/store';
import { getPathFromDeepLink } from '../src/utils/linkParser';
import { prefetchExternalResources } from '../src/utils/resourceHints';

// Kick off resource hints early
prefetchExternalResources();

// Clear old scroll positions on app startup
scrollPositionService.clearOldPositions().catch(() => {
  // Silently handle cleanup errors
});

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

const UpdateChecker = () => {
  const { checkResult, isDownloading, error, applyUpdate, openStore, dismiss } = useAppUpdate(true);

  const showModal = checkResult?.updateAvailable === true;

  return (
    <UpdateNotificationModal
      visible={showModal}
      checkResult={checkResult}
      isDownloading={isDownloading}
      error={error}
      onApply={applyUpdate}
      onOpenStore={openStore}
      onDismiss={dismiss}
    />
  );
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

  const handleDeepLink = useCallback(
    deepLink => {
      const path = getPathFromDeepLink(deepLink);
      if (path) {
        router.replace(path);
      }
    },
    [router]
  );

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
        {/*
         * KeyboardDelegateProvider mounts exactly ONE pair of Keyboard
         * listeners (show + hide) for the entire app.  All screens read
         * keyboard state via useKeyboardState() / DelegatedKeyboardAvoidingView
         * without registering their own listeners.
         */}
        <KeyboardDelegateProvider>
          <AnalyticsProvider>
            <ScreenTracker />
            <ThemeSync />
            <UpdateChecker />
            <AppLifecycleManager />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <OfflineIndicatorProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </OfflineIndicatorProvider>
            </GestureHandlerRootView>
            {__DEV__ && (
              <>
                <MemoryProfilerOverlay />
                <CacheStatusOverlay />
              </>
            )}
          </AnalyticsProvider>
        </KeyboardDelegateProvider>
      </RetryErrorBoundary>
    </ErrorBoundary>
  );
};

export default RootLayout;
