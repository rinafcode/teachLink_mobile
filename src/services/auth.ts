import { useAppStore } from '../store';
import logger from '../utils/logger';
import mobileAuthService from './mobileAuth';

export type { AuthResult, AuthTokens, AuthUser, LoginCredentials } from './mobileAuth';

// ─── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginInput(email: string, password: string): void {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Email is required.');
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email and password.
 *
 * Validates credentials locally before hitting the network, then persists
 * tokens via secureStorage and syncs the resulting user into the global
 * Zustand store.
 *
 * @throws If validation fails or the API returns an error.
 */
export async function login(credentials: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<void> {
  const { email, password, rememberMe = false } = credentials;

  validateLoginInput(email, password);

  const store = useAppStore.getState();
  store.setAuthLoading(true);
  store.setAuthError(null);

  try {
    const result = await mobileAuthService.login({
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
    });

    store.setUser(result.user);
    store.setTokens(
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.expiresAt,
    );

    logger.info('AuthService: login successful', { userId: result.user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
    store.setAuthError(message);
    logger.error('AuthService: login failed', error);
    throw error;
  } finally {
    store.setAuthLoading(false);
  }
}

/**
 * Log out the current user.
 *
 * Notifies the backend (best-effort), clears all tokens from secure storage,
 * and resets the auth slice of the global store.
 */
export async function logout(): Promise<void> {
  const store = useAppStore.getState();
  store.setAuthLoading(true);

  try {
    await mobileAuthService.logout();
    store.logout();
    logger.info('AuthService: logout successful');
  } catch (error) {
    // Still reset local state even if the API call fails
    store.logout();
    logger.warn('AuthService: logout encountered an error, session cleared locally', error);
  } finally {
    store.setAuthLoading(false);
  }
}

/**
 * Determine whether the user has an active authenticated session.
 *
 * On app launch, call this to restore a previous session from secure storage
 * or attempt a silent token refresh. Updates the store accordingly.
 *
 * @returns `true` if the user is (or was restored as) authenticated.
 */
export async function checkAuthStatus(): Promise<boolean> {
  const store = useAppStore.getState();
  store.setAuthLoading(true);
  store.setAuthError(null);

  try {
    const session = await mobileAuthService.restoreSession();

    if (!session) {
      store.logout();
      logger.info('AuthService: no active session found');
      return false;
    }

    store.setUser(session.user);
    store.setTokens(
      session.tokens.accessToken,
      session.tokens.refreshToken,
      session.tokens.expiresAt,
    );

    logger.info('AuthService: session restored', { userId: session.user.id });
    return true;
  } catch (error) {
    store.logout();
    logger.error('AuthService: checkAuthStatus failed', error);
    return false;
  } finally {
    store.setAuthLoading(false);
  }
}
