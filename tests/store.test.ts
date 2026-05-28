import { beforeEach, describe, expect, it } from '@jest/globals';

import { AuthUser } from '../src/services/mobileAuth';
import { useAppStore } from '../src/store';

const MOCK_USER: AuthUser = {
  id: 'user-001',
  name: 'Alice Learner',
  email: 'alice@teachlink.io',
  avatarUrl: 'https://cdn.teachlink.io/avatars/alice.png',
  role: 'student',
};

const MOCK_TOKENS = {
  accessToken: 'access-token-abc',
  refreshToken: 'refresh-token-xyz',
  expiresAt: Date.now() + 3_600_000,
};

const INITIAL_STATE = {
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,
  accessToken: null,
  refreshToken: null,
  sessionExpiresAt: null,
  theme: 'light' as const,
};

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(INITIAL_STATE);
  });

  // ── setAuthLoading ──────────────────────────────────────────────────────

  describe('setAuthLoading', () => {
    it('sets isAuthLoading to true', () => {
      useAppStore.getState().setAuthLoading(true);
      expect(useAppStore.getState().isAuthLoading).toBe(true);
    });

    it('sets isAuthLoading back to false', () => {
      useAppStore.setState({ isAuthLoading: true });
      useAppStore.getState().setAuthLoading(false);
      expect(useAppStore.getState().isAuthLoading).toBe(false);
    });

    it('does not mutate other auth fields', () => {
      useAppStore.setState({ authError: 'prior error' });
      useAppStore.getState().setAuthLoading(true);
      expect(useAppStore.getState().authError).toBe('prior error');
    });
  });

  // ── setAuthError ────────────────────────────────────────────────────────

  describe('setAuthError', () => {
    it('stores an error string', () => {
      useAppStore.getState().setAuthError('Invalid credentials');
      expect(useAppStore.getState().authError).toBe('Invalid credentials');
    });

    it('clears the error when called with null', () => {
      useAppStore.setState({ authError: 'stale error' });
      useAppStore.getState().setAuthError(null);
      expect(useAppStore.getState().authError).toBeNull();
    });

    it('overwrites a previous error', () => {
      useAppStore.getState().setAuthError('First error');
      useAppStore.getState().setAuthError('Second error');
      expect(useAppStore.getState().authError).toBe('Second error');
    });
  });

  // ── setUser ─────────────────────────────────────────────────────────────

  describe('setUser', () => {
    it('stores the user and sets isAuthenticated true', () => {
      useAppStore.getState().setUser(MOCK_USER);
      const state = useAppStore.getState();
      expect(state.user).toEqual(MOCK_USER);
      expect(state.isAuthenticated).toBe(true);
    });

    it('persists optional fields avatarUrl and role', () => {
      useAppStore.getState().setUser(MOCK_USER);
      const { user } = useAppStore.getState();
      expect(user?.avatarUrl).toBe('https://cdn.teachlink.io/avatars/alice.png');
      expect(user?.role).toBe('student');
    });

    it('deauthenticates when called with null', () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true });
      useAppStore.getState().setUser(null);
      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('replaces an existing user without affecting tokens', () => {
      useAppStore.setState({ accessToken: 'tok-abc' });
      const newUser: AuthUser = { id: 'user-002', name: 'Bob', email: 'bob@example.com' };
      useAppStore.getState().setUser(newUser);
      const state = useAppStore.getState();
      expect(state.user?.id).toBe('user-002');
      expect(state.accessToken).toBe('tok-abc');
    });
  });

  // ── setTokens ───────────────────────────────────────────────────────────

  describe('setTokens', () => {
    it('stores accessToken, refreshToken, and expiresAt', () => {
      const { accessToken, refreshToken, expiresAt } = MOCK_TOKENS;
      useAppStore.getState().setTokens(accessToken, refreshToken, expiresAt);
      const state = useAppStore.getState();
      expect(state.accessToken).toBe(accessToken);
      expect(state.refreshToken).toBe(refreshToken);
      expect(state.sessionExpiresAt).toBe(expiresAt);
    });

    it('overwrites previously stored tokens', () => {
      useAppStore.getState().setTokens('old', 'old-ref', 1000);
      useAppStore.getState().setTokens('new', 'new-ref', 2000);
      const state = useAppStore.getState();
      expect(state.accessToken).toBe('new');
      expect(state.refreshToken).toBe('new-ref');
      expect(state.sessionExpiresAt).toBe(2000);
    });

    it('does not affect user or isAuthenticated', () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true });
      useAppStore.getState().setTokens('tok', 'ref', 9999);
      const state = useAppStore.getState();
      expect(state.user).toEqual(MOCK_USER);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  // ── setSessionExpiringSoon ───────────────────────────────────────────────

  describe('setSessionExpiringSoon', () => {
    it('sets sessionExpiringSoon to true', () => {
      useAppStore.getState().setSessionExpiringSoon(true);
      expect(useAppStore.getState().sessionExpiringSoon).toBe(true);
    });

    it('resets sessionExpiringSoon to false', () => {
      useAppStore.setState({ sessionExpiringSoon: true });
      useAppStore.getState().setSessionExpiringSoon(false);
      expect(useAppStore.getState().sessionExpiringSoon).toBe(false);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    beforeEach(() => {
      useAppStore.setState({
        user: MOCK_USER,
        isAuthenticated: true,
        isAuthLoading: false,
        authError: 'some prior error',
        accessToken: MOCK_TOKENS.accessToken,
        refreshToken: MOCK_TOKENS.refreshToken,
        sessionExpiresAt: MOCK_TOKENS.expiresAt,
        sessionExpiringSoon: true,
        theme: 'dark',
      });
    });

    it('clears user and sets isAuthenticated to false', () => {
      useAppStore.getState().logout();
      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('wipes all token fields', () => {
      useAppStore.getState().logout();
      const state = useAppStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.sessionExpiresAt).toBeNull();
    });

    it('resets sessionExpiringSoon to false', () => {
      useAppStore.getState().logout();
      expect(useAppStore.getState().sessionExpiringSoon).toBe(false);
    });

    it('resets isAuthLoading and authError', () => {
      useAppStore.setState({ isAuthLoading: true, authError: 'lingering' });
      useAppStore.getState().logout();
      const state = useAppStore.getState();
      expect(state.isAuthLoading).toBe(false);
      expect(state.authError).toBeNull();
    });

    it('preserves theme (UI preference) across logout', () => {
      useAppStore.getState().logout();
      expect(useAppStore.getState().theme).toBe('dark');
    });

    it('is idempotent — calling logout twice leaves state clean', () => {
      useAppStore.getState().logout();
      useAppStore.getState().logout();
      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });
  });

  // ── setTheme ────────────────────────────────────────────────────────────

  describe('setTheme', () => {
    it('switches theme to dark', () => {
      useAppStore.getState().setTheme('dark');
      expect(useAppStore.getState().theme).toBe('dark');
    });

    it('switches theme back to light', () => {
      useAppStore.setState({ theme: 'dark' });
      useAppStore.getState().setTheme('light');
      expect(useAppStore.getState().theme).toBe('light');
    });

    it('does not affect auth state', () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true });
      useAppStore.getState().setTheme('dark');
      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(MOCK_USER);
    });
  });

  // ── setLoading / setError ───────────────────────────────────────────────

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      useAppStore.getState().setLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);
    });

    it('resets isLoading to false', () => {
      useAppStore.setState({ isLoading: true });
      useAppStore.getState().setLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('stores a general error string', () => {
      useAppStore.getState().setError('Network unavailable');
      expect(useAppStore.getState().error).toBe('Network unavailable');
    });

    it('clears the error when passed null', () => {
      useAppStore.setState({ error: 'stale' });
      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });
  });

  // ── Full login → logout lifecycle ───────────────────────────────────────

  describe('session lifecycle', () => {
    it('simulates a complete login → logout flow', () => {
      // 1. Start loading
      useAppStore.getState().setAuthLoading(true);
      expect(useAppStore.getState().isAuthLoading).toBe(true);

      // 2. Tokens and user arrive
      useAppStore
        .getState()
        .setTokens(MOCK_TOKENS.accessToken, MOCK_TOKENS.refreshToken, MOCK_TOKENS.expiresAt);
      useAppStore.getState().setUser(MOCK_USER);
      useAppStore.getState().setAuthLoading(false);

      let state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('alice@teachlink.io');
      expect(state.accessToken).toBeTruthy();
      expect(state.isAuthLoading).toBe(false);

      // 3. Session nearing expiry
      useAppStore.getState().setSessionExpiringSoon(true);
      expect(useAppStore.getState().sessionExpiringSoon).toBe(true);

      // 4. Logout
      useAppStore.getState().logout();
      state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.sessionExpiringSoon).toBe(false);
    });

    it('handles a failed login attempt gracefully', () => {
      useAppStore.getState().setAuthLoading(true);
      useAppStore.getState().setAuthError('Wrong password');
      useAppStore.getState().setAuthLoading(false);

      const state = useAppStore.getState();
      expect(state.isAuthLoading).toBe(false);
      expect(state.authError).toBe('Wrong password');
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });
});
