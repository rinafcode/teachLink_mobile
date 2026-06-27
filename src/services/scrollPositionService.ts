import AsyncStorage from '@react-native-async-storage/async-storage';

import logger from '../utils/logger';

const SCROLL_POSITION_PREFIX = '@teachlink_scroll_';
const SCROLL_TIMESTAMP_PREFIX = '@teachlink_scroll_ts_';

export interface ScrollPositionData {
  offset: number;
  timestamp: number;
}

/**
 * ScrollPositionService manages scroll position persistence for navigation restoration.
 *
 * Features:
 * - Tracks scroll position per screen/route
 * - Automatically clears outdated positions (> 24 hours)
 * - Handles list updates by detecting content size changes
 * - Memory-efficient with automatic cleanup
 *
 * How it works:
 * 1. `savePosition()` stores scroll offset + timestamp for a route
 * 2. `getPosition()` retrieves saved position if still valid
 * 3. `clearPosition()` removes position when screen updates
 * 4. `clearOldPositions()` runs periodically to clean up stale data
 */
class ScrollPositionService {
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  private positionCache: Map<string, ScrollPositionData> = new Map();

  /**
   * Save the current scroll position for a route
   * @param route - The route/screen identifier
   * @param offset - The scroll Y offset
   */
  async savePosition(route: string, offset: number): Promise<void> {
    if (offset < 0) return; // Invalid offset
    if (!route) {
      logger.warn('ScrollPositionService: Attempted to save position with empty route');
      return;
    }

    try {
      const key = `${SCROLL_POSITION_PREFIX}${route}`;
      const data: ScrollPositionData = {
        offset,
        timestamp: Date.now(),
      };

      // Store in cache
      this.positionCache.set(route, data);

      // Store in persistent storage
      await AsyncStorage.setItem(key, JSON.stringify(data));

      logger.debug(`ScrollPositionService: Saved position for ${route}: ${offset}px`);
    } catch (error) {
      logger.error('ScrollPositionService: Failed to save position', error);
    }
  }

  /**
   * Retrieve the saved scroll position for a route if still valid
   * @param route - The route/screen identifier
   * @returns ScrollPositionData or null if not found or expired
   */
  async getPosition(route: string): Promise<ScrollPositionData | null> {
    if (!route) return null;

    try {
      // Check cache first
      if (this.positionCache.has(route)) {
        const data = this.positionCache.get(route)!;
        if (this.isPositionValid(data)) {
          return data;
        } else {
          this.positionCache.delete(route);
        }
      }

      // Fetch from storage
      const key = `${SCROLL_POSITION_PREFIX}${route}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const data = JSON.parse(raw) as ScrollPositionData;

      // Validate age
      if (!this.isPositionValid(data)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      // Update cache
      this.positionCache.set(route, data);
      return data;
    } catch (error) {
      logger.error('ScrollPositionService: Failed to retrieve position', error);
      return null;
    }
  }

  /**
   * Clear the saved position for a route (e.g., when list content updates)
   * @param route - The route/screen identifier
   */
  async clearPosition(route: string): Promise<void> {
    if (!route) return;

    try {
      const key = `${SCROLL_POSITION_PREFIX}${route}`;
      this.positionCache.delete(route);
      await AsyncStorage.removeItem(key);
      logger.debug(`ScrollPositionService: Cleared position for ${route}`);
    } catch (error) {
      logger.error('ScrollPositionService: Failed to clear position', error);
    }
  }

  /**
   * Clear positions older than MAX_AGE_MS
   * Should be called periodically (e.g., on app startup)
   */
  async clearOldPositions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scrollKeys = keys.filter((key) => key.startsWith(SCROLL_POSITION_PREFIX));

      const now = Date.now();
      const keysToRemove: string[] = [];

      for (const key of scrollKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;

          const data = JSON.parse(raw) as ScrollPositionData;
          if (now - data.timestamp > this.MAX_AGE_MS) {
            keysToRemove.push(key);
          }
        } catch (e) {
          logger.warn(`ScrollPositionService: Failed to parse key ${key}, marking for removal`);
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        logger.debug(`ScrollPositionService: Cleared ${keysToRemove.length} old positions`);
      }
    } catch (error) {
      logger.error('ScrollPositionService: Failed to clear old positions', error);
    }
  }

  /**
   * Check if a position is still valid (not expired)
   */
  private isPositionValid(data: ScrollPositionData): boolean {
    const age = Date.now() - data.timestamp;
    return age < this.MAX_AGE_MS;
  }

  /**
   * Clear all saved positions (useful for testing or user data reset)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scrollKeys = keys.filter((key) => key.startsWith(SCROLL_POSITION_PREFIX));
      await AsyncStorage.multiRemove(scrollKeys);
      this.positionCache.clear();
      logger.debug('ScrollPositionService: Cleared all positions');
    } catch (error) {
      logger.error('ScrollPositionService: Failed to clear all positions', error);
    }
  }
}

// Export singleton instance
export const scrollPositionService = new ScrollPositionService();
