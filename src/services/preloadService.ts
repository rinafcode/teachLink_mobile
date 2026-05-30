import * as Network from 'expo-network';
import { offlineStorage } from './offlineStorage';
import { useSettingsStore } from '../store/settingsStore';
import { useCourseProgressStore } from '../store/courseProgressStore';
import { useAppStore } from '../store/index';
import { useQuizStore } from '../store/quizStore';
import { courseApi } from './api/courseApi';
import { userApi } from './api/userApi';
import { ImageCache } from '../utils/imageCache';
import logger from '../utils/logger';
import { mobileAnalyticsService } from './mobileAnalytics';

// Default navigation transitions to use when no history is available
const STATIC_DEFAULTS: Record<string, string[]> = {
  '/(tabs)': ['/course-viewer', '/search', '/profile/[userId]', '/settings'],
  '/': ['/course-viewer', '/search', '/profile/[userId]', '/settings'],
  '/course-viewer': ['/quiz', '/(tabs)'],
  '/search': ['/course-viewer', '/(tabs)'],
  '/settings': ['/modal', '/(tabs)'],
  '/profile/[userId]': ['/(tabs)', '/settings'],
};

export class PreloadService {
  private transitionMatrix: Record<string, Record<string, number>> = {};
  private isInitialized = false;

  /**
   * Initialize PreloadService by restoring the transition matrix from storage.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const savedMatrix = await offlineStorage.retrieve<Record<string, Record<string, number>>>(
        '@teachlink_nav_matrix'
      );
      if (savedMatrix) {
        this.transitionMatrix = savedMatrix;
      }
      this.isInitialized = true;
      logger.info('PreloadService: Initialized navigation transition matrix successfully');
    } catch (error) {
      logger.error('PreloadService: Failed to load navigation transition matrix', error);
      // Fail gracefully and use in-memory matrix
      this.isInitialized = true;
    }
  }

  /**
   * Normalizes pathnames to prevent dynamic parameters (e.g. userIds or queries)
   * from bloating the transition matrix keys.
   */
  public normalizePath(path: string | null | undefined): string {
    if (!path) return '';
    // Strip query parameters
    let clean = path.split('?')[0];
    
    // Normalize profile ID routes
    if (clean.startsWith('/profile/')) {
      clean = '/profile/[userId]';
    }
    
    return clean;
  }

  /**
   * Record a route transition to update probability scores over time.
   */
  public async recordTransition(from: string | null | undefined, to: string | null | undefined): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    const cleanFrom = this.normalizePath(from);
    const cleanTo = this.normalizePath(to);

    if (!cleanFrom || !cleanTo || cleanFrom === cleanTo) {
      return;
    }

    try {
      if (!this.transitionMatrix[cleanFrom]) {
        this.transitionMatrix[cleanFrom] = {};
      }

      this.transitionMatrix[cleanFrom][cleanTo] = (this.transitionMatrix[cleanFrom][cleanTo] || 0) + 1;
      
      await offlineStorage.store('@teachlink_nav_matrix', this.transitionMatrix);
      logger.debug(`PreloadService: Recorded transition [${cleanFrom} -> ${cleanTo}]`);
    } catch (error) {
      logger.error('PreloadService: Failed to store transition matrix', error);
    }
  }

  /**
   * Get predicted next destination screens based on dynamic navigation history,
   * falling back to static defaults.
   */
  public getPredictiveDestinations(currentScreen: string | null | undefined, limit = 2): string[] {
    const cleanCurrent = this.normalizePath(currentScreen);
    if (!cleanCurrent) return [];

    const transitions = this.transitionMatrix[cleanCurrent] || {};
    const sortedHistory = Object.entries(transitions)
      .sort((a, b) => b[1] - a[1])
      .map(([dest]) => dest);

    const defaults = STATIC_DEFAULTS[cleanCurrent] || [];
    const merged = Array.from(new Set([...sortedHistory, ...defaults]));
    
    return merged.slice(0, limit);
  }

  /**
   * Preload route chunks, SWR data caches, and media assets for predicted destinations.
   */
  public async preload(currentScreen: string | null | undefined, router?: any): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    const cleanCurrent = this.normalizePath(currentScreen);
    if (!cleanCurrent) return;

    // 1. Guard checks: Network state and User Settings
    const settings = useSettingsStore.getState();
    
    let isWifi = true;
    let isOnline = true;
    
    try {
      const netState = await Network.getNetworkStateAsync();
      isOnline = netState.isConnected ?? true;
      isWifi = netState.type === Network.NetworkStateType.WIFI;
    } catch (error) {
      logger.warn('PreloadService: Failed to read network state, defaulting to online/WiFi', error);
    }

    if (!isOnline) {
      logger.debug('PreloadService: Skipped preloading — Device is offline');
      return;
    }

    if (settings.downloadOverWifiOnly && !isWifi) {
      logger.debug('PreloadService: Skipped preloading — WiFi only setting enabled and connection is cellular');
      return;
    }

    // 2. Identify predicted next destinations
    const predictedDestinations = this.getPredictiveDestinations(cleanCurrent);
    if (predictedDestinations.length === 0) return;

    logger.info(`PreloadService: Current screen is [${cleanCurrent}]. Preloading predicted destinations:`, predictedDestinations);

    const startTime = Date.now();

    // 3. Perform asynchronous multi-tier preloading in parallel (fire-and-forget)
    predictedDestinations.forEach(async (destination) => {
      // Tier A: Route JS prefetching
      if (router && typeof router.prefetch === 'function') {
        try {
          // Expo router expects full paths or relative paths. Normalize back to format route accepts
          router.prefetch(destination as any);
        } catch (e) {
          logger.warn(`PreloadService: Failed to prefetch route chunk for ${destination}`, e);
        }
      }

      // Tier B: API SWR Data & Assets preloading
      try {
        switch (destination) {
          case '/course-viewer': {
            // Preload main course list
            void courseApi.getCourses().catch(() => {});

            // Preload the detail and media of the user's most recently accessed course
            const progressMap = useCourseProgressStore.getState().progressMap;
            const sortedProgress = Object.values(progressMap).sort(
              (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
            );
            const recentCourseId = sortedProgress[0]?.courseId;
            
            if (recentCourseId) {
              courseApi.getCourse(recentCourseId)
                .then((course) => {
                  if (course?.thumbnail) {
                    void ImageCache.prefetchImages([course.thumbnail]);
                  }
                })
                .catch(() => {});
            }
            break;
          }

          case '/profile/[userId]': {
            const userId = useAppStore.getState().user?.id;
            if (userId) {
              void userApi.getUser(userId).catch(() => {});
            }
            break;
          }

          case '/quiz': {
            const progressMap = useCourseProgressStore.getState().progressMap;
            const sortedProgress = Object.values(progressMap).sort(
              (a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
            );
            const recentCourseId = sortedProgress[0]?.courseId;
            if (recentCourseId) {
              void useQuizStore.getState().loadQuizProgress(recentCourseId).catch(() => {});
            }
            break;
          }

          case '/search': {
            // Search screen displays and filters course lists
            void courseApi.getCourses().catch(() => {});
            break;
          }

          default:
            break;
        }
      } catch (err) {
        logger.error(`PreloadService: Error preloading data/resources for destination [${destination}]`, err);
      }
    });

    const duration = Date.now() - startTime;
    mobileAnalyticsService.trackPerformance('predictive_preload_latency', duration, {
      current_screen: cleanCurrent,
      preloaded_destinations: predictedDestinations.join(','),
      network_wifi: isWifi,
    });
  }

  /**
   * Reset transition matrix (mainly for testing or user data wipe)
   */
  public async clearMatrix(): Promise<void> {
    this.transitionMatrix = {};
    await offlineStorage.remove('@teachlink_nav_matrix');
    logger.info('PreloadService: Cleared transition matrix data successfully');
  }
}

export const preloadService = new PreloadService();
export default preloadService;
