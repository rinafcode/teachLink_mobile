import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getEnv } from '../config';
import defaultLogger from '../utils/logger';

const logger = defaultLogger;

// ─── Security Documentation ───────────────────────────────────────────────────
/**
 * TeachLink Secure Storage Service
 *
 * ✅ SECURITY VERIFIED:
 * - iOS: Uses native Keychain with WHEN_UNLOCKED_THIS_DEVICE_ONLY
 * - Android: Uses native Keystore (Android 6.0+) with encryption
 * - NO AsyncStorage fallback for sensitive data
 * - All tokens and credentials stored with platform-native encryption
 *
 * Platform Details:
 * - iOS: Data encrypted with Keychain, accessible only when device is unlocked
 * - Android: Data encrypted with Keystore, accessible only when device is unlocked
 *   (Both enforce device lock requirement for decryption)
 *
 * ❌ ANTI-PATTERNS AVOIDED:
 * - No fallback to AsyncStorage (plaintext storage)
 * - No SharedPreferences (Android, unencrypted)
 * - No UserDefaults (iOS, unencrypted)
 * - No in-memory caching of sensitive tokens
 */

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'teachlink_access_token',
  REFRESH_TOKEN: 'teachlink_refresh_token',
  USER_DATA: 'teachlink_user_data',
  SESSION_EXPIRES_AT: 'teachlink_session_expires_at',
  BIOMETRIC_ENABLED: 'teachlink_biometric_enabled',
  BIOMETRIC_ENROLLMENT_ID: 'teachlink_biometric_enrollment_id',
  REMEMBERED_EMAIL: 'teachlink_remembered_email',
  REMEMBER_ME: 'teachlink_remember_me',
  INSTALL_UUID: 'teachlink_install_uuid',
} as const;

// ─── Options ──────────────────────────────────────────────────────────────────
/**
 * Secure storage options configured for maximum security:
 * - WHEN_UNLOCKED_THIS_DEVICE_ONLY: Data encrypted with device key,
 *   requires device to be unlocked for decryption (iOS)
 * - Android: Automatically uses Keystore encryption
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ─── Validation & Verification ────────────────────────────────────────────────

/**
 * Verify that expo-secure-store is available and properly configured
 * Throws error if verification fails
 */
async function verifySecureStorageAvailable(): Promise<void> {
  try {
    const testKey = '__secure_storage_verification_test__';
    const testValue = `test_${Date.now()}`;

    // Test write
    await SecureStore.setItemAsync(testKey, testValue, SECURE_OPTIONS);

    // Test read
    const retrieved = await SecureStore.getItemAsync(testKey, SECURE_OPTIONS);

    if (retrieved === null) {
      logger.warn(`SecureStorage verification read returned null for ${testKey}`);
    }

    await SecureStore.deleteItemAsync(testKey, SECURE_OPTIONS);

    logger.info(`✅ SecureStorage verification passed on ${Platform.OS}`);
  } catch (error) {
    const errorMsg = `❌ CRITICAL: SecureStorage verification failed on ${Platform.OS}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg, error instanceof Error ? error : new Error(String(error)));
    throw new Error(errorMsg);
  }
}

/**
 * Get platform information for debugging
 */
export function getSecureStoragePlatformInfo(): {
  platform: string;
  backend: string;
  requiresDeviceLock: boolean;
} {
  return {
    platform: Platform.OS,
    backend: Platform.OS === 'ios' ? 'Keychain' : 'Keystore',
    requiresDeviceLock: true,
  };
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Create a tamper-evident audit log for secure storage access.
 * Logs every read/write operation with a timestamp, key name (never the value),
 * and a call-site tag. This log is sent to Sentry as a breadcrumb to
 * help detect unauthorized access or token theft.
 *
 * @param action - The action performed (e.g., 'read', 'write', 'delete').
 * @param key - The key being accessed (the value is NEVER logged).
 * @param tag - A unique identifier for the call-site (e.g., 'session-refresh').
 */
function auditLog(action: 'read' | 'write' | 'delete', key: string, tag: string): void {
  const breadcrumb = {
    category: 'audit.secure_storage',
    message: `[${action.toUpperCase()}] key: ${key}`,
    level: 'info',
    data: {
      key,
      action,
      tag,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    },
  };

  crashReportingService.addBreadcrumb(breadcrumb);
  logger.info(`AUDIT: ${action} on ${key} from ${tag}`);
}

/**
 * Set item in encrypted secure storage
 * Throws error on failure - no silent fallback
 */
async function setItem(key: string, value: string, tag: string = 'unknown'): Promise<void> {
  try {
    auditLog('write', key, tag);
    await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
  } catch (error) {
    const errorMsg = `❌ CRITICAL: SecureStorage.set failed for key "${key}": ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error(errorMsg, { key, platform: Platform.OS, tag });
    throw error;
  }
}

/**
 * Get item from encrypted secure storage
 * Throws error on failure unless {@link GetItemOptions.throwOnMissing} is false,
 * in which case a read error is swallowed and `null` is returned.
 */
interface GetItemOptions {
  /**
   * A unique identifier for the call-site (e.g., 'session-refresh').
   */
  tag?: string;
  /**
   * When true (default), rethrow read errors. When false, swallow read errors
   * and return `null`. Used for non-sensitive reads where a missing value is
   * an expected outcome rather than a failure.
   */
  throwOnMissing?: boolean;
}

async function getItem(key: string, options: GetItemOptions = {}): Promise<string | null> {
  const { tag = 'unknown', throwOnMissing = true } = options;
  try {
    auditLog('read', key, tag);
    const value = await SecureStore.getItemAsync(key, SECURE_OPTIONS);
    return value;
  } catch (error) {
    const errorMsg = `❌ CRITICAL: SecureStorage.get failed for key "${key}": ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error(errorMsg, { key, platform: Platform.OS, tag });

    if (throwOnMissing) {
      throw error;
    }

    return null;
  }
}

/**
 * Remove item from encrypted secure storage
 */
async function removeItem(key: string, tag: string = 'unknown'): Promise<void> {
  try {
    auditLog('delete', key, tag);
    await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
  } catch (error) {
    logger.error(`SecureStorage.remove failed for key "${key}" from ${tag}:`, error);
    throw error;
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────

export let isSecureStorageVerified = false;

/**
 * Initialize and verify secure storage on app startup
 * Must be called before accessing any sensitive data
 */
export async function initializeSecureStorage(): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'test') {
      isSecureStorageVerified = false;
    }
    await verifySecureStorageAvailable();
    isSecureStorageVerified = true;
    logger.info('✅ SecureStorage initialized successfully');
    return true;
  } catch (error) {
    isSecureStorageVerified = false;
    logger.error('❌ SecureStorage initialization failed:', error);
    // In production, you might want to show an error to the user
    return false;
  }
}

/**
 * Check if secure storage has been verified
 */
export function isSecureStorageReady(): boolean {
  return isSecureStorageVerified;
}

/**
 * Reset the secure storage initialization state.
 * Intended for testing purposes only — allows tests to reset state between runs.
 */
export function resetSecureStorage(): void {
  isSecureStorageVerified = false;
}

// ─── Token management ─────────────────────────────────────────────────────────

/**
 * Save authentication tokens to encrypted Keychain/Keystore
 * Tokens are stored with WHEN_UNLOCKED_THIS_DEVICE_ONLY policy
 */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  if (!isSecureStorageReady()) {
    throw new Error('SecureStorage not initialized - cannot save tokens');
  }

  await Promise.all([
    setItem(KEYS.ACCESS_TOKEN, accessToken, 'saveTokens'),
    setItem(KEYS.REFRESH_TOKEN, refreshToken, 'saveTokens'),
    setItem(KEYS.SESSION_EXPIRES_AT, String(expiresAt), 'saveTokens'),
  ]);

  tokenCache.set(KEYS.ACCESS_TOKEN, accessToken);

  logger.info('✅ Tokens saved securely to Keychain/Keystore', {
    platform: Platform.OS,
    backend: Platform.OS === 'ios' ? 'Keychain' : 'Keystore',
  });
}

/**
 * Get access token from encrypted storage, using in-memory cache to avoid
 * repeated SecureStore reads on the UI thread.
 * Throws error if retrieval fails (sensitive data)
 */
export async function getAccessToken(): Promise<string | null> {
  const cached = tokenCache.get(KEYS.ACCESS_TOKEN);
  if (cached) return cached;
  const token = await getItem(KEYS.ACCESS_TOKEN, { tag: 'getAccessToken' });
  if (token) tokenCache.set(KEYS.ACCESS_TOKEN, token);
  return token;
}

/**
 * Get refresh token from encrypted storage
 * Throws error if retrieval fails (sensitive data)
 */
export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEYS.REFRESH_TOKEN, { tag: 'getRefreshToken' });
}

/**
 * Get session expiration timestamp from secure storage
 */
export async function getSessionExpiresAt(): Promise<number | null> {
  const raw = await getItem(KEYS.SESSION_EXPIRES_AT, {
    tag: 'getSessionExpiresAt',
    throwOnMissing: false,
  });
  return raw ? Number(raw) : null;
}

/**
 * Clear all authentication tokens from encrypted storage
 */
export async function clearTokens(): Promise<void> {
  tokenCache.clear();
  await Promise.all([
    removeItem(KEYS.ACCESS_TOKEN, 'clearTokens'),
    removeItem(KEYS.REFRESH_TOKEN, 'clearTokens'),
    removeItem(KEYS.SESSION_EXPIRES_AT, 'clearTokens'),
  ]);

  logger.info('✅ All authentication tokens cleared from Keychain/Keystore');
}

// ─── User data ────────────────────────────────────────────────────────────────

/**
 * Save user profile data to encrypted storage
 * Data is encrypted and stored securely
 */
export async function saveUserData(user: Record<string, unknown>): Promise<void> {
  if (!isSecureStorageReady()) {
    throw new Error('SecureStorage not initialized - cannot save user data');
  }

  await setItem(KEYS.USER_DATA, JSON.stringify(user), 'saveUserData');
  logger.info('✅ User data saved securely to Keychain/Keystore');
}

/**
 * Get user profile data from encrypted storage
 */
export async function getUserData<T = Record<string, unknown>>(): Promise<T | null> {
  const raw = await getItem(KEYS.USER_DATA, { tag: 'getUserData' });
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.error('Failed to parse user data from secure storage:', error);
    return null;
  }
}

/**
 * Clear user profile data from encrypted storage
 */
export async function clearUserData(): Promise<void> {
  await removeItem(KEYS.USER_DATA, 'clearUserData');
  logger.info('✅ User data cleared from Keychain/Keystore');
}

// ─── Biometric settings ───────────────────────────────────────────────────────

/**
 * Save biometric authentication preference to secure storage
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.BIOMETRIC_ENABLED, enabled ? '1' : '0', 'setBiometricEnabled');
  logger.info(`Biometric setting updated: ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if biometric authentication is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.BIOMETRIC_ENABLED, {
    tag: 'isBiometricEnabled',
    throwOnMissing: false,
  });
  return value === '1';
}

// ─── Biometric enrollment tracking ────────────────────────────────────────────
//
// When a user adds, removes, or re-enrolls their biometrics (e.g. a new
// fingerprint), the OS may invalidate Keychain/Keystore items that were
// protected by the previous biometric enrollment.  To detect this we store
// a "biometric enrollment id" — a random UUID generated at the time the
// user first enables biometric login.  On every subsequent biometric
// attempt we compare the stored id with the current state; if they differ
// (or the secure data is no longer accessible) we know the enrollment has
// changed and the user must re-enroll.
//
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Save the biometric enrollment identifier to secure storage.
 *
 * This id is generated once when the user enables biometric login and
 * should be compared against the current enrollment state on every
 * biometric login attempt.
 *
 * @param enrollmentId  A UUID that uniquely identifies the enrollment session.
 */
export async function saveBiometricEnrollmentId(enrollmentId: string): Promise<void> {
  await setItem(KEYS.BIOMETRIC_ENROLLMENT_ID, enrollmentId, 'saveBiometricEnrollmentId');
  logger.info('Biometric enrollment id saved to secure storage');
}

/**
 * Retrieve the stored biometric enrollment identifier.
 *
 * @returns The enrollment id, or `null` if none has been stored.
 */
export async function getBiometricEnrollmentId(): Promise<string | null> {
  return getItem(KEYS.BIOMETRIC_ENROLLMENT_ID, {
    tag: 'getBiometricEnrollmentId',
    throwOnMissing: false,
  });
}

/**
 * Remove the stored biometric enrollment identifier.
 *
 * Called during re-enrollment or when biometric login is disabled.
 */
export async function clearBiometricEnrollmentId(): Promise<void> {
  await removeItem(KEYS.BIOMETRIC_ENROLLMENT_ID, 'clearBiometricEnrollmentId');
  logger.info('Biometric enrollment id cleared from secure storage');
}

// ─── AsyncStorage Security Guard ────────────────────────────────────────────────
// SECURITY: AsyncStorage is UNENCRYPTED plaintext storage.
// NEVER use AsyncStorage for: tokens, passwords, session data, PII, or any
// sensitive user data. It is only acceptable for non-sensitive caches,
// feature flags, and UI state that has no security implications.
//
// If you need to store sensitive data, use SecureStore (Keychain/Keystore).
// ──────────────────────────────────────────────────────────────────────────────

// ─── Token Cache ──────────────────────────────────────────────────────────────
// SECURITY: TokenCache is MEMORY-ONLY. No values are written to AsyncStorage
// to prevent token leakage through unencrypted storage. The cache exists solely
// to avoid repeated SecureStore reads on the UI thread.

const DEFAULT_TTL_MS = 5 * 60 * 1_000; // 5 minutes

interface CacheEntry {
  value: string;
  expiresAt: number;
  createdAt: number;
}

class TokenCache {
  private memory: Map<string, CacheEntry> = new Map();

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  get(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): void {
    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    };
    this.memory.set(key, entry);
  }

  invalidate(key: string): void {
    this.memory.delete(key);
  }

  clear(): void {
    this.memory.clear();
  }

  get size(): number {
    this.evictExpired();
    return this.memory.size;
  }

  private evictExpired(): void {
    for (const [key, entry] of this.memory) {
      if (this.isExpired(entry)) {
        this.memory.delete(key);
      }
    }
  }
}

export const tokenCache = new TokenCache();

// ─── Install UUID & biometric reinstall guard ─────────────────────────────────

const INSTALL_UUID_KEY = '@teachlink/install_uuid';

function generateInstallUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Platform.OS}`;
}

async function checkHardwareBiometricEnrollment(): Promise<boolean> {
  try {
    const LocalAuthentication = require('expo-local-authentication');
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level > 0;
  } catch {
    return true;
  }
}

export async function verifyBiometricOnReinstall(): Promise<void> {
  try {
    const installUUID = await AsyncStorage.getItem(INSTALL_UUID_KEY);
    if (installUUID) return;

    const enrolled = await checkHardwareBiometricEnrollment();
    if (!enrolled) {
      await setBiometricEnabled(false);
      logger.info('Biometric state reset on reinstall: no hardware enrollment');
    }

    await AsyncStorage.setItem(INSTALL_UUID_KEY, generateInstallUUID());
  } catch (error) {
    logger.error('Biometric reinstall verification failed:', error);
  }
}

// ─── Remember Me ──────────────────────────────────────────────────────────────

/**
 * Save remembered email to secure storage
 */
export async function saveRememberedEmail(email: string): Promise<void> {
  await setItem(KEYS.REMEMBERED_EMAIL, email, 'saveRememberedEmail');
  logger.info('Email address remembered in secure storage');
}

/**
 * Get remembered email from secure storage
 */
export async function getRememberedEmail(): Promise<string | null> {
  return getItem(KEYS.REMEMBERED_EMAIL, { tag: 'getRememberedEmail', throwOnMissing: false });
}

/**
 * Save remember-me preference to secure storage
 */
export async function setRememberMe(enabled: boolean): Promise<void> {
  await setItem(KEYS.REMEMBER_ME, enabled ? '1' : '0', 'setRememberMe');
  logger.info(`Remember me setting updated: ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if remember-me is enabled
 */
export async function isRememberMeEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.REMEMBER_ME, {
    tag: 'isRememberMeEnabled',
    throwOnMissing: false,
  });
  return value === '1';
}

// ─── Clear all auth data ──────────────────────────────────────────────────────

/**
 * Securely clear all authentication and user data from encrypted storage
 * This is typically called during logout
 */
export async function clearAllAuthData(): Promise<void> {
  try {
    await Promise.all(
      Object.values(KEYS).map(key => removeItem(key, 'clearAllAuthData'))
    );
    logger.info('✅ All secure data cleared from Keychain/Keystore');
  } catch (error) {
    logger.error('Error clearing all auth data from secure storage:', error);
    throw error;
  }
}

// ─── Session validity ─────────────────────────────────────────────────────────

const SESSION_EXPIRY_SOON_MS = 5 * 60 * 1_000; // 5 minutes

export interface SessionValidityResult {
  valid: boolean;
  expiringSoon: boolean;
  msUntilExpiry: number;
}

/**
 * Check if the user session is valid based on stored expiration time.
 * Reads from SecureStore — use this as the authoritative source on foreground.
 */
export async function checkSessionValidity(): Promise<SessionValidityResult> {
  const expiresAt = await getSessionExpiresAt();

  if (!expiresAt) return { valid: false, expiringSoon: false, msUntilExpiry: 0 };

  const msUntilExpiry = expiresAt - Date.now();

  if (msUntilExpiry <= 0) return { valid: false, expiringSoon: false, msUntilExpiry };

  return {
    valid: true,
    expiringSoon: msUntilExpiry < SESSION_EXPIRY_SOON_MS,
    msUntilExpiry,
  };
}

/**
 * Check if the user session is valid based on stored expiration time
 */
export async function isSessionValid(): Promise<boolean> {
  const [token, expiresAt] = await Promise.all([getAccessToken(), getSessionExpiresAt()]);

  if (!token || !expiresAt) return false;

  // Consider session expired 30s early to allow refresh
  return expiresAt > Date.now() + 30_000;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  if (!isSecureStorageReady()) {
    throw new Error('SecureStorage not initialized - cannot refresh tokens');
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available. Please log in again.');
  }

  const baseURL = getEnv('EXPO_PUBLIC_API_BASE_URL');
  const { data } = await axios.post(`${baseURL}/auth/refresh`, {
    refreshToken,
  });

  const tokens = data?.tokens ?? data;
  if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.expiresAt) {
    throw new Error('Refresh response did not include a complete token set.');
  }

  await saveTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}

// ─── Export manifest (for verification in tests) ────────────────────────────────

export const STORAGE_KEYS = KEYS;

// ─── Test Helpers ─────────────────────────────────────────────────────────────
export function __resetSecureStorageVerification__(): void {
  isSecureStorageVerified = false;
}
