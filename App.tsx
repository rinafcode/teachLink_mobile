import './src/utils/assetInlinePolyfill';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus, InteractionManager, LogBox } from 'react-native';

import './global.css';

import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { initializeLogging } from './src/config/logging';
import { AuthProvider, useAdaptiveTheme } from './src/hooks';
import AppNavigator from './src/navigation/AppNavigator';
import { warmCriticalCaches } from './src/services/cacheWarming';
import { mobileAuthService } from './src/services/mobileAuth';
import socketService from './src/services/socket';
import { useAppStore } from './src/store';
import { handleCacheVersionUpdate } from './src/utils/cacheVersioning';
import { appLogger } from './src/utils/logger';
import { prefetchExternalResources } from './src/utils/resourceHints';
import { mobileAnalyticsService } from './src/services/mobileAnalytics';
import { sentryContextService } from './src/services/sentryContext';
import { flushLogQueue } from './src/config/logging';
import { AnalyticsEvent, PerformanceMetric } from './src/utils/trackingEvents';
import { batteryService } from './src/services/batteryService';
import { startupProgressService } from './src/services/startupProgressService';
import { StartupProgressOverlay } from './src/components/common/StartupProgressOverlay';

const appStartTime = Date.now();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Centralized structured logging initialized lazily in services bootstrap useEffect
// requireEnvVariables();

// Preconnect to API hosts and external resources
prefetchExternalResources();

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
  useAdaptiveTheme();

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        // Initialize progress tracking
        startupProgressService.setInitializing(true);
        startupProgressService.registerStep('fonts', 'Loading Fonts', 500);
        startupProgressService.registerStep('cache', 'Clearing Cache', 800);
        startupProgressService.registerStep('auth', 'Checking Authentication', 1000);
        startupProgressService.registerStep('data', 'Loading Initial Data', 1500);

        // 1. Load fonts
        startupProgressService.startStep('fonts');
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        });
        startupProgressService.completeStep('fonts');

        // 2. Version-based cache invalidation: clear stale caches on app/data version bump
        startupProgressService.startStep('cache');
        const appVersion = require('./package.json').version as string;
        await handleCacheVersionUpdate(appVersion);
        startupProgressService.completeStep('cache');

        // 3. Check Auth State / wait for store hydration
        startupProgressService.startStep('auth');
        // Zustand persist automatically hydrates, we can assume it's done or add a small delay
        // to ensure initial data fetching completes.
        await new Promise(resolve => setTimeout(resolve, 300));
        startupProgressService.completeStep('auth');

        // 4. Initial data fetch (simulate or add real fetch)
        startupProgressService.startStep('data');
        await new Promise(resolve => setTimeout(resolve, 500));
        startupProgressService.completeStep('data');

        // 5. Warm critical caches (user profile + home feed) in parallel
        await warmCriticalCaches();
      } catch (e) {
        console.warn('Error during app initialization:', e);
        // Mark the last step as failed
        const inProgressStep = startupProgressService.getInProgressStep();
        if (inProgressStep) {
          startupProgressService.failStep(
            inProgressStep.id,
            e instanceof Error ? e.message : String(e)
          );
        }
      } finally {
        setAppIsReady(true);
        startupProgressService.setInitializing(false);
        await SplashScreen.hideAsync();

        // Track cold start metric
        const coldStartDuration = Date.now() - appStartTime;
        mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
          metric_name: PerformanceMetric.APP_LOAD_TIME,
          metric_value: coldStartDuration,
          launch_type: 'cold',
        });
        appLogger.infoSync(`[App] Cold start completed in ${coldStartDuration}ms`);

        // Record app launch breadcrumb so every Sentry event has launch context
        sentryContextService.trackAppLifecycle('launch');
        sentryContextService.trackAction('app_cold_start', { durationMs: coldStartDuration });
      }
    }

    prepareApp();
  }, []);

  const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;

  useEffect(() => {
    // Initialize battery monitoring
    batteryService.initialize().catch(err => {
      console.error('[App] Failed to initialize battery service:', err);
    });

    // Lazy load Sentry after core initialization
    InteractionManager.runAfterInteractions(() => {
      initializeLogging().catch(err => {
        console.error('[App] Failed to initialize logging:', err);
      });
      // Lazy connect socket.io after core initialization
      socketService.connect();
    });

    return () => {
      batteryService.shutdown();
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
      const isBackgrounded = appStateRef.current === 'active' && nextAppState.match(/inactive|background/);

      if (wasInBackground && isForegrounded) {
        sentryContextService.trackAppLifecycle('foreground');
        void checkSessionOnForeground();
      }

      if (isBackgrounded) {
        sentryContextService.trackAppLifecycle('background');
        // Flush queued logs before going to background so nothing is lost
        void flushLogQueue();
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
      <StartupProgressOverlay />
      <AuthProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
};

const AppEntry = __DEV__ && process.env.EXPO_PUBLIC_STORYBOOK === 'true'
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./.rnstorybook').default
  : App;

export default AppEntry;
