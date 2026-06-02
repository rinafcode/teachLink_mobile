import {
    BarChart2,
    ChevronDown,
    ChevronUp,
    Database,
    Download,
    Eye,
    Fingerprint as FingerprintPattern,
    Lock,
    LogOut,
    RefreshCw,
    Settings2,
    Sun,
    Trash2,
    User,
    Wifi,
    Zap,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';

import { useDynamicFontSize } from '../../hooks';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useFormCache } from '../../hooks/useFormCache';
import { useAppStore, useTheme } from '../../store';
import { useNotificationStore } from '../../store/notificationStore';
import { DownloadQuality, ProfileVisibility, useSettingsStore } from '../../store/settingsStore';
import { configureNext } from '../../utils/layoutAnimation';

import { AppText } from '../common/AppText';
import { NativeToggle } from './NativeToggle';
import { PickerOption, SettingsPicker } from './SettingsPicker';
import { SettingsSection } from './SettingsSection';

// ─────────────────────────────────────────────────────────────
// Shared Row
// ─────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

const SettingRow = ({
  icon,
  iconBg = 'bg-gray-100 dark:bg-gray-700',
  label,
  description,
  right,
  onPress,
  destructive = false,
}: SettingRowProps) => {
  const Row = onPress ? TouchableOpacity : View;
  const { scale } = useDynamicFontSize();

  return (
    <Row activeOpacity={0.7} onPress={onPress} className="flex-row items-center px-4 py-3.5">
      <View className={`mr-3 h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </View>

      <View className="flex-1">
        <AppText
          className={`font-medium ${
            destructive ? 'text-red-500' : 'text-gray-900 dark:text-white'
          }`}
        >
          {label}
        </AppText>

        {description && (
          <AppText className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </AppText>
        )}
      </View>

      {right ?? (onPress ? <ChevronDown size={scale(16)} color="#9CA3AF" /> : null)}
    </Row>
  );
}

// ─────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: PickerOption<ProfileVisibility>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends_only' },
  { label: 'Private', value: 'private' },
];

const THEME_OPTIONS: PickerOption<'light' | 'dark'>[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const QUALITY_OPTIONS: PickerOption<DownloadQuality>[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const STORAGE_OPTIONS: PickerOption[] = [
  { label: '1 GB', value: '1GB' },
  { label: '2 GB', value: '2GB' },
  { label: '5 GB', value: '5GB' },
  { label: 'Unlimited', value: 'unlimited' },
];

const LANGUAGE_OPTIONS: PickerOption[] = [
  { label: 'English', value: 'english' },
  { label: 'Spanish', value: 'spanish' },
  { label: 'French', value: 'french' },
];

const FONT_SIZE_OPTIONS: PickerOption[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

// ─────────────────────────────────────────────────────────────
// AdvancedToggle – pill button for expanding advanced settings
// ─────────────────────────────────────────────────────────────

interface AdvancedToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

const AdvancedToggle = ({ expanded, onToggle }: AdvancedToggleProps) => {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Hide advanced settings' : 'Show advanced settings'}
      accessibilityState={{ expanded }}
      className="mx-4 my-3 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
    >
      <View className="flex-row items-center gap-2">
        <Settings2 size={16} color="#19c3e6" />
        <AppText className="text-sm font-semibold text-cyan-500">
          {expanded ? 'Hide Advanced Settings' : 'Advanced Settings'}
        </AppText>
      </View>
      {expanded ? (
        <ChevronUp size={16} color="#19c3e6" />
      ) : (
        <ChevronDown size={16} color="#19c3e6" />
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const MobileSettings = ({
  onSignOut,
  onChangePassword,
  onLinkedAccounts,
}: any) => {
  const theme = useTheme();
  const setTheme = useAppStore(state => state.setTheme);
  const { preferences, setPreference } = useNotificationStore();

  // Progressive disclosure: advanced settings collapsed by default
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const {
    profileVisibility,
    setProfileVisibility,
    twoFactorEnabled,
    setTwoFactorEnabled,
    dataSharing,
    setDataSharing,
    analyticsEnabled,
    setAnalyticsEnabled,
    locationServices,
    setLocationServices,
    downloadOverWifiOnly,
    setDownloadOverWifiOnly,
    autoDownload,
    setAutoDownload,
    downloadQuality,
    setDownloadQuality,
    storageLimit,
    setStorageLimit,
    language,
    setLanguage,
    fontSize,
    setFontSize,
    autoplay,
    setAutoplay,
    hapticFeedback,
    setHapticFeedback,
    dataSaverEnabled,
    setDataSaverEnabled,
  } = useSettingsStore();

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricType,
    enable: enableBiometric,
    disable: disableBiometric,
    isLoading: biometricLoading,
  } = useBiometricAuth();

  const { scale } = useDynamicFontSize();
  const { clearCache: clearStoredFormFields } = useFormCache([]);

  const handleClearFormCache = useCallback(() => {
    Alert.alert(
      'Clear Cached Form Data',
      'Remove saved names, emails, and addresses from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearStoredFormFields();
            Alert.alert('Cleared', 'Cached form data has been removed.');
          },
        },
      ]
    );
  }, [clearStoredFormFields]);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (value) {
      const ok = await enableBiometric();
      if (!ok) {
        Alert.alert('Biometric Login', 'Enable failed. Check device settings.');
      }
    } else {
      await disableBiometric();
    }
  }, [enableBiometric, disableBiometric]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  }, [onSignOut]);

  const handleManualSync = useCallback(async () => {
    Alert.alert('Sync', 'Sync data with server?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sync',
        onPress: async () => {
          try {
            Alert.alert('Syncing...');
            // await syncService.manualSync();
            Alert.alert('Success');
          } catch {
            Alert.alert('Failed to sync');
          }
        },
      },
    ]);
  }, []);

  const handleClearDownloads = useCallback(() => {
    Alert.alert('Clear Downloads', 'Remove all downloads?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive' },
    ]);
  }, []);

  const handleToggleAdvanced = useCallback(() => {
    configureNext();
    setShowAdvancedSettings(prev => !prev);
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── ESSENTIAL: ACCOUNT ─────────────────────────────── */}
      <SettingsSection title="Account">
        <SettingRow
          icon={<Eye size={18} color="#6366f1" />}
          label="Profile Visibility"
          right={
            <SettingsPicker
              label="Visibility"
              value={profileVisibility}
              options={VISIBILITY_OPTIONS}
              onValueChange={setProfileVisibility}
            />
          }
        />

        <SettingRow
          icon={<Lock size={18} color="#10b981" />}
          label="Two-Factor Auth"
          right={<NativeToggle value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} />}
        />

        {biometricAvailable && (
          <SettingRow
            icon={
              biometricLoading ? (
                <ActivityIndicator />
              ) : (
                <FingerprintPattern size={18} color="#06b6d4" />
              )
            }
            label="Biometric Login"
            description={biometricEnabled ? 'Enabled' : 'Disabled'}
            right={
              <NativeToggle
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={biometricLoading}
              />
            }
          />
        )}

        <SettingRow icon={<User size={18} />} label="Change Password" onPress={onChangePassword} />
      </SettingsSection>

      {/* ── ESSENTIAL: APP ─────────────────────────────────── */}
      <SettingsSection title="App">
        <SettingRow
          icon={<Sun size={18} />}
          label="Theme"
          right={
            <SettingsPicker
              label="Theme"
              value={theme}
              options={THEME_OPTIONS}
              onValueChange={setTheme}
            />
          }
        />

        <SettingRow
          icon={<Database size={18} color="#eab308" />}
          label="Data Saver"
          description="Reduces bandwidth by disabling prefetch and lowering image quality"
          right={<NativeToggle value={dataSaverEnabled} onValueChange={setDataSaverEnabled} />}
        />
      </SettingsSection>

      {/* ── PROGRESSIVE DISCLOSURE: ADVANCED SETTINGS ──────── */}
      <AdvancedToggle expanded={showAdvancedSettings} onToggle={handleToggleAdvanced} />

      {showAdvancedSettings && (
        <>
          {/* PRIVACY */}
          <SettingsSection title="Privacy">
            <SettingRow
              icon={<BarChart2 size={18} />}
              label="Analytics"
              right={<NativeToggle value={analyticsEnabled} onValueChange={setAnalyticsEnabled} />}
            />

            <SettingRow
              icon={<Trash2 size={18} color="red" />}
              label="Clear Cached Form Data"
              description="Remove saved autofill values from this device"
              onPress={handleClearFormCache}
              destructive
            />
          </SettingsSection>

          {/* DOWNLOADS */}
          <SettingsSection title="Downloads">
            <SettingRow
              icon={<Wifi size={18} />}
              label="WiFi Only"
              right={
                <NativeToggle
                  value={downloadOverWifiOnly}
                  onValueChange={setDownloadOverWifiOnly}
                />
              }
            />

            <SettingRow
              icon={<Download size={18} />}
              label="Quality"
              right={
                <SettingsPicker
                  label="Quality"
                  value={downloadQuality}
                  options={QUALITY_OPTIONS}
                  onValueChange={setDownloadQuality}
                />
              }
            />

            <SettingRow
              icon={<Trash2 size={18} color="red" />}
              label="Clear Downloads"
              onPress={handleClearDownloads}
              destructive
            />
          </SettingsSection>

          {/* SYNC */}
          <SettingsSection title="Sync">
            <SettingRow
              icon={<RefreshCw size={18} />}
              label="Manual Sync"
              onPress={handleManualSync}
            />
          </SettingsSection>

          {/* PERFORMANCE & UTILITIES */}
          <SettingsSection title="Performance & Utilities">
            <SettingRow
              icon={<Zap size={18} color="#06b6d4" />}
              label="Clipboard Optimizer"
              description="Test & profile asynchronous clipboard operations"
              onPress={() => router.push('/clipboard-demo')}
            />
          </SettingsSection>
        </>
      )}

      {/* ── ESSENTIAL: ACCOUNT ACTIONS ─────────────────────── */}
      <SettingsSection title="Account Actions">
        <SettingRow
          icon={<LogOut size={18} color="red" />}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
      </SettingsSection>
    </ScrollView>
  );
}

export default MobileSettings;
