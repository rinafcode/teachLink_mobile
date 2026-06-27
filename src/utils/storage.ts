import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

let hasReportedQuotaError = false;

/**
 * Safely writes data to AsyncStorage, handling quota exceeded errors.
 * If a quota error occurs, it clears the oldest analytics pending queue entries
 * and retries the write. If the retry fails, it reports the error to Sentry
 * (once per session) and returns false.
 *
 * @param key - The AsyncStorage key
 * @param value - The value to write
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function safeStorageWrite(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const isQuotaError =
      error?.message?.toLowerCase().includes('quota') ||
      error?.name?.toLowerCase().includes('quota');

    if (isQuotaError) {
      try {
        // Clear analytics pending queue to free space
        await AsyncStorage.removeItem('@analytics/pending');

        // Retry write
        await AsyncStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        if (!hasReportedQuotaError) {
          Sentry.captureException(retryError, {
            tags: { issue: 'async_storage_quota_exceeded' },
          });
          hasReportedQuotaError = true;
        }
        return false;
      }
    }

    return false;
  }
}

/**
 * Exposed for testing purposes to reset the session quota error state.
 */
export function __resetQuotaErrorState() {
  hasReportedQuotaError = false;
}
