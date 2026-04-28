import React, { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { crashReportingService } from '../../services/crashReporting';
import { mobileAnalyticsService } from '../../services/mobileAnalytics';
import logger from '../../utils/logger';
import { ErrorBoundary } from '../common/ErrorBoundary';

// ─── Analytics Context ────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  service: typeof mobileAnalyticsService;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

// ─── Provider Component ───────────────────────────────────────────────────────

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initialize services on mount
    logger.info('📱 [AnalyticsProvider] Initializing tracking and crash reporting...');
    mobileAnalyticsService.init();
    crashReportingService.init();

    // 2. Manage session lifecycle (Foreground vs. Background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        mobileAnalyticsService.startSession();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        mobileAnalyticsService.endSession();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AnalyticsContext.Provider value={{ service: mobileAnalyticsService }}>
      <ErrorBoundary boundaryName="AnalyticsProvider">
        {children}
      </ErrorBoundary>
    </AnalyticsContext.Provider>
  );
};

// ─── Context Hook ─────────────────────────────────────────────────────────────

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};

export default AnalyticsProvider;
