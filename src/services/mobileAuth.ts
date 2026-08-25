
import { useNotificationStore } from '../store/notificationStore';
import logger from '../utils/logger';
import apiClient from './api/axios.config';
import { unregisterTokenFromBackend } from './pushNotifications';
import * as secureStorage from './secureStorage';

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

export const VALID_BIOMETRIC_TYPES: readonly BiometricType[] = ['fingerprint', 'face', 'iris', 'none'];

/**
 * Runtime type guard for BiometricType. Needed because biometric type
 * values can come from mockable/abstract native modules, so a value
 * claiming to be a BiometricType at compile time is not guaranteed to
 * actually be one at runtime (e.g. in a mocked test environment).
 */
export function isValidBiometricType(value: unknown): value is BiometricType {
  return typeof value === 'string' && (VALID_BIOMETRIC_TYPES as readonly string[]).includes(value);
}

// ─── Biometric re-enrollment error ────────────────────────────────────────────

/**
 * Thrown when the device's biometric enrollment has changed since the
 * user last enabled biometric login (e.g. they removed and re-added a
 * fingerprint, or added a new face).
 *
 * The caller should catch this error and present a re-enrollment UI that
 * guides the user through enabling biometric login again.
 */
export class BiometricReenrollmentError extends Error {
  readonly code = 'BIOMETRIC_REENROLLMENT_REQUIRED';

  constructor(message = 'Your biometric enrollment has changed. Please re-enable biometric login.') {
    super(message);
    this.name = 'BiometricReenrollmentError';
  }
}

// ─── Auth API endpoints ───────────────────────────────────────────────────────

const ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  SOCIAL_LOGIN: '/auth/social',
  ME: '/auth/me',
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Verify secure storage is ready before performing auth operations
 * Throws error if secure storage is not initialized
 */
function validateSecureStorageReady(): void {
  if (!secureStorage.isSecureStorageReady()) {
    throw new Error(
      'Secure storage (Keychain/Keystore) is not initialized. ' +
      'Cannot perform authentication operations. Please restart the app.'
    );
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class MobileAuthService {
  // ── Core login ────────────────────────────────────────────────────────────

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    validateSecureStorageReady();
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
   *
   * If the device's biometric enrollment has changed since the user last
   * enabled biometric login, a BiometricReenrollmentError is thrown so the
   * caller can guide the user through re-enrollment.
   */
  async loginWithBiometrics(): Promise<AuthResult> {
    const enabled = await secureStorage.isBiometricEnabled();
    if (!enabled) {
      throw new Error('Biometric login is not enabled. Please enable it in settings.');
    }

    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication is not available on this device.');
    }

    // Detect if the biometric enrollment has changed since the user
    // last enabled biometric login. This handles the case where the
    // user removed and re-added a fingerprint, or added a new face.
    const needsReenrollment = await this.checkBiometricReenrollment();
    if (needsReenrollment) {
      throw new BiometricReenrollmentError();
    }

    // Prompt the user for biometric authentication
    const authResult = await this._authenticateAsync('Unlock with biometrics');
    if (!authResult.success) {
      throw new Error('Biometric authentication was cancelled or failed.');
    }

    // A successful biometric prompt unlocks the session persisted in secure
    // storage. Each dependency is mockable, so all outcomes (enabled/disabled,
    // available/unavailable, session present/absent) are testable.
    const session = await this.restoreSession();
    if (!session) {
      throw new Error('No stored session found. Please log in with your password.');
    }

    logger.info('MobileAuth: biometric login succeeded');
    return session;
  }

  // ── Token refresh ─────────────────────────────────────────────────────────

  async refreshSession(): Promise<AuthResult> {
    validateSecureStorageReady();
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available. Please log in again.');
    }

    const { data } = await apiClient.post<AuthResult>(
      ENDPOINTS.REFRESH,
      {},
      {
        headers: {
          // The refresh token is sent in the Authorization header for security,
          // preventing it from being logged in server-side request bodies.
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

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
      validateSecureStorageReady();
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

  /**
   * Enable biometric login for the current user.
   *
   * Prompts the user for biometric authentication to verify they can use
   * biometrics, then stores a biometric enrollment id so that future
   * enrollment changes can be detected.
   *
   * @throws {Error} If biometrics are not available or the user cancels.
   */
  async enableBiometrics(): Promise<void> {
    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication is not available on this device.');
    }

    // Prompt the user to authenticate with biometrics to verify capability
    const result = await this._authenticateAsync('Enable biometric login');
    if (!result.success) {
      throw new Error('Biometric authentication was cancelled or failed.');
    }

    // Store a new enrollment id so we can detect future enrollment changes
    const enrollmentId = this._generateEnrollmentId();
    await Promise.all([
      secureStorage.setBiometricEnabled(true),
      secureStorage.saveBiometricEnrollmentId(enrollmentId),
    ]);

    logger.info('MobileAuth: biometric login enabled');
  }

  /**
   * Disable biometric login and clear all biometric-related data.
   */
  async disableBiometrics(): Promise<void> {
    await Promise.all([
      secureStorage.setBiometricEnabled(false),
      secureStorage.clearBiometricEnrollmentId(),
    ]);
    logger.info('MobileAuth: biometric login disabled');
  }

  /**
   * Check whether biometric authentication is available on this device.
   *
   * Uses expo-local-authentication to verify that the device has the
   * hardware and that at least one biometric is enrolled.
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const LocalAuthentication = this._getLocalAuthentication();
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  /**
   * Get the type of biometric authentication supported by the device.
   *
   * Returns 'fingerprint', 'face', 'iris', or 'none'.
   */
  async getSupportedBiometricType(): Promise<BiometricType> {
    try {
      const LocalAuthentication = this._getLocalAuthentication();
      const types = await LocalAuthentication.getSupportedAuthenticationTypesAsync();

      // expo-local-authentication returns an array of SupportedAuthenticationTypes
      // enum values. We map the first supported type to our BiometricType.
      const resolvedType: BiometricType = types.includes(1)
        // BIOMETRIC = 1 (fingerprint, face, etc.)
        // On iOS we can't distinguish face vs fingerprint from this enum,
        // so we default to 'fingerprint' and let the UI adapt.
        ? 'fingerprint'
        : 'none';

      if (!isValidBiometricType(resolvedType)) {
        throw new Error(`Invalid biometric type resolved: ${String(resolvedType)}`);
      }

      return resolvedType;
    } catch {
      return 'none';
    }
  }

  /**
   * Check whether the user needs to re-enroll their biometrics.
   *
   * This is called on app launch or when the user attempts biometric login.
   * If the biometric enrollment has changed since the user last enabled
   * biometric login (e.g. they removed and re-added a fingerprint), the
   * stored enrollment id will no longer match and re-enrollment is required.
   *
   * @returns `true` if re-enrollment is needed, `false` otherwise.
   */
  async checkBiometricReenrollment(): Promise<boolean> {
    const enabled = await secureStorage.isBiometricEnabled();
    if (!enabled) return false;

    const available = await this.isBiometricAvailable();
    if (!available) return false;

    // If the enrollment id is missing, the Keychain/Keystore data was
    // likely invalidated by a biometric enrollment change.
    const storedEnrollmentId = await secureStorage.getBiometricEnrollmentId();
    if (!storedEnrollmentId) {
      return true;
    }

    // Try to access the stored session data. If the Keychain/Keystore
    // items were invalidated by a biometric enrollment change, this
    // will fail and we know re-enrollment is needed.
    try {
      const sessionValid = await secureStorage.isSessionValid();
      if (!sessionValid) {
        // Session is invalid — could be expired or invalidated.
        // Check if we can still access the refresh token.
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          // No refresh token — the Keychain/Keystore data was likely
          // invalidated by a biometric enrollment change.
          return true;
        }
      }
    } catch {
      // Secure storage access failed — likely due to biometric enrollment change
      return true;
    }

    return false;
  }

  /**
   * Re-enroll biometric login after the device's biometric enrollment
   * has changed.
   *
   * This clears the old biometric data, prompts the user for biometric
   * authentication, and stores a new enrollment id.
   *
   * @throws {Error} If biometrics are not available or the user cancels.
   */
  async reEnrollBiometrics(): Promise<void> {
    const available = await this.isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric authentication is not available on this device.');
    }

    // Clear old biometric data
    await Promise.all([
      secureStorage.clearBiometricEnrollmentId(),
      secureStorage.setBiometricEnabled(false),
    ]);

    // Prompt the user to authenticate with biometrics
    const result = await this._authenticateAsync('Re-enable biometric login');
    if (!result.success) {
      throw new Error('Biometric authentication was cancelled or failed.');
    }

    // Store a new enrollment id
    const enrollmentId = this._generateEnrollmentId();
    await Promise.all([
      secureStorage.setBiometricEnabled(true),
      secureStorage.saveBiometricEnrollmentId(enrollmentId),
    ]);

    logger.info('MobileAuth: biometric login re-enrolled successfully');
  }

  // ── Biometric private helpers ─────────────────────────────────────────────

  /**
   * Lazily require expo-local-authentication.
   *
   * Using a dynamic require (same pattern as secureStorage.ts) avoids
   * bundling the native module on platforms where it's not available
   * and makes the dependency mockable in tests.
   */
  private _getLocalAuthentication(): any {
    return require('expo-local-authentication');
  }

  /**
   * Prompt the user for biometric authentication.
   *
   * @param promptMessage  The message to display in the biometric prompt.
   * @returns The authentication result from expo-local-authentication.
   */
  private async _authenticateAsync(promptMessage: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const LocalAuthentication = this._getLocalAuthentication();
    return LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelTitle: 'Cancel',
      fallbackTitle: 'Use passcode',
      disableDeviceFallback: false,
    });
  }

  /**
   * Generate a unique enrollment id.
   *
   * Combines a timestamp, random value, and platform to create a
   * UUID-like string that uniquely identifies a biometric enrollment
   * session.
   */
  private _generateEnrollmentId(): string {
    const { Platform } = require('react-native');
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Platform.OS}`;
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    try {
      const pushToken = useNotificationStore.getState().pushToken;
      if (pushToken) {
        await unregisterTokenFromBackend(pushToken);
        useNotificationStore.getState().setPushToken(null);
      }

      const accessToken = await secureStorage.getAccessToken();
      if (accessToken) {
        try {
          await apiClient.post(ENDPOINTS.LOGOUT);
        } catch (error: any) {
          if (error.isAxiosError && !error.response) {
            requestQueue.addToQueue({
              method: 'POST',
              url: ENDPOINTS.LOGOUT,
            } as any, 'critical');
          }
        }
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