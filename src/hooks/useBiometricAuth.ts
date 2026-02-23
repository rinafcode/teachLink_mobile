import { useState, useEffect, useCallback } from 'react';
import mobileAuthService, { BiometricType, AuthResult } from '../services/mobileAuth';
import * as secureStorage from '../services/secureStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseBiometricAuthReturn {
  /** Whether the device supports biometric authentication and has enrolled credentials */
  isAvailable: boolean;
  /** Whether biometric login is currently enabled for this app */
  isEnabled: boolean;
  /** The primary biometric type supported by the device */
  biometricType: BiometricType;
  /** Trigger a biometric authentication prompt to sign in */
  authenticate: () => Promise<AuthResult | null>;
  /** Enable biometric login (prompts biometric confirmation first) */
  enable: () => Promise<boolean>;
  /** Disable biometric login */
  disable: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [available, enabled, type] = await Promise.all([
        mobileAuthService.isBiometricAvailable(),
        secureStorage.isBiometricEnabled(),
        mobileAuthService.getSupportedBiometricType(),
      ]);

      if (!cancelled) {
        setIsAvailable(available);
        setIsEnabled(enabled && available);
        setBiometricType(type);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Authenticate ────────────────────────────────────────────────────────

  const authenticate = useCallback(async (): Promise<AuthResult | null> => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await mobileAuthService.loginWithBiometrics();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric authentication failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Enable ──────────────────────────────────────────────────────────────

  const enable = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      await mobileAuthService.enableBiometrics();
      setIsEnabled(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable biometrics';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Disable ─────────────────────────────────────────────────────────────

  const disable = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await mobileAuthService.disableBiometrics();
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isAvailable,
    isEnabled,
    biometricType,
    authenticate,
    enable,
    disable,
    isLoading,
    error,
    clearError,
  };
}
