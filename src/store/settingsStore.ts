import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProfileVisibility = 'public' | 'private' | 'friends_only';
export type DownloadQuality = 'low' | 'medium' | 'high';
export type StorageLimit = '1GB' | '2GB' | '5GB' | 'unlimited';
export type AppLanguage = 'english' | 'spanish' | 'french' | 'german';
export type FontSize = 'small' | 'medium' | 'large';

interface SettingsState {
  // Account
  profileVisibility: ProfileVisibility;
  twoFactorEnabled: boolean;

  // Privacy
  dataSharing: boolean;
  analyticsEnabled: boolean;
  locationServices: boolean;

  // Downloads
  downloadOverWifiOnly: boolean;
  autoDownload: boolean;
  downloadQuality: DownloadQuality;
  storageLimit: StorageLimit;

  // App Preferences
  language: AppLanguage;
  fontSize: FontSize;
  autoplay: boolean;
  hapticFeedback: boolean;

  // Actions — Account
  setProfileVisibility: (v: ProfileVisibility) => void;
  setTwoFactorEnabled: (v: boolean) => void;

  // Actions — Privacy
  setDataSharing: (v: boolean) => void;
  setAnalyticsEnabled: (v: boolean) => void;
  setLocationServices: (v: boolean) => void;

  // Actions — Downloads
  setDownloadOverWifiOnly: (v: boolean) => void;
  setAutoDownload: (v: boolean) => void;
  setDownloadQuality: (v: DownloadQuality) => void;
  setStorageLimit: (v: StorageLimit) => void;

  // Actions — App Preferences
  setLanguage: (v: AppLanguage) => void;
  setFontSize: (v: FontSize) => void;
  setAutoplay: (v: boolean) => void;
  setHapticFeedback: (v: boolean) => void;

  // Misc
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Omit<SettingsState, keyof Omit<SettingsState, ProfileVisibility | DownloadQuality | StorageLimit | AppLanguage | FontSize | boolean>> = {
  profileVisibility: 'public' as ProfileVisibility,
  twoFactorEnabled: false,
  dataSharing: true,
  analyticsEnabled: true,
  locationServices: false,
  downloadOverWifiOnly: true,
  autoDownload: false,
  downloadQuality: 'medium' as DownloadQuality,
  storageLimit: '2GB' as StorageLimit,
  language: 'english' as AppLanguage,
  fontSize: 'medium' as FontSize,
  autoplay: true,
  hapticFeedback: true,
};

const INITIAL_STATE = {
  profileVisibility: 'public' as ProfileVisibility,
  twoFactorEnabled: false,
  dataSharing: true,
  analyticsEnabled: true,
  locationServices: false,
  downloadOverWifiOnly: true,
  autoDownload: false,
  downloadQuality: 'medium' as DownloadQuality,
  storageLimit: '2GB' as StorageLimit,
  language: 'english' as AppLanguage,
  fontSize: 'medium' as FontSize,
  autoplay: true,
  hapticFeedback: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // Account
      setProfileVisibility: (v) => set({ profileVisibility: v }),
      setTwoFactorEnabled: (v) => set({ twoFactorEnabled: v }),

      // Privacy
      setDataSharing: (v) => set({ dataSharing: v }),
      setAnalyticsEnabled: (v) => set({ analyticsEnabled: v }),
      setLocationServices: (v) => set({ locationServices: v }),

      // Downloads
      setDownloadOverWifiOnly: (v) => set({ downloadOverWifiOnly: v }),
      setAutoDownload: (v) => set({ autoDownload: v }),
      setDownloadQuality: (v) => set({ downloadQuality: v }),
      setStorageLimit: (v) => set({ storageLimit: v }),

      // App Preferences
      setLanguage: (v) => set({ language: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setAutoplay: (v) => set({ autoplay: v }),
      setHapticFeedback: (v) => set({ hapticFeedback: v }),

      resetSettings: () => set(INITIAL_STATE),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
