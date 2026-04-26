import { beforeEach, describe, expect, it } from '@jest/globals';
import { AuthUser } from '../src/services/mobileAuth';
import { useAppStore } from '../src/store';

describe('useAppStore Actions', () => {
  // Setup: Reset store before each test to ensure test isolation
  beforeEach(() => {
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
  });

  it('should set auth loading status', () => {
    useAppStore.getState().setAuthLoading(true);
    expect(useAppStore.getState().isAuthLoading).toBe(true);

    useAppStore.getState().setAuthLoading(false);
    expect(useAppStore.getState().isAuthLoading).toBe(false);
  });

  it('should set auth error message', () => {
    const errorMessage = 'Invalid email or password';
    useAppStore.getState().setAuthError(errorMessage);
    expect(useAppStore.getState().authError).toBe(errorMessage);

    useAppStore.getState().setAuthError(null);
    expect(useAppStore.getState().authError).toBeNull();
  });

  it('should set user and update authentication status', () => {
    const mockUser: AuthUser = { id: 'u1', name: 'Test User', email: 'test@example.com' };
    
    useAppStore.getState().setUser(mockUser);
    
    const state = useAppStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should set tokens correctly', () => {
    const expiresAt = Date.now() + 3600000; // 1 hour from now
    useAppStore.getState().setTokens('access-123', 'refresh-456', expiresAt);

    const state = useAppStore.getState();
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
    expect(state.sessionExpiresAt).toBe(expiresAt);
  });

  it('should clear user and token data on logout', () => {
    // Pre-populate state as an active session
    useAppStore.setState({
      user: { id: 'u1', name: 'Test User', email: 'test@example.com' } as AuthUser,
      isAuthenticated: true,
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      sessionExpiresAt: Date.now() + 3600000,
      theme: 'dark', 
    });

    useAppStore.getState().logout();

    const state = useAppStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.sessionExpiresAt).toBeNull();
    
    // Application preferences like theme should persist across logouts
    expect(state.theme).toBe('dark');
  });

  it('should set app theme', () => {
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });
});