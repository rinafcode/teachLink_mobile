import { useCallback } from 'react';
import { BiometricType, AuthResult } from '../services/mobileAuth';

export function useBiometricAuth() {
  return {
    isAvailable: false,
    isEnabled: false,
    biometricType: 'none' as BiometricType,
    authenticate: useCallback(async (): Promise<AuthResult | null> => null, []),
    enable: useCallback(async () => false, []),
    disable: useCallback(async () => {}, []),
    isLoading: false,
    error: null as string | null,
    clearError: useCallback(() => {}, []),
  };
}
