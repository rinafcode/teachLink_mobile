import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { AnalyticsEvent } from '../utils/trackingEvents';
import { mobileAnalyticsService } from './mobileAnalytics';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date';

export interface UpdateInfo {
  updateId: string | null;
  manifest: Updates.UpdateManifest | null;
  isEmergency: boolean;
  checkedAt: string;
}

export interface UpdateCheckResult {
  status: UpdateStatus;
  info?: UpdateInfo;
  error?: string;
}

/**
 * UpdateService wraps expo-updates to provide a clean API for checking,
 * downloading, and applying OTA updates with analytics tracking.
 */
class UpdateService {
  /**
   * Whether OTA updates are supported in the current environment.
   * Updates are not available when running the embedded (development) bundle.
   */
  get isSupported(): boolean {
    // isEmbeddedLaunch is true in Expo Go and dev client without a published update
    return !Updates.isEmbeddedLaunch;
  }

  /**
   * Returns metadata about the currently running update.
   */
  get currentUpdateInfo() {
    return {
      updateId: Updates.updateId ?? null,
      channel: Updates.channel ?? null,
      runtimeVersion: Updates.runtimeVersion ?? null,
      isEmbedded: Updates.isEmbeddedLaunch,
      platform: Platform.OS,
    };
  }

  /**
   * Check for an available OTA update.
   * Tracks the check attempt and result via analytics.
   */
  async checkForUpdate(): Promise<UpdateCheckResult> {
    if (!this.isSupported) {
      logger.info('[UpdateService] Skipping update check (dev/unsupported env)');
      return { status: 'idle' };
    }

    logger.info('[UpdateService] Checking for updates...');
    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_CHECK_STARTED, {
      channel: Updates.channel ?? 'unknown',
      runtimeVersion: Updates.runtimeVersion ?? 'unknown',
    });

    try {
      const result = await Updates.checkForUpdateAsync();

      if (result.isAvailable) {
        const info: UpdateInfo = {
          updateId: result.manifest?.id ?? null,
          manifest: result.manifest ?? null,
          isEmergency: result.isRollBackToEmbedded === false && !!result.manifest,
          checkedAt: new Date().toISOString(),
        };

        logger.info('[UpdateService] Update available:', info.updateId);
        mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_AVAILABLE, {
          updateId: info.updateId ?? 'unknown',
          channel: Updates.channel ?? 'unknown',
        });

        return { status: 'available', info };
      }

      logger.info('[UpdateService] App is up to date');
      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_NOT_AVAILABLE, {
        channel: Updates.channel ?? 'unknown',
      });

      return { status: 'up-to-date' };
    } catch (error: any) {
      const message = error?.message ?? 'Unknown error during update check';
      logger.error('[UpdateService] Update check failed:', message);
      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_CHECK_FAILED, {
        error: message,
      });
      return { status: 'error', error: message };
    }
  }

  /**
   * Download the available update bundle.
   */
  async downloadUpdate(): Promise<boolean> {
    if (!this.isSupported) return false;

    logger.info('[UpdateService] Downloading update...');
    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_STARTED, {
      channel: Updates.channel ?? 'unknown',
    });

    try {
      await Updates.fetchUpdateAsync();

      logger.info('[UpdateService] Update downloaded successfully');
      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_COMPLETE, {
        channel: Updates.channel ?? 'unknown',
      });

      return true;
    } catch (error: any) {
      const message = error?.message ?? 'Unknown error during download';
      logger.error('[UpdateService] Download failed:', message);
      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_FAILED, {
        error: message,
      });
      return false;
    }
  }

  /**
   * Reload the app to apply the downloaded update.
   */
  async applyUpdate(): Promise<void> {
    if (!this.isSupported) return;

    logger.info('[UpdateService] Applying update — reloading app');
    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_APPLIED, {
      channel: Updates.channel ?? 'unknown',
    });

    await Updates.reloadAsync();
  }

  /**
   * Convenience: check, download, and apply in one call.
   * Returns true if an update was applied (app will reload).
   */
  async checkAndApply(): Promise<boolean> {
    const result = await this.checkForUpdate();
    if (result.status !== 'available') return false;

    const downloaded = await this.downloadUpdate();
    if (!downloaded) return false;

    await this.applyUpdate();
    return true;
  }

  /**
   * Track when the user dismisses the update prompt.
   */
  trackDismissed(): void {
    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DISMISSED, {
      channel: Updates.channel ?? 'unknown',
    });
  }
}

export const updateService = new UpdateService();
export default updateService;
