import { useAppStore } from '../../store';
import { login, logout, checkAuthStatus } from '../../services/auth';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../services/mobileAuth', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    logout: jest.fn(),
    restoreSession: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import mobileAuthService from '../../services/mobileAuth';

const mockMobileAuth = mobileAuthService as jest.Mocked<typeof mobileAuthService>;

const MOCK_USER = { id: 'u1', name: 'Ada Lovelace', email: 'ada@teachlink.com' };
const MOCK_TOKENS = { accessToken: 'at_abc', refreshToken: 'rt_xyz', expiresAt: Date.now() + 3_600_000 };
const MOCK_AUTH_RESULT = { user: MOCK_USER, tokens: MOCK_TOKENS };

function getStore() {
  return useAppStore.getState();
}

function resetStore() {
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
    isAuthLoading: false,
    authError: null,
    accessToken: null,
    refreshToken: null,
    sessionExpiresAt: null,
    theme: 'light',
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('authenticates the user and syncs state on success', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      await login({ email: 'ada@teachlink.com', password: 'secret123' });

      const state = getStore();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(MOCK_USER);
      expect(state.accessToken).toBe(MOCK_TOKENS.accessToken);
      expect(state.refreshToken).toBe(MOCK_TOKENS.refreshToken);
      expect(state.isAuthLoading).toBe(false);
      expect(state.authError).toBeNull();
    });

    it('normalises the email before forwarding to mobileAuthService', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      await login({ email: '  ADA@teachLink.com  ', password: 'secret123' });

      expect(mockMobileAuth.login).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@teachlink.com' }),
      );
    });

    it('forwards the rememberMe flag', async () => {
      mockMobileAuth.login.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      await login({ email: 'ada@teachlink.com', password: 'secret123', rememberMe: true });

      expect(mockMobileAuth.login).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
      );
    });

    it('sets authError and resets loading when the API call fails', async () => {
      const apiError = new Error('Invalid credentials');
      mockMobileAuth.login.mockRejectedValueOnce(apiError);

      await expect(login({ email: 'ada@teachlink.com', password: 'wrongpass' })).rejects.toThrow(
        'Invalid credentials',
      );

      const state = getStore();
      expect(state.isAuthenticated).toBe(false);
      expect(state.authError).toBe('Invalid credentials');
      expect(state.isAuthLoading).toBe(false);
    });

    describe('input validation', () => {
      it('throws when email is missing', async () => {
        await expect(login({ email: '', password: 'secret123' })).rejects.toThrow(
          'Email is required.',
        );
        expect(mockMobileAuth.login).not.toHaveBeenCalled();
      });

      it('throws when email is malformed', async () => {
        await expect(login({ email: 'not-an-email', password: 'secret123' })).rejects.toThrow(
          'valid email address',
        );
        expect(mockMobileAuth.login).not.toHaveBeenCalled();
      });

      it('throws when password is missing', async () => {
        await expect(login({ email: 'ada@teachlink.com', password: '' })).rejects.toThrow(
          'Password is required.',
        );
        expect(mockMobileAuth.login).not.toHaveBeenCalled();
      });

      it('throws when password is too short', async () => {
        await expect(login({ email: 'ada@teachlink.com', password: '123' })).rejects.toThrow(
          'at least 6 characters',
        );
        expect(mockMobileAuth.login).not.toHaveBeenCalled();
      });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears auth state after a successful logout', async () => {
      // Seed authenticated state first
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true, accessToken: 'at_abc' });
      mockMobileAuth.logout.mockResolvedValueOnce(undefined);

      await logout();

      const state = getStore();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthLoading).toBe(false);
    });

    it('still clears local state even when the API call throws', async () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true });
      mockMobileAuth.logout.mockRejectedValueOnce(new Error('Network error'));

      await logout(); // should not throw

      const state = getStore();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  // ── checkAuthStatus ────────────────────────────────────────────────────────

  describe('checkAuthStatus', () => {
    it('returns true and restores user when a valid session exists', async () => {
      mockMobileAuth.restoreSession.mockResolvedValueOnce(MOCK_AUTH_RESULT);

      const isAuthenticated = await checkAuthStatus();

      expect(isAuthenticated).toBe(true);
      const state = getStore();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(MOCK_USER);
      expect(state.isAuthLoading).toBe(false);
    });

    it('returns false and clears state when no session is found', async () => {
      mockMobileAuth.restoreSession.mockResolvedValueOnce(null);

      const isAuthenticated = await checkAuthStatus();

      expect(isAuthenticated).toBe(false);
      const state = getStore();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthLoading).toBe(false);
    });

    it('returns false and clears state when restoreSession throws', async () => {
      mockMobileAuth.restoreSession.mockRejectedValueOnce(new Error('Storage failure'));

      const isAuthenticated = await checkAuthStatus();

      expect(isAuthenticated).toBe(false);
      const state = getStore();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isAuthLoading).toBe(false);
    });
  });
});
