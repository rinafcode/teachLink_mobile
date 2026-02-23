import * as LocalAuthentication from 'expo-local-authentication';
import apiClient from './api/axios.config';
import * as secureStorage from './secureStorage';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface SocialProvider {
  provider: 'google' | 'apple';
  idToken: string;
  accessToken?: string;
}

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

// ─── Auth API endpoints ───────────────────────────────────────────────────────

const ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  SOCIAL_LOGIN: '/auth/social',
  ME: '/auth/me',
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

class MobileAuthService {
  // ── Core login ────────────────────────────────────────────────────────────

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password, rememberMe = false } = credentials;

    const { data } = await apiClient.post<AuthResult>(ENDPOINTS.LOGIN, {
      email,
      password,
    });

    await this._persistSession(data, rememberMe, email);
    return data;
  }

  // ── Social login ──────────────────────────────────────────────────────────

  async loginWithSocial(social: SocialProvider): Promise<AuthResult> {
    const { data } = await apiClient.post<AuthResult>(ENDPOINTS.SOCIAL_LOGIN, social);
    await this._persistSession(data, false);
    return data;
  }

  // ── Biometric login ───────────────────────────────────────────────────────

  /**
   * Authenticate using the device biometrics (Face ID / Touch ID / Fingerprint).
   * Requires biometrics to have been previously enabled via enableBiometrics().
   */
  async loginWithBiometrics(): Promise<AuthResult> {
    const enabled = await secureStorage.isBiometricEnabled();
    if (!enabled) {
      throw new Error('Biometric login is not enabled. Please enable it in settings.');
    }

    const biometricResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to sign in',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    if (!biometricResult.success) {
      throw new Error(
        biometricResult.error === 'user_cancel'
          ? 'Authentication cancelled'
          : 'Biometric authentication failed',
      );
    }

    // After biometric passes, check if existing session is valid
    const sessionValid = await secureStorage.isSessionValid();
    if (sessionValid) {
      const user = await secureStorage.getUserData<AuthUser>();
      if (!user) throw new Error('No cached user found. Please log in with your password.');

      const accessToken = await secureStorage.getAccessToken();
      const refreshToken = await secureStorage.getRefreshToken();
      const expiresAt = await secureStorage.getSessionExpiresAt();

      return {
        user,
        tokens: {
          accessToken: accessToken!,
          refreshToken: refreshToken!,
          expiresAt: expiresAt!,
        },
      };
    }

    // Session expired — use refresh token to get new tokens silently
    return this.refreshSession();
  }

  // ── Token refresh ─────────────────────────────────────────────────────────

  async refreshSession(): Promise<AuthResult> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available. Please log in again.');
    }

    const { data } = await apiClient.post<AuthResult>(ENDPOINTS.REFRESH, {
      refreshToken,
    });

    await this._persistSession(data, false);
    return data;
  }

  // ── Session restore on app launch ─────────────────────────────────────────

  /**
   * Attempts to restore an existing session from secure storage.
   * Returns null if no valid session exists.
   */
  async restoreSession(): Promise<AuthResult | null> {
    try {
      const sessionValid = await secureStorage.isSessionValid();
      if (sessionValid) {
        const user = await secureStorage.getUserData<AuthUser>();
        const accessToken = await secureStorage.getAccessToken();
        const refreshToken = await secureStorage.getRefreshToken();
        const expiresAt = await secureStorage.getSessionExpiresAt();

        if (user && accessToken && refreshToken && expiresAt) {
          logger.info('MobileAuth: session restored from secure storage');
          return { user, tokens: { accessToken, refreshToken, expiresAt } };
        }
      }

      // Try silent refresh if refresh token exists
      const refreshToken = await secureStorage.getRefreshToken();
      if (refreshToken) {
        logger.info('MobileAuth: session expired, attempting silent refresh');
        return await this.refreshSession();
      }

      return null;
    } catch (error) {
      logger.warn('MobileAuth: session restore failed', error);
      return null;
    }
  }

  // ── Biometric management ──────────────────────────────────────────────────

  async enableBiometrics(): Promise<void> {
    const isAvailable = await this.isBiometricAvailable();
    if (!isAvailable) {
      throw new Error('Biometric authentication is not available on this device.');
    }

    // Confirm intent with a biometric prompt before enabling
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
      cancelLabel: 'Cancel',
    });

    if (!result.success) {
      throw new Error('Could not verify identity. Biometric login not enabled.');
    }

    await secureStorage.setBiometricEnabled(true);
    logger.info('MobileAuth: biometric login enabled');
  }

  async disableBiometrics(): Promise<void> {
    await secureStorage.setBiometricEnabled(false);
    logger.info('MobileAuth: biometric login disabled');
  }

  async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  }

  async getSupportedBiometricType(): Promise<BiometricType> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    try {
      // Notify backend
      const accessToken = await secureStorage.getAccessToken();
      if (accessToken) {
        await apiClient
          .post(ENDPOINTS.LOGOUT)
          .catch(() => {
            // Ignore network errors during logout
          });
      }
    } finally {
      await this._clearSession();
      logger.info('MobileAuth: logged out');
    }
  }

  // ── Remember Me ───────────────────────────────────────────────────────────

  async getRememberedEmail(): Promise<string | null> {
    const rememberMe = await secureStorage.isRememberMeEnabled();
    if (!rememberMe) return null;
    return secureStorage.getRememberedEmail();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _persistSession(
    result: AuthResult,
    rememberMe: boolean,
    email?: string,
  ): Promise<void> {
    await Promise.all([
      secureStorage.saveTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken,
        result.tokens.expiresAt,
      ),
      secureStorage.saveUserData(result.user as unknown as Record<string, unknown>),
      secureStorage.setRememberMe(rememberMe),
      rememberMe && email ? secureStorage.saveRememberedEmail(email) : Promise.resolve(),
    ]);
  }

  private async _clearSession(): Promise<void> {
    const biometricEnabled = await secureStorage.isBiometricEnabled();
    const rememberMe = await secureStorage.isRememberMeEnabled();
    const rememberedEmail = await secureStorage.getRememberedEmail();

    // Clear everything
    await secureStorage.clearAllAuthData();

    // Restore persistent preferences that survive logout
    if (biometricEnabled) {
      await secureStorage.setBiometricEnabled(true);
    }
    if (rememberMe && rememberedEmail) {
      await secureStorage.setRememberMe(true);
      await secureStorage.saveRememberedEmail(rememberedEmail);
    }
  }
}

export const mobileAuthService = new MobileAuthService();
export default mobileAuthService;
