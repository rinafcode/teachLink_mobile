import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'teachlink_access_token',
  REFRESH_TOKEN: 'teachlink_refresh_token',
  USER_DATA: 'teachlink_user_data',
  SESSION_EXPIRES_AT: 'teachlink_session_expires_at',
  BIOMETRIC_ENABLED: 'teachlink_biometric_enabled',
  REMEMBERED_EMAIL: 'teachlink_remembered_email',
  REMEMBER_ME: 'teachlink_remember_me',
} as const;

// ─── Options ──────────────────────────────────────────────────────────────────

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function setItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
  } catch (error) {
    logger.error(`SecureStorage.set failed for key "${key}":`, error);
    throw error;
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, SECURE_OPTIONS);
  } catch (error) {
    logger.error(`SecureStorage.get failed for key "${key}":`, error);
    return null;
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
  } catch (error) {
    logger.error(`SecureStorage.remove failed for key "${key}":`, error);
  }
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
): Promise<void> {
  await Promise.all([
    setItem(KEYS.ACCESS_TOKEN, accessToken),
    setItem(KEYS.REFRESH_TOKEN, refreshToken),
    setItem(KEYS.SESSION_EXPIRES_AT, String(expiresAt)),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEYS.REFRESH_TOKEN);
}

export async function getSessionExpiresAt(): Promise<number | null> {
  const raw = await getItem(KEYS.SESSION_EXPIRES_AT);
  return raw ? Number(raw) : null;
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    removeItem(KEYS.ACCESS_TOKEN),
    removeItem(KEYS.REFRESH_TOKEN),
    removeItem(KEYS.SESSION_EXPIRES_AT),
  ]);
}

// ─── User data ────────────────────────────────────────────────────────────────

export async function saveUserData(user: Record<string, unknown>): Promise<void> {
  await setItem(KEYS.USER_DATA, JSON.stringify(user));
}

export async function getUserData<T = Record<string, unknown>>(): Promise<T | null> {
  const raw = await getItem(KEYS.USER_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearUserData(): Promise<void> {
  await removeItem(KEYS.USER_DATA);
}

// ─── Biometric settings ───────────────────────────────────────────────────────

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setItem(KEYS.BIOMETRIC_ENABLED, enabled ? '1' : '0');
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.BIOMETRIC_ENABLED);
  return value === '1';
}

// ─── Remember Me ──────────────────────────────────────────────────────────────

export async function saveRememberedEmail(email: string): Promise<void> {
  await setItem(KEYS.REMEMBERED_EMAIL, email);
}

export async function getRememberedEmail(): Promise<string | null> {
  return getItem(KEYS.REMEMBERED_EMAIL);
}

export async function setRememberMe(enabled: boolean): Promise<void> {
  await setItem(KEYS.REMEMBER_ME, enabled ? '1' : '0');
}

export async function isRememberMeEnabled(): Promise<boolean> {
  const value = await getItem(KEYS.REMEMBER_ME);
  return value === '1';
}

// ─── Clear all auth data ──────────────────────────────────────────────────────

export async function clearAllAuthData(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(removeItem));
  logger.info('SecureStorage: all auth data cleared');
}

// ─── Session validity ─────────────────────────────────────────────────────────

export async function isSessionValid(): Promise<boolean> {
  const [token, expiresAt] = await Promise.all([
    getAccessToken(),
    getSessionExpiresAt(),
  ]);

  if (!token || !expiresAt) return false;
  // Consider session expired 30s early to allow refresh
  return expiresAt > Date.now() + 30_000;
}
