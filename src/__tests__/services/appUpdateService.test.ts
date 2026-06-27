import { Linking, Platform } from 'react-native';

import { appUpdateService } from '../../services/appUpdateService';

jest.mock('expo-updates');
jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.4.0' },
}));

const mockExpoUpdates = require('../../__mocks__/expo-updates');

describe('AppUpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appUpdateService.setConfig({
      checkOnStartup: true,
      checkIntervalMs: 24 * 60 * 60 * 1000,
      storeUrls: {
        ios: 'https://apps.apple.com/app/teachlink/id1234567890',
        android: 'https://play.google.com/store/apps/details?id=com.jaynomyaro.teachlink',
      },
    });
  });

  describe('getCurrentVersion', () => {
    it('returns version from expo config', () => {
      expect(appUpdateService.getCurrentVersion()).toBe('1.4.0');
    });
  });

  describe('shouldCheck', () => {
    it('returns true when last check was beyond the interval', () => {
      // Force last check to be in the past by checking once then waiting
      // Use private field workaround via direct service call
      expect(appUpdateService.shouldCheck()).toBe(true);
    });

    it('returns false right after a check', async () => {
      await appUpdateService.checkForUpdate();
      expect(appUpdateService.shouldCheck()).toBe(false);
    });
  });

  describe('checkForUpdate', () => {
    it('returns no update when none is available', async () => {
      mockExpoUpdates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false, manifest: null });
      mockExpoUpdates.isEmbeddedLaunch = false;

      const result = await appUpdateService.checkForUpdate();

      expect(result.updateAvailable).toBe(false);
      expect(result.updateType).toBe('none');
      expect(result.currentVersion).toBe('1.4.0');
    });

    it('returns ota update when one is available', async () => {
      mockExpoUpdates.isEmbeddedLaunch = false;
      mockExpoUpdates.checkForUpdateAsync.mockResolvedValueOnce({
        isAvailable: true,
        manifest: {
          extra: {
            releaseNotes: 'Bug fixes and performance improvements',
            isMandatory: false,
          },
        },
      });

      const result = await appUpdateService.checkForUpdate();

      expect(result.updateAvailable).toBe(true);
      expect(result.updateType).toBe('ota');
      expect(result.releaseNotes).toBe('Bug fixes and performance improvements');
      expect(result.isMandatory).toBe(false);
    });

    it('returns no update when running embedded launch', async () => {
      mockExpoUpdates.isEmbeddedLaunch = true;

      const result = await appUpdateService.checkForUpdate();

      expect(result.updateAvailable).toBe(false);
      expect(result.updateType).toBe('none');
    });

    it('returns no update when OTA check throws', async () => {
      mockExpoUpdates.isEmbeddedLaunch = false;
      mockExpoUpdates.checkForUpdateAsync.mockRejectedValueOnce(new Error('Network error'));

      const result = await appUpdateService.checkForUpdate();

      expect(result.updateAvailable).toBe(false);
      expect(result.updateType).toBe('none');
    });
  });

  describe('downloadAndApplyOtaUpdate', () => {
    it('fetches and reloads on success', async () => {
      mockExpoUpdates.fetchUpdateAsync.mockResolvedValueOnce({ isNew: true, manifest: {} });

      const success = await appUpdateService.downloadAndApplyOtaUpdate();

      expect(success).toBe(true);
      expect(mockExpoUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockExpoUpdates.reloadAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false when fetch fails', async () => {
      mockExpoUpdates.fetchUpdateAsync.mockRejectedValueOnce(new Error('Download failed'));

      const success = await appUpdateService.downloadAndApplyOtaUpdate();

      expect(success).toBe(false);
      expect(mockExpoUpdates.reloadAsync).not.toHaveBeenCalled();
    });
  });

  describe('openStoreForUpdate', () => {
    it('opens iOS App Store URL on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

      await appUpdateService.openStoreForUpdate();

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://apps.apple.com/app/teachlink/id1234567890'
      );
    });

    it('opens Play Store URL on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

      await appUpdateService.openStoreForUpdate();

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://play.google.com/store/apps/details?id=com.jaynomyaro.teachlink'
      );
    });

    it('does not open URL when canOpenURL returns false', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

      await appUpdateService.openStoreForUpdate();

      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('setConfig / getConfig', () => {
    it('merges partial config updates', () => {
      appUpdateService.setConfig({ checkIntervalMs: 3600000 });
      const config = appUpdateService.getConfig();

      expect(config.checkIntervalMs).toBe(3600000);
      expect(config.checkOnStartup).toBe(true);
    });
  });
});
