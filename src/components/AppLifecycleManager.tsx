import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useDeviceStore } from '@/store/deviceStore';
import { mobileAnalyticsService } from '@/services/mobileAnalytics';
import { AnalyticsEvent } from '@/utils/trackingEvents';

const AppLifecycleManager = () => {
  const setIsInBackground = useDeviceStore(state => state.setIsInBackground);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState as AppStateStatus);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      const isBackground = nextState !== 'active';
      setIsInBackground(isBackground);

      // Track transitions for monitoring battery/behavior impact
      mobileAnalyticsService.trackEvent(
        isBackground ? AnalyticsEvent.APP_BACKGROUND : AnalyticsEvent.APP_FOREGROUND,
        { app_state: nextState }
      );
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default AppLifecycleManager;
