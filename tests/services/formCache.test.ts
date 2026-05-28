import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  cacheFormValues,
  clearFormCache,
  FORM_CACHE_STORAGE_KEY,
  FORM_CACHE_TTL_MS,
  getCachedFieldValue,
  getSuggestionForField,
  isExpired,
  loadFormCache,
  pruneExpiredCache,
  setCachedFieldValue,
} from '../../src/services/formCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('formCache', () => {
  describe('isExpired', () => {
    it('returns true when older than TTL', () => {
      const old = Date.now() - FORM_CACHE_TTL_MS - 1000;
      expect(isExpired({ value: 'x', updatedAt: old })).toBe(true);
    });

    it('returns false when within TTL', () => {
      expect(isExpired({ value: 'x', updatedAt: Date.now() })).toBe(false);
    });
  });

  describe('pruneExpiredCache', () => {
    it('drops expired entries', () => {
      const now = Date.now();
      const store = pruneExpiredCache(
        {
          email: { value: 'a@b.com', updatedAt: now },
          location: { value: 'Old', updatedAt: now - FORM_CACHE_TTL_MS - 1 },
        },
        now
      );
      expect(store.email).toBeDefined();
      expect(store.location).toBeUndefined();
    });
  });

  describe('getSuggestionForField', () => {
    it('returns null when current matches cache', () => {
      const s = getSuggestionForField({ email: { value: 'a@b.com', updatedAt: Date.now() } }, 'email', 'a@b.com');
      expect(s).toBeNull();
    });

    it('returns cached when different from current', () => {
      const s = getSuggestionForField(
        { email: { value: 'cached@test.com', updatedAt: Date.now() } },
        'email',
        'other@test.com'
      );
      expect(s).toBe('cached@test.com');
    });
  });

  describe('loadFormCache', () => {
    it('returns empty object when storage is empty', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      expect(await loadFormCache()).toEqual({});
    });

    it('parses valid JSON and persists prune when expired keys exist', async () => {
      const now = Date.now();
      const raw = JSON.stringify({
        email: { value: 'keep@x.com', updatedAt: now },
        city: { value: 'gone', updatedAt: now - FORM_CACHE_TTL_MS - 10 },
      });
      mockGetItem.mockResolvedValueOnce(raw);
      const result = await loadFormCache();
      expect(result.city).toBeUndefined();
      expect(result.email?.value).toBe('keep@x.com');
      expect(mockSetItem).toHaveBeenCalled();
    });
  });

  describe('setCachedFieldValue', () => {
    it('does not persist empty strings', async () => {
      mockGetItem.mockResolvedValueOnce('{}');
      await setCachedFieldValue('fullName', '   ');
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('merges with existing store', async () => {
      mockGetItem.mockResolvedValueOnce(JSON.stringify({}));
      await setCachedFieldValue('fullName', 'Jane');
      const written = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(written.fullName.value).toBe('Jane');
      expect(mockSetItem.mock.calls[0][0]).toBe(FORM_CACHE_STORAGE_KEY);
    });
  });

  describe('cacheFormValues', () => {
    it('writes multiple keys', async () => {
      mockGetItem.mockResolvedValueOnce('{}');
      await cacheFormValues({ fullName: 'A', email: 'a@b.com' });
      const written = JSON.parse(mockSetItem.mock.calls[0][1] as string);
      expect(written.fullName.value).toBe('A');
      expect(written.email.value).toBe('a@b.com');
    });
  });

  describe('getCachedFieldValue', () => {
    it('returns null for missing key', async () => {
      mockGetItem.mockResolvedValueOnce('{}');
      expect(await getCachedFieldValue('phone')).toBeNull();
    });
  });

  describe('clearFormCache', () => {
    it('removes storage key', async () => {
      await clearFormCache();
      expect(mockRemoveItem).toHaveBeenCalledWith(FORM_CACHE_STORAGE_KEY);
    });
  });
});
