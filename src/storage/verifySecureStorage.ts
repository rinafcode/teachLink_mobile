// Fixes #962 — verifySecureStorageAvailable() must treat a null read-back
// as a hard failure, not just a warning. Returns false (or throws) on failure.

import * as SecureStore from 'expo-secure-store';

const PROBE_KEY = '__verify_secure_storage__';
const PROBE_VALUE = 'probe';

/**
 * Verifies that SecureStore is available and functional.
 * Returns true only when a probe value can be written and read back exactly.
 * A null or mismatched read-back is treated as a hard failure (returns false).
 */
export async function verifySecureStorageAvailable(): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(PROBE_KEY, PROBE_VALUE);
    const result = await SecureStore.getItemAsync(PROBE_KEY);

    if (result === null) {
      // Hard failure — null means SecureStore is not functioning correctly.
      return false;
    }

    if (result !== PROBE_VALUE) {
      return false;
    }

    await SecureStore.deleteItemAsync(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}