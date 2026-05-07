import { beforeEach, describe, expect, it } from '@jest/globals';

import { useSettingsStore } from '../../src/store/settingsStore';

const INITIAL_STATE = {
  profileVisibility: 'public' as const,
  twoFactorEnabled: false,
  dataSharing: true,
  analyticsEnabled: true,
  locationServices: false,
  downloadOverWifiOnly: true,
  autoDownload: false,
  downloadQuality: 'medium' as const,
  storageLimit: '2GB' as const,
  language: 'english' as const,
  fontSize: 'medium' as const,
  autoplay: true,
  hapticFeedback: true,
};

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState(INITIAL_STATE);
  });

  // ── Account settings ──────────────────────────────────────────────────────

  describe('setProfileVisibility', () => {
    it('sets visibility to private', () => {
      useSettingsStore.getState().setProfileVisibility('private');
      expect(useSettingsStore.getState().profileVisibility).toBe('private');
    });

    it('sets visibility to friends_only', () => {
      useSettingsStore.getState().setProfileVisibility('friends_only');
      expect(useSettingsStore.getState().profileVisibility).toBe('friends_only');
    });

    it('reverts to public', () => {
      useSettingsStore.setState({ profileVisibility: 'private' });
      useSettingsStore.getState().setProfileVisibility('public');
      expect(useSettingsStore.getState().profileVisibility).toBe('public');
    });
  });

  describe('setTwoFactorEnabled', () => {
    it('enables two-factor authentication', () => {
      useSettingsStore.getState().setTwoFactorEnabled(true);
      expect(useSettingsStore.getState().twoFactorEnabled).toBe(true);
    });

    it('disables two-factor authentication', () => {
      useSettingsStore.setState({ twoFactorEnabled: true });
      useSettingsStore.getState().setTwoFactorEnabled(false);
      expect(useSettingsStore.getState().twoFactorEnabled).toBe(false);
    });
  });

  // ── Privacy settings ──────────────────────────────────────────────────────

  describe('setDataSharing', () => {
    it('disables data sharing', () => {
      useSettingsStore.getState().setDataSharing(false);
      expect(useSettingsStore.getState().dataSharing).toBe(false);
    });

    it('re-enables data sharing', () => {
      useSettingsStore.setState({ dataSharing: false });
      useSettingsStore.getState().setDataSharing(true);
      expect(useSettingsStore.getState().dataSharing).toBe(true);
    });
  });

  describe('setAnalyticsEnabled', () => {
    it('disables analytics', () => {
      useSettingsStore.getState().setAnalyticsEnabled(false);
      expect(useSettingsStore.getState().analyticsEnabled).toBe(false);
    });
  });

  describe('setLocationServices', () => {
    it('enables location services', () => {
      useSettingsStore.getState().setLocationServices(true);
      expect(useSettingsStore.getState().locationServices).toBe(true);
    });

    it('disables location services', () => {
      useSettingsStore.setState({ locationServices: true });
      useSettingsStore.getState().setLocationServices(false);
      expect(useSettingsStore.getState().locationServices).toBe(false);
    });
  });

  // ── Download settings ─────────────────────────────────────────────────────

  describe('setDownloadOverWifiOnly', () => {
    it('allows downloads over mobile data', () => {
      useSettingsStore.getState().setDownloadOverWifiOnly(false);
      expect(useSettingsStore.getState().downloadOverWifiOnly).toBe(false);
    });
  });

  describe('setAutoDownload', () => {
    it('enables auto-download', () => {
      useSettingsStore.getState().setAutoDownload(true);
      expect(useSettingsStore.getState().autoDownload).toBe(true);
    });
  });

  describe('setDownloadQuality', () => {
    it('sets quality to low', () => {
      useSettingsStore.getState().setDownloadQuality('low');
      expect(useSettingsStore.getState().downloadQuality).toBe('low');
    });

    it('sets quality to high', () => {
      useSettingsStore.getState().setDownloadQuality('high');
      expect(useSettingsStore.getState().downloadQuality).toBe('high');
    });

    it('cycles through all quality values', () => {
      const qualities = ['low', 'medium', 'high'] as const;
      for (const q of qualities) {
        useSettingsStore.getState().setDownloadQuality(q);
        expect(useSettingsStore.getState().downloadQuality).toBe(q);
      }
    });
  });

  describe('setStorageLimit', () => {
    it('updates storage limit to 5GB', () => {
      useSettingsStore.getState().setStorageLimit('5GB');
      expect(useSettingsStore.getState().storageLimit).toBe('5GB');
    });

    it('sets storage limit to unlimited', () => {
      useSettingsStore.getState().setStorageLimit('unlimited');
      expect(useSettingsStore.getState().storageLimit).toBe('unlimited');
    });
  });

  // ── App preference settings ───────────────────────────────────────────────

  describe('setLanguage', () => {
    it('changes language to spanish', () => {
      useSettingsStore.getState().setLanguage('spanish');
      expect(useSettingsStore.getState().language).toBe('spanish');
    });

    it('cycles through all supported languages', () => {
      const langs = ['english', 'spanish', 'french', 'german'] as const;
      for (const lang of langs) {
        useSettingsStore.getState().setLanguage(lang);
        expect(useSettingsStore.getState().language).toBe(lang);
      }
    });
  });

  describe('setFontSize', () => {
    it('sets font size to large', () => {
      useSettingsStore.getState().setFontSize('large');
      expect(useSettingsStore.getState().fontSize).toBe('large');
    });

    it('sets font size to small', () => {
      useSettingsStore.getState().setFontSize('small');
      expect(useSettingsStore.getState().fontSize).toBe('small');
    });
  });

  describe('setAutoplay', () => {
    it('disables autoplay', () => {
      useSettingsStore.getState().setAutoplay(false);
      expect(useSettingsStore.getState().autoplay).toBe(false);
    });
  });

  describe('setHapticFeedback', () => {
    it('disables haptic feedback', () => {
      useSettingsStore.getState().setHapticFeedback(false);
      expect(useSettingsStore.getState().hapticFeedback).toBe(false);
    });

    it('re-enables haptic feedback', () => {
      useSettingsStore.setState({ hapticFeedback: false });
      useSettingsStore.getState().setHapticFeedback(true);
      expect(useSettingsStore.getState().hapticFeedback).toBe(true);
    });
  });

  // ── resetSettings ─────────────────────────────────────────────────────────

  describe('resetSettings', () => {
    it('restores all settings to their default values', () => {
      // Mutate every field
      useSettingsStore.setState({
        profileVisibility: 'private',
        twoFactorEnabled: true,
        dataSharing: false,
        analyticsEnabled: false,
        locationServices: true,
        downloadOverWifiOnly: false,
        autoDownload: true,
        downloadQuality: 'high',
        storageLimit: 'unlimited',
        language: 'french',
        fontSize: 'large',
        autoplay: false,
        hapticFeedback: false,
      });

      useSettingsStore.getState().resetSettings();
      const state = useSettingsStore.getState();

      expect(state.profileVisibility).toBe('public');
      expect(state.twoFactorEnabled).toBe(false);
      expect(state.dataSharing).toBe(true);
      expect(state.analyticsEnabled).toBe(true);
      expect(state.locationServices).toBe(false);
      expect(state.downloadOverWifiOnly).toBe(true);
      expect(state.autoDownload).toBe(false);
      expect(state.downloadQuality).toBe('medium');
      expect(state.storageLimit).toBe('2GB');
      expect(state.language).toBe('english');
      expect(state.fontSize).toBe('medium');
      expect(state.autoplay).toBe(true);
      expect(state.hapticFeedback).toBe(true);
    });

    it('is idempotent — calling reset twice yields defaults', () => {
      useSettingsStore.getState().setLanguage('german');
      useSettingsStore.getState().resetSettings();
      useSettingsStore.getState().resetSettings();
      expect(useSettingsStore.getState().language).toBe('english');
    });
  });

  // ── Isolation: independent fields ────────────────────────────────────────

  describe('state isolation', () => {
    it('changing one setting does not affect unrelated settings', () => {
      useSettingsStore.getState().setLanguage('french');
      const state = useSettingsStore.getState();
      // Other fields stay at defaults
      expect(state.fontSize).toBe('medium');
      expect(state.downloadQuality).toBe('medium');
      expect(state.hapticFeedback).toBe(true);
    });
  });
});
