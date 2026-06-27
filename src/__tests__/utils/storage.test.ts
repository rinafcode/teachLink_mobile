import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

import { safeStorageWrite, __resetQuotaErrorState } from '../../utils/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe('safeStorageWrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetQuotaErrorState();
  });

  it('should write successfully on first attempt', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    const result = await safeStorageWrite('test-key', 'test-value');
    expect(result).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('should catch quota error, clear analytics, and retry successfully', async () => {
    const quotaError = new Error('Quota exceeded');
    quotaError.name = 'QuotaExceededError';

    (AsyncStorage.setItem as jest.Mock)
      .mockRejectedValueOnce(quotaError) // First attempt fails
      .mockResolvedValueOnce(undefined); // Second attempt succeeds

    const result = await safeStorageWrite('test-key', 'test-value');
    
    expect(result).toBe(true);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@analytics/pending');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('should return false for non-quota errors and not retry', async () => {
    const normalError = new Error('Some other error');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(normalError);

    const result = await safeStorageWrite('test-key', 'test-value');
    
    expect(result).toBe(false);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('should report to Sentry only once per session if retry fails', async () => {
    const quotaError = new Error('Quota exceeded');
    quotaError.name = 'QuotaExceededError';

    (AsyncStorage.setItem as jest.Mock)
      .mockRejectedValueOnce(quotaError) // First call fails
      .mockRejectedValueOnce(quotaError) // Retry fails
      .mockRejectedValueOnce(quotaError) // Next call fails
      .mockRejectedValueOnce(quotaError); // Next retry fails

    // First attempt -> retry fails -> Sentry reported
    const result1 = await safeStorageWrite('test-key1', 'test-value1');
    expect(result1).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Second attempt -> retry fails -> Sentry NOT reported
    const result2 = await safeStorageWrite('test-key2', 'test-value2');
    expect(result2).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
