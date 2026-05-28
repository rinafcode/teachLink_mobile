import React, { createContext, ReactNode, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { crashReportingService } from '../../services/crashReporting';
import { mobileAnalyticsService } from '../../services/mobileAnalytics';
import { NoiseType, PrivacyConfig } from '../../utils/differentialPrivacy';
import { appLogger as logger } from '../../utils/logger';
import { ErrorBoundary } from '../common/ErrorBoundary';

// ─── Analytics Context ────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  service: typeof mobileAnalyticsService;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

// ─── Provider Component ───────────────────────────────────────────────────────

interface AnalyticsProviderProps {
  children: ReactNode;
  /** Override the default differential privacy configuration. */
  privacyConfig?: Partial<PrivacyConfig>;
  /** Noise mechanism to use ('laplace' | 'gaussian'). Defaults to 'laplace'. */
  noiseType?: NoiseType;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  privacyConfig,
  noiseType,
}) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    logger.infoSync('📱 [AnalyticsProvider] Initializing tracking and crash reporting...');

    if (privacyConfig || noiseType) {
      mobileAnalyticsService.setPrivacyConfig(privacyConfig ?? {}, noiseType);
    }

    mobileAnalyticsService.init(privacyConfig);
    crashReportingService.init();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        mobileAnalyticsService.startSession();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        mobileAnalyticsService.endSession();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnalyticsContext.Provider value={{ service: mobileAnalyticsService }}>
      <ErrorBoundary boundaryName="AnalyticsProvider">{children}</ErrorBoundary>
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
