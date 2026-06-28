import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { BiometricType, AuthResult } from '../services/mobileAuth';
import { isBiometricEnabled } from '../services/secureStorage';
import { useDeviceStore } from '../store/deviceStore';

export function useBiometricAuth() {
  const isDeviceCompromised = useDeviceStore(state => state.isDeviceCompromised);
  const biometricEnabled = useDeviceStore(state => state.biometricEnabled);
  const setBiometricEnabled = useDeviceStore(state => state.setBiometricEnabled);

  const [isSyncing, setIsSyncing] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const syncWithSecureStore = useCallback(async () => {
    setIsSyncing(true);
    try {
      const enabled = await isBiometricEnabled();
      // If secure store no longer has the entry, reset to the safe default.
      // This covers: OS update wiping the keychain, app reinstall, or any
      // external process clearing the key while the app was backgrounded.
      setBiometricEnabled(enabled);
    } finally {
      setIsSyncing(false);
    }
  }, [setBiometricEnabled]);

  // Sync once on mount so the initial render reflects SecureStore truth.
  useEffect(() => {
    syncWithSecureStore();
  }, [syncWithSecureStore]);

  // Re-sync on every foreground transition so a stale Zustand value is
  // corrected before any biometric UI can appear.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        syncWithSecureStore();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [syncWithSecureStore]);

  return {
    isAvailable: false,
    isEnabled: !isDeviceCompromised && biometricEnabled,
    biometricType: 'none' as BiometricType,
    authenticate: useCallback(async (): Promise<AuthResult | null> => null, []),
    enable: useCallback(async () => false, []),
    disable: useCallback(async () => {}, []),
    isLoading: isSyncing,
    error: isDeviceCompromised ? 'Biometric authentication is unavailable on this device.' : null,
    clearError: useCallback(() => {}, []),
  };
}
