// Fixes #963 — initializeSecureStorage() must not contain a test-environment
// branch that mutates production state. All env-specific logic is removed.

import * as SecureStore from 'expo-secure-store';

const STORAGE_PROBE_KEY = '__secure_storage_probe__';
const STORAGE_PROBE_VALUE = 'ok';

/**
 * Initialises secure storage by writing and reading back a probe value.
 * No test-environment branches — behaviour is identical in all environments.
 * Throws if the probe write/read cycle fails.
 */
export async function initializeSecureStorage(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_PROBE_KEY, STORAGE_PROBE_VALUE);
  const readBack = await SecureStore.getItemAsync(STORAGE_PROBE_KEY);
  if (readBack !== STORAGE_PROBE_VALUE) {
    throw new Error(
      `SecureStore initialisation failed: probe mismatch (got ${JSON.stringify(readBack)})`
    );
  }
  await SecureStore.deleteItemAsync(STORAGE_PROBE_KEY);
}