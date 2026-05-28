import AsyncStorage from '@react-native-async-storage/async-storage';

import { ImageCache } from './imageCache';
import logger from './logger'; // eslint-disable-line import/no-named-as-default

/**
 * Parses a semver string into its numeric components.
 * Returns null if the string is not a valid semver.
 */
export function parseSemver(
  version: string
): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Determines whether a cache should be invalidated based on version change.
 *
 * Rules:
 * - Major version bump  → invalidate (breaking change)
 * - Minor version bump  → invalidate (new features may change data shape)
 * - Patch version bump  → preserve  (backwards-compatible fix)
 * - Same version        → preserve
 */
export function shouldInvalidateCache(cachedVersion: string, newVersion: string): boolean {
  const cached = parseSemver(cachedVersion);
  const next = parseSemver(newVersion);

  if (!cached || !next) {
    // Unparseable version — invalidate to be safe
    return true;
  }

  if (next.major !== cached.major) return true;
  if (next.minor !== cached.minor) return true;
  return false;
}

const CACHE_VERSION_KEY = '@teachlink_cache_version';

/**
 * Returns the currently stored cache version, or null if none exists.
 */
export async function getStoredCacheVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_VERSION_KEY);
  } catch (error) {
    logger.error('Failed to read cache version', error);
    return null;
  }
}

/**
 * Persists the given version string as the current cache version.
 */
export async function setStoredCacheVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_VERSION_KEY, version);
  } catch (error) {
    logger.error('Failed to write cache version', error);
  }
}

/**
 * Checks the stored cache version against `newVersion` and, when a
 * major or minor bump is detected, clears all AsyncStorage entries
 * (except the version key itself) and the image cache.
 *
 * @returns `true` if the cache was invalidated, `false` if it was preserved.
 */
export async function handleCacheVersionUpdate(newVersion: string): Promise<boolean> {
  const storedVersion = await getStoredCacheVersion();

  const needsInvalidation =
    storedVersion === null || shouldInvalidateCache(storedVersion, newVersion);

  if (needsInvalidation) {
    logger.info(`Cache invalidated: ${storedVersion ?? 'none'} → ${newVersion}`);
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(k => k !== CACHE_VERSION_KEY);
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      await ImageCache.clearCache();
    } catch (error) {
      logger.error('Error clearing cache during version update', error);
    }
  } else {
    logger.info(`Cache preserved: ${storedVersion} → ${newVersion} (patch update)`);
  }

  await setStoredCacheVersion(newVersion);
  return needsInvalidation;
}
