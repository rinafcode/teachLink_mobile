import { useCallback } from 'react';

import { BiometricType, AuthResult } from '../services/mobileAuth';
import { useDeviceStore } from '../store/deviceStore';

export function useBiometricAuth() {
  const isDeviceCompromised = useDeviceStore(state => state.isDeviceCompromised);

  return {
    isAvailable: false,
    isEnabled: false,
    biometricType: 'none' as BiometricType,
    authenticate: useCallback(async (): Promise<AuthResult | null> => null, []),
    enable: useCallback(async () => false, []),
    disable: useCallback(async () => {}, []),
    isLoading: false,
    error: isDeviceCompromised ? 'Biometric authentication is unavailable on this device.' : null,
    clearError: useCallback(() => {}, []),
  };
}
