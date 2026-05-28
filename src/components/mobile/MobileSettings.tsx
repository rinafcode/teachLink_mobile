import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  BarChart2,
  Bell,
  ChevronRight,
  Download,
  Eye,
  Globe,
  HardDrive,
  Lock,
  LogOut,
  MapPin,
  Play,
  Shield,
  Sun,
  Trash2,
  Type,
  User,
  Vibrate,
  Wifi,
  RefreshCw,
  Fingerprint as FingerprintPattern,
} from 'lucide-react-native';

import { useAppStore } from '../../store';
import { useNotificationStore } from '../../store/notificationStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useDynamicFontSize } from '../../hooks';

import { NativeToggle } from './NativeToggle';
import { PickerOption, SettingsPicker } from './SettingsPicker';
import { SettingsSection } from './SettingsSection';
import { AppText } from '../common/AppText';

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

function SettingRow({
  icon,
  iconBg = 'bg-gray-100 dark:bg-gray-700',
  label,
  description,
  right,
  onPress,
  destructive = false,
}: SettingRowProps) {
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

      {right ?? (onPress ? <ChevronRight size={scale(16)} color="#9CA3AF" /> : null)}
    </Row>
  );
}

// ─────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: PickerOption[] = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends_only' },
  { label: 'Private', value: 'private' },
];

const THEME_OPTIONS: PickerOption[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const QUALITY_OPTIONS: PickerOption[] = [
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
// Component
// ─────────────────────────────────────────────────────────────

export function MobileSettings({
  onSignOut,
  onChangePassword,
  onLinkedAccounts,
}: any) {
  const { theme, setTheme } = useAppStore();
  const { preferences, setPreference } = useNotificationStore();

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

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const ok = await enableBiometric();
      if (!ok) {
        Alert.alert('Biometric Login', 'Enable failed. Check device settings.');
      }
    } else {
      await disableBiometric();
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  const handleManualSync = async () => {
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
  };

  const handleClearDownloads = () => {
    Alert.alert('Clear Downloads', 'Remove all downloads?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive' },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ACCOUNT */}
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

      {/* PRIVACY */}
      <SettingsSection title="Privacy">
        <SettingRow
          icon={<BarChart2 size={18} />}
          label="Analytics"
          right={<NativeToggle value={analyticsEnabled} onValueChange={setAnalyticsEnabled} />}
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

      {/* APP */}
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
      </SettingsSection>

      {/* SYNC */}
      <SettingsSection title="Sync">
        <SettingRow
          icon={<RefreshCw size={18} />}
          label="Manual Sync"
          onPress={handleManualSync}
        />
      </SettingsSection>

      {/* SIGN OUT */}
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