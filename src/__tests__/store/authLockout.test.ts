import { useAppStore } from '../../store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
    isAuthLoading: false,
    authError: null,
    accessToken: null,
    refreshToken: null,
    sessionExpiresAt: null,
    authFailureCount: 0,
    authLockedUntil: null,
    refreshFailureCount: 0,
  });
}

function getStore() {
  return useAppStore.getState();
}

const MOCK_USER = { id: 'u1', name: 'Ada Lovelace', email: 'ada@teachlink.com' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('auth lockout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Login lockout ──────────────────────────────────────────────────────────

  describe('incrementAuthFailure', () => {
    it('increments the failure count on each call', () => {
      getStore().incrementAuthFailure();
      getStore().incrementAuthFailure();
      expect(getStore().authFailureCount).toBe(2);
      expect(getStore().authLockedUntil).toBeNull();
    });

    it('locks for 30 seconds and resets count after 5 consecutive failures', () => {
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const expectedLockUntil = new Date('2026-01-01T00:00:30.000Z').getTime();

      for (let i = 0; i < 5; i++) {
        getStore().incrementAuthFailure();
      }

      expect(getStore().authFailureCount).toBe(0);
      expect(getStore().authLockedUntil).toBe(expectedLockUntil);
    });

    it('does not lock before the 5th failure', () => {
      for (let i = 0; i < 4; i++) {
        getStore().incrementAuthFailure();
      }
      expect(getStore().authLockedUntil).toBeNull();
      expect(getStore().authFailureCount).toBe(4);
    });
  });

  // ── Reset on success ───────────────────────────────────────────────────────

  describe('resetAuthFailures', () => {
    it('clears the failure count and lockout timestamp', () => {
      for (let i = 0; i < 3; i++) {
        getStore().incrementAuthFailure();
      }
      getStore().resetAuthFailures();
      expect(getStore().authFailureCount).toBe(0);
      expect(getStore().authLockedUntil).toBeNull();
    });

    it('clears an active lockout', () => {
      for (let i = 0; i < 5; i++) {
        getStore().incrementAuthFailure();
      }
      expect(getStore().authLockedUntil).not.toBeNull();
      getStore().resetAuthFailures();
      expect(getStore().authLockedUntil).toBeNull();
    });
  });

  // ── Refresh token lockout ──────────────────────────────────────────────────

  describe('incrementRefreshFailure', () => {
    it('increments the refresh failure count without logging out prematurely', () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true });

      getStore().incrementRefreshFailure();
      getStore().incrementRefreshFailure();

      expect(getStore().isAuthenticated).toBe(true);
      expect(getStore().refreshFailureCount).toBe(2);
    });

    it('force-logs out and resets the counter after 3 consecutive refresh 401s', () => {
      useAppStore.setState({ user: MOCK_USER, isAuthenticated: true, accessToken: 'at_abc' });

      getStore().incrementRefreshFailure();
      getStore().incrementRefreshFailure();
      getStore().incrementRefreshFailure();

      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().user).toBeNull();
      expect(getStore().accessToken).toBeNull();
      expect(getStore().refreshFailureCount).toBe(0);
    });
  });

  // ── Logout resets all counters ─────────────────────────────────────────────

  describe('logout', () => {
    it('clears authFailureCount, authLockedUntil, and refreshFailureCount', () => {
      useAppStore.setState({
        authFailureCount: 3,
        refreshFailureCount: 2,
        authLockedUntil: Date.now() + 30_000,
      });

      getStore().logout();

      expect(getStore().authFailureCount).toBe(0);
      expect(getStore().refreshFailureCount).toBe(0);
      expect(getStore().authLockedUntil).toBeNull();
    });
  });
});
