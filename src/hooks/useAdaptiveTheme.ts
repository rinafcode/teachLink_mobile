import { LightSensor } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAppStore } from '../store';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../store';

export const DARK_LUX_THRESHOLD = 25;
export const LIGHT_LUX_THRESHOLD = 75;
export const CONSECUTIVE_READINGS_REQUIRED = 3;
export const READING_INTERVAL_MS = 1000;

export type CandidateTheme = 'light' | 'dark' | null;

export interface DebounceState {
  candidate: CandidateTheme;
  consecutiveCount: number;
}

export function getCandidateThemeFromLux(lux: number): CandidateTheme {
  if (lux < DARK_LUX_THRESHOLD) return 'dark';
  if (lux > LIGHT_LUX_THRESHOLD) return 'light';
  return null;
}

export function advanceDebounce(
  state: DebounceState,
  lux: number,
  currentTheme: 'light' | 'dark'
): { state: DebounceState; confirmedTheme: 'light' | 'dark' | null } {
  const reading = getCandidateThemeFromLux(lux);

  if (reading === null) {
    return { state: { candidate: null, consecutiveCount: 0 }, confirmedTheme: null };
  }

  if (reading === currentTheme) {
    return { state: { candidate: null, consecutiveCount: 0 }, confirmedTheme: null };
  }

  if (reading !== state.candidate) {
    return {
      state: { candidate: reading, consecutiveCount: 1 },
      confirmedTheme: null,
    };
  }

  const nextCount = state.consecutiveCount + 1;
  if (nextCount >= CONSECUTIVE_READINGS_REQUIRED) {
    return {
      state: { candidate: null, consecutiveCount: 0 },
      confirmedTheme: reading,
    };
  }

  return {
    state: { candidate: reading, consecutiveCount: nextCount },
    confirmedTheme: null,
  };
}

export function useAdaptiveTheme(): void {
  const adaptiveThemeEnabled = useSettingsStore(s => s.adaptiveThemeEnabled);
  const setTheme = useAppStore(s => s.setTheme);

  const debounceRef = useRef<DebounceState>({ candidate: null, consecutiveCount: 0 });
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    const removeSubscription = () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      debounceRef.current = { candidate: null, consecutiveCount: 0 };
    };

    const handleReading = (lux: number) => {
      const currentTheme = useTheme(); // Changed from useAppStore.getState().theme
      const { state, confirmedTheme } = advanceDebounce(debounceRef.current, lux, currentTheme);
      debounceRef.current = state;
      if (confirmedTheme) {
        setTheme(confirmedTheme);
      }
    };

    const subscribe = async () => {
      const isAvailable = await LightSensor.isAvailableAsync();
      if (cancelled || !isAvailable) return;

      LightSensor.setUpdateInterval(READING_INTERVAL_MS);
      subscriptionRef.current = LightSensor.addListener(({ illuminance }) => {
        handleReading(illuminance);
      });
    };

    const shouldSubscribe = adaptiveThemeEnabled && appStateRef.current === 'active';

    if (shouldSubscribe) {
      void subscribe();
    } else {
      removeSubscription();
    }

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isActive = nextState === 'active';
      appStateRef.current = nextState;

      if (!adaptiveThemeEnabled) return;

      if (wasBackground && isActive) {
        removeSubscription();
        void subscribe();
      } else if (nextState.match(/inactive|background/)) {
        removeSubscription();
      }
    });

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      removeSubscription();
    };
  }, [adaptiveThemeEnabled, setTheme]);
}