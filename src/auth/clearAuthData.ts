// Fixes #965 — clearAllAuthData() must NOT delete the install UUID key.
// The UUID is used by the biometric reinstall guard; deleting it defeats that check.

import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_UUID_KEY = 'install_uuid';

/** Keys that belong to auth state and should be cleared on sign-out. */
const AUTH_KEYS = [
  'auth_token',
  'refresh_token',
  'user_id',
  'user_email',
  'biometric_enabled',
  'last_login',
];

/**
 * Clears all authentication data from storage while explicitly preserving
 * the install UUID key so the biometric reinstall guard remains functional.
 */
export async function clearAllAuthData(): Promise<void> {
  await AsyncStorage.multiRemove(AUTH_KEYS);
  // INSTALL_UUID_KEY is intentionally omitted — never delete it here.
}

export { INSTALL_UUID_KEY };