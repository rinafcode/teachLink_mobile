/**
 * Tests for #616: useFormCache cache key is user-scoped.
 */
import {
  cacheFormValues,
  clearFormCache,
  getCachedFieldValues,
  getFormCacheStorageKey,
  loadFormCache,
} from '../../services/formCache';
import { encryptedGetItem, encryptedRemoveItem, encryptedSetItem } from '../../utils/encryptedStorage';

jest.mock('../../utils/encryptedStorage');

const mockGetItem = jest.mocked(encryptedGetItem);
const mockSetItem = jest.mocked(encryptedSetItem);
const mockRemoveItem = jest.mocked(encryptedRemoveItem);

describe('formCache – user-scoped storage key (#616)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  it('generates distinct keys for different users', () => {
    expect(getFormCacheStorageKey('user-1')).not.toBe(getFormCacheStorageKey('user-2'));
  });

  it('generates key that includes the userId', () => {
    expect(getFormCacheStorageKey('abc123')).toContain('abc123');
  });

  it('uses user-scoped key when reading cache', async () => {
    const key = getFormCacheStorageKey('user-1');
    await loadFormCache(key);
    expect(mockGetItem).toHaveBeenCalledWith(key);
  });

  it('uses user-scoped key when writing cache', async () => {
    const key = getFormCacheStorageKey('user-1');
    await cacheFormValues(key, { fullName: 'Alice' });
    expect(mockSetItem).toHaveBeenCalledWith(key, expect.any(String));
  });

  it('does not read or write to another user key', async () => {
    const keyA = getFormCacheStorageKey('user-A');
    const keyB = getFormCacheStorageKey('user-B');

    await cacheFormValues(keyA, { fullName: 'Alice' });

    const allSetCalls = mockSetItem.mock.calls.map(([k]) => k);
    expect(allSetCalls).not.toContain(keyB);
  });

  it('reads from the correct user key and ignores another user data', async () => {
    const keyA = getFormCacheStorageKey('user-A');
    const keyB = getFormCacheStorageKey('user-B');

    const now = Date.now();
    mockGetItem.mockImplementation(k => {
      if (k === keyA)
        return Promise.resolve(JSON.stringify({ fullName: { value: 'Alice', updatedAt: now } }));
      return Promise.resolve(null);
    });

    const valuesA = await getCachedFieldValues(keyA, ['fullName']);
    const valuesB = await getCachedFieldValues(keyB, ['fullName']);

    expect(valuesA.fullName).toBe('Alice');
    expect(valuesB.fullName).toBeUndefined();
  });

  it('clears only the correct user key', async () => {
    const keyA = getFormCacheStorageKey('user-A');
    await clearFormCache(keyA);
    expect(mockRemoveItem).toHaveBeenCalledWith(keyA);
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
  });
});
