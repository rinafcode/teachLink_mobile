import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import mobileAnalyticsService from './mobileAnalytics';
import { appLogger } from '../utils/logger';
import { AnalyticsEvent } from '../utils/trackingEvents';

export type UpdateType = 'ota' | 'store' | 'none';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  updateType: UpdateType;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  isMandatory?: boolean;
}

export interface UpdateConfig {
  checkOnStartup: boolean;
  checkIntervalMs: number;
  storeUrls: {
    ios: string;
    android: string;
  };
}

const DEFAULT_CONFIG: UpdateConfig = {
  checkOnStartup: true,
  checkIntervalMs: 24 * 60 * 60 * 1000,
  storeUrls: {
    ios: 'https://apps.apple.com/app/teachlink/id1234567890',
    android: 'https://play.google.com/store/apps/details?id=com.jaynomyaro.teachlink',
  },
};

class AppUpdateService {
  private config: UpdateConfig = DEFAULT_CONFIG;
  private lastCheckTimestamp: number = 0;
  private otaModule: typeof import('expo-updates') | null = null;

  public setConfig(config: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): Readonly<UpdateConfig> {
    return { ...this.config };
  }

  private async getOtaModule(): Promise<typeof import('expo-updates') | null> {
    if (this.otaModule !== null) return this.otaModule;
    try {
      this.otaModule = await import('expo-updates');
      return this.otaModule;
    } catch {
      return null;
    }
  }

  public getCurrentVersion(): string {
    return Constants.expoConfig?.version ?? '0.0.0';
  }

  public shouldCheck(): boolean {
    const elapsed = Date.now() - this.lastCheckTimestamp;
    return elapsed >= this.config.checkIntervalMs;
  }

  public async checkForUpdate(): Promise<UpdateCheckResult> {
    const currentVersion = this.getCurrentVersion();
    this.lastCheckTimestamp = Date.now();

    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_CHECK_STARTED, {
      current_version: currentVersion,
      platform: Platform.OS,
    });

    appLogger.info(`AppUpdate: Checking for updates (current: ${currentVersion})`);

    const Updates = await this.getOtaModule();

    if (Updates && !Updates.isEmbeddedLaunch) {
      return this.checkOtaUpdate(Updates, currentVersion);
    }

    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_NOT_AVAILABLE, {
      current_version: currentVersion,
      check_type: 'ota_unavailable',
    });

    return { updateAvailable: false, updateType: 'none', currentVersion };
  }

  private async checkOtaUpdate(
    Updates: typeof import('expo-updates'),
    currentVersion: string
  ): Promise<UpdateCheckResult> {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_NOT_AVAILABLE, {
          current_version: currentVersion,
          check_type: 'ota',
        });
        appLogger.info('AppUpdate: No OTA update available');
        return { updateAvailable: false, updateType: 'none', currentVersion };
      }

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_AVAILABLE, {
        current_version: currentVersion,
        update_type: 'ota',
      });

      appLogger.info('AppUpdate: OTA update available');
      return {
        updateAvailable: true,
        updateType: 'ota',
        currentVersion,
        releaseNotes: update.manifest?.extra?.releaseNotes as string | undefined,
        isMandatory: update.manifest?.extra?.isMandatory as boolean | undefined,
      };
    } catch (error) {
      appLogger.error('AppUpdate: OTA check failed', error);
      return { updateAvailable: false, updateType: 'none', currentVersion };
    }
  }

  public async downloadAndApplyOtaUpdate(): Promise<boolean> {
    const Updates = await this.getOtaModule();
    if (!Updates) return false;

    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_STARTED, {
      current_version: this.getCurrentVersion(),
    });

    try {
      await Updates.fetchUpdateAsync();

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_COMPLETED, {
        current_version: this.getCurrentVersion(),
      });

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_APPLIED, {
        current_version: this.getCurrentVersion(),
        update_type: 'ota',
      });

      await Updates.reloadAsync();
      return true;
    } catch (error) {
      appLogger.error('AppUpdate: Download/apply failed', error);

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DOWNLOAD_FAILED, {
        current_version: this.getCurrentVersion(),
        error: error instanceof Error ? error.message : 'unknown',
      });

      return false;
    }
  }

  public async openStoreForUpdate(): Promise<void> {
    const url =
      Platform.OS === 'ios' ? this.config.storeUrls.ios : this.config.storeUrls.android;

    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_STORE_REDIRECT, {
      current_version: this.getCurrentVersion(),
      platform: Platform.OS,
      store_url: url,
    });

    appLogger.info(`AppUpdate: Opening store URL: ${url}`);

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      appLogger.warn(`AppUpdate: Cannot open store URL: ${url}`);
    }
  }

  public trackDismissed(updateType: UpdateType): void {
    mobileAnalyticsService.trackEvent(AnalyticsEvent.UPDATE_DISMISSED, {
      current_version: this.getCurrentVersion(),
      update_type: updateType,
    });
  }
}

export const appUpdateService = new AppUpdateService();
export default appUpdateService;
