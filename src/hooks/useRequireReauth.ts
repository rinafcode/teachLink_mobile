import { useCallback } from 'react';

import { useBiometricAuth } from './useBiometricAuth';
import { useDeviceStore } from '../store/deviceStore';

/**
 * Hook to enforce biometric re-authentication for sensitive operations.
 *
 * Checks if the last biometric authentication challenge occurred more than the threshold.
 * If true, triggers a biometric challenge. If successful, updates the last auth timestamp
 * and returns true. If authentication fails, cancels, or is unavailable, returns false.
 *
 * @param threshold The time in milliseconds after which re-authentication is required.
 *                  Defaults to 5 minutes (300,000ms), minimum 1 minute (60,000ms).
 */
export function useRequireReauth(threshold = 300000) {
  const actualThreshold = Math.max(threshold, 60000); // Enforce minimum of 1 minute

  const lastBiometricAuth = useDeviceStore(state => state.lastBiometricAuth);
  const setLastBiometricAuth = useDeviceStore(state => state.setLastBiometricAuth);
  const { authenticate } = useBiometricAuth();

  const performReauthCheck = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    const needsReauth =
      lastBiometricAuth === null || now - lastBiometricAuth > actualThreshold;

    if (needsReauth) {
      try {
        const result = await authenticate();
        if (result) {
          setLastBiometricAuth(Date.now());
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    return true;
  }, [lastBiometricAuth, setLastBiometricAuth, authenticate, actualThreshold]);

  return {
    performReauthCheck,
  };
}
