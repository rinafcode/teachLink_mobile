import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseSemver,
  shouldInvalidateCache,
  getStoredCacheVersion,
  setStoredCacheVersion,
  handleCacheVersionUpdate,
} from '../../utils/cacheVersioning';
import { ImageCache } from '../../utils/imageCache';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../../utils/imageCache', () => ({
  ImageCache: {
    clearCache: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockImageCache = ImageCache as jest.Mocked<typeof ImageCache>;

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  mockStorage.getAllKeys.mockResolvedValue([]);
  mockStorage.multiRemove.mockResolvedValue(undefined);
  mockImageCache.clearCache.mockResolvedValue(undefined);
});

// ─── parseSemver ──────────────────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses a valid semver string', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('parses 0.0.0', () => {
    expect(parseSemver('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('returns null for invalid strings', () => {
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('1.2.3.4')).toBeNull();
    expect(parseSemver('abc')).toBeNull();
    expect(parseSemver('')).toBeNull();
  });
});

// ─── shouldInvalidateCache ────────────────────────────────────────────────────

describe('shouldInvalidateCache', () => {
  it('preserves cache on patch bump', () => {
    expect(shouldInvalidateCache('1.0.0', '1.0.1')).toBe(false);
    expect(shouldInvalidateCache('2.3.4', '2.3.9')).toBe(false);
  });

  it('preserves cache when version is identical', () => {
    expect(shouldInvalidateCache('1.2.3', '1.2.3')).toBe(false);
  });

  it('invalidates cache on minor bump', () => {
    expect(shouldInvalidateCache('1.0.0', '1.1.0')).toBe(true);
    expect(shouldInvalidateCache('1.2.3', '1.3.0')).toBe(true);
  });

  it('invalidates cache on major bump', () => {
    expect(shouldInvalidateCache('1.0.0', '2.0.0')).toBe(true);
    expect(shouldInvalidateCache('1.9.9', '2.0.0')).toBe(true);
  });

  it('invalidates cache when either version is unparseable', () => {
    expect(shouldInvalidateCache('bad', '1.0.0')).toBe(true);
    expect(shouldInvalidateCache('1.0.0', 'bad')).toBe(true);
    expect(shouldInvalidateCache('bad', 'bad')).toBe(true);
  });
});

// ─── getStoredCacheVersion ────────────────────────────────────────────────────

describe('getStoredCacheVersion', () => {
  it('returns the stored version string', async () => {
    mockStorage.getItem.mockResolvedValue('1.2.3');
    await expect(getStoredCacheVersion()).resolves.toBe('1.2.3');
  });

  it('returns null when nothing is stored', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    await expect(getStoredCacheVersion()).resolves.toBeNull();
  });

  it('returns null and logs on storage error', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage error'));
    await expect(getStoredCacheVersion()).resolves.toBeNull();
  });
});

// ─── setStoredCacheVersion ────────────────────────────────────────────────────

describe('setStoredCacheVersion', () => {
  it('writes the version to AsyncStorage', async () => {
    await setStoredCacheVersion('2.0.0');
    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink_cache_version', '2.0.0');
  });

  it('does not throw on storage error', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('write error'));
    await expect(setStoredCacheVersion('1.0.0')).resolves.toBeUndefined();
  });
});

// ─── handleCacheVersionUpdate ─────────────────────────────────────────────────

describe('handleCacheVersionUpdate', () => {
  it('invalidates cache and returns true when no version is stored', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.getAllKeys.mockResolvedValue(['@teachlink_courses', '@teachlink_user']);

    const result = await handleCacheVersionUpdate('1.0.0');

    expect(result).toBe(true);
    expect(mockStorage.multiRemove).toHaveBeenCalledWith(['@teachlink_courses', '@teachlink_user']);
    expect(mockImageCache.clearCache).toHaveBeenCalled();
    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink_cache_version', '1.0.0');
  });

  it('invalidates cache on major version bump', async () => {
    mockStorage.getItem.mockResolvedValue('1.0.0');
    mockStorage.getAllKeys.mockResolvedValue(['@teachlink_cache_version', '@teachlink_courses']);

    const result = await handleCacheVersionUpdate('2.0.0');

    expect(result).toBe(true);
    // Should NOT remove the version key itself
    expect(mockStorage.multiRemove).toHaveBeenCalledWith(['@teachlink_courses']);
    expect(mockImageCache.clearCache).toHaveBeenCalled();
  });

  it('invalidates cache on minor version bump', async () => {
    mockStorage.getItem.mockResolvedValue('1.0.0');
    mockStorage.getAllKeys.mockResolvedValue(['@teachlink_cache_version', '@teachlink_courses']);

    const result = await handleCacheVersionUpdate('1.1.0');

    expect(result).toBe(true);
    expect(mockImageCache.clearCache).toHaveBeenCalled();
  });

  it('preserves cache on patch version bump', async () => {
    mockStorage.getItem.mockResolvedValue('1.0.0');

    const result = await handleCacheVersionUpdate('1.0.1');

    expect(result).toBe(false);
    expect(mockStorage.multiRemove).not.toHaveBeenCalled();
    expect(mockImageCache.clearCache).not.toHaveBeenCalled();
    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink_cache_version', '1.0.1');
  });

  it('preserves cache when version is unchanged', async () => {
    mockStorage.getItem.mockResolvedValue('1.2.3');

    const result = await handleCacheVersionUpdate('1.2.3');

    expect(result).toBe(false);
    expect(mockStorage.multiRemove).not.toHaveBeenCalled();
    expect(mockImageCache.clearCache).not.toHaveBeenCalled();
  });

  it('skips multiRemove when there are no keys to remove', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.getAllKeys.mockResolvedValue(['@teachlink_cache_version']);

    await handleCacheVersionUpdate('1.0.0');

    expect(mockStorage.multiRemove).not.toHaveBeenCalled();
    expect(mockImageCache.clearCache).toHaveBeenCalled();
  });

  it('still updates the version even if cache clearing throws', async () => {
    mockStorage.getItem.mockResolvedValue('1.0.0');
    mockStorage.getAllKeys.mockRejectedValue(new Error('storage error'));

    const result = await handleCacheVersionUpdate('2.0.0');

    expect(result).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink_cache_version', '2.0.0');
  });
});
