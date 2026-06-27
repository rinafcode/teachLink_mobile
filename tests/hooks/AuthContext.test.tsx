/**
 * AuthContext.test.tsx
 *
 * Tests for AuthProvider memoization behaviour and auth state updates.
 * Verifies the acceptance criteria:
 *   - Context value is memoized (useMemo)
 *   - Callbacks are stable across re-renders (useCallback)
 *   - Consumers don't re-render on irrelevant changes
 *   - Auth state updates still propagate correctly
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AuthProvider, useAuth } from '../../src/hooks/useAuth';
import mobileAuth from '../../src/services/mobileAuth';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/services/mobileAuth', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    logout: jest.fn(),
    loginWithBiometrics: jest.fn(),
    restoreSession: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockMobileAuth = mobileAuth as jest.Mocked<typeof mobileAuth>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'u1', name: 'Ada Lovelace', email: 'ada@teachlink.com' };
const MOCK_TOKENS = {
  accessToken: 'fake-access-token',
  refreshToken: 'fake-refresh-token',
};
const MOCK_AUTH_RESULT = { user: MOCK_USER, tokens: MOCK_TOKENS };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing session
    mockMobileAuth.restoreSession.mockResolvedValue(null);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with isAuthenticated=false and isLoading=true, then resolves', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Immediately after mount, loading begins
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('restores an existing session on mount', async () => {
      mockMobileAuth.restoreSession.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });
  });

  // ── Memoization: callback stability ───────────────────────────────────────

  describe('callback stability (useCallback)', () => {
    it('login reference is stable across re-renders', async () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const loginRef = result.current.login;
      rerender({});

      expect(result.current.login).toBe(loginRef);
    });

    it('logout reference is stable across re-renders', async () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const logoutRef = result.current.logout;
      rerender({});

      expect(result.current.logout).toBe(logoutRef);
    });

    it('loginWithBiometrics reference is stable across re-renders', async () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const biometricsRef = result.current.loginWithBiometrics;
      rerender({});

      expect(result.current.loginWithBiometrics).toBe(biometricsRef);
    });

    it('restoreSession reference is stable across re-renders', async () => {
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const restoreRef = result.current.restoreSession;
      rerender({});

      expect(result.current.restoreSession).toBe(restoreRef);
    });
  });

  // ── Memoization: consumer re-render count ─────────────────────────────────

  describe('consumer re-render reduction (useMemo)', () => {
    it('does not re-render a consumer that only reads callbacks when state is unchanged', async () => {
      let renderCount = 0;

      // Modified to also return isLoading so we can wait for loading to complete
      const useCallbacksOnly = () => {
        renderCount++;
        const { login, logout, isLoading } = useAuth();
        return { login, logout, isLoading };
      };

      const { rerender, result } = renderHook(() => useCallbacksOnly(), { wrapper });

      // Wait for initial loading to complete before taking baseline
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Now capture the render count after all initial renders are done
      const countAfterMount = renderCount;

      // Rerender the provider with no state change
      rerender({});

      // The consumer should NOT re-render when only callbacks are used
      // and the state hasn't changed
      expect(renderCount).toBe(countAfterMount);
    });

    it('re-renders consumers when auth state actually changes', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login({ email: 'ada@teachlink.com', password: 'secret' });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });
  });

  // ── Auth actions ───────────────────────────────────────────────────────────

  describe('login', () => {
    it('sets isAuthenticated and user on success', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login({ email: 'ada@teachlink.com', password: 'secret' });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.isLoading).toBe(false);
    });

    it('resets isLoading and rethrows on failure', async () => {
      mockMobileAuth.login.mockRejectedValueOnce(new Error('Bad credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.login({ email: 'ada@teachlink.com', password: 'wrong' });
        })
      ).rejects.toThrow('Bad credentials');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and isAuthenticated on success', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);
      mockMobileAuth.logout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login({ email: 'ada@teachlink.com', password: 'secret' });
      });
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('loginWithBiometrics', () => {
    it('sets isAuthenticated on success', async () => {
      mockMobileAuth.loginWithBiometrics.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loginWithBiometrics();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });
  });

  // ── Error boundary ─────────────────────────────────────────────────────────

  describe('useAuth outside provider', () => {
    it('throws a descriptive error', () => {
      // Suppress console.error for this test
      jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      (console.error as jest.Mock).mockRestore();
    });
  });
});
