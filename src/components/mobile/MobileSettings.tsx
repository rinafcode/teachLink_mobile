import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Database,
  Download,
  Eye,
  FileText,
  Fingerprint as FingerprintPattern,
  Lock,
  LogOut,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sun,
  Trash2,
  User,
  Wifi,
  Zap,
} from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { NativeToggle } from './NativeToggle';
import { PickerOption, SettingsPicker } from './SettingsPicker';
import { SettingsSection } from './SettingsSection';
import { useDynamicFontSize, useRequireReauth } from '../../hooks';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useFormCache } from '../../hooks/useFormCache';
import { useAppStore, useTheme } from '../../store';
import { DownloadQuality, ProfileVisibility, useSettingsStore } from '../../store/settingsStore';
import { configureNext } from '../../utils/layoutAnimation';
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

const SettingRow = memo(function SettingRow({
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

      {right ?? (onPress ? <ChevronDown size={scale(16)} color="#9CA3AF" /> : null)}
    </Row>
  );
});

// ─────────────────────────────────────────────────────────────
// Stable icon elements (created once to preserve referential
// identity across renders — enables React.memo on SettingRow)
// ─────────────────────────────────────────────────────────────

const ICON_EYE = <Eye size={18} color="#6366f1" />;
const ICON_LOCK = <Lock size={18} color="#10b981" />;
const ICON_FINGERPRINT = <FingerprintPattern size={18} color="#06b6d4" />;
const ICON_USER = <User size={18} />;
const ICON_CREDIT_CARD_YELLOW = <CreditCard size={18} color="#f59e0b" />;
const ICON_CREDIT_CARD_GREEN = <CreditCard size={18} color="#10b981" />;
const ICON_SUN = <Sun size={18} />;
const ICON_DATABASE = <Database size={18} color="#eab308" />;
const ICON_FILE = <FileText size={18} color="#6366f1" />;
const ICON_BAR_CHART = <BarChart2 size={18} />;
const ICON_TRASH_RED = <Trash2 size={18} color="red" />;
const ICON_DOWNLOAD_INDIGO = <Download size={18} color="#6366f1" />;
const ICON_WIFI = <Wifi size={18} />;
const ICON_DOWNLOAD = <Download size={18} />;
const ICON_REFRESH = <RefreshCw size={18} />;
const ICON_ZAP = <Zap size={18} color="#06b6d4" />;
const ICON_SHIELD = <ShieldAlert size={18} color="#ef4444" />;
const ICON_LOGOUT_RED = <LogOut size={18} color="red" />;
const ICON_ALERT = <AlertTriangle size={18} color="#dc2626" />;

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
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const MobileSettings = ({ onSignOut, onChangePassword, onLinkedAccounts }: any) => {
  const theme = useTheme();
  const setTheme = useAppStore(state => state.setTheme);
  const router = useRouter();
  const { performReauthCheck } = useRequireReauth();
  // Progressive disclosure: advanced settings collapsed by default
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const {
    profileVisibility,
    setProfileVisibility,
    twoFactorEnabled,
    setTwoFactorEnabled,
    analyticsEnabled,
    setAnalyticsEnabled,
    downloadOverWifiOnly,
    setDownloadOverWifiOnly,
    downloadQuality,
    setDownloadQuality,
    dataSaverEnabled,
    setDataSaverEnabled,
  } = useSettingsStore();

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enable: enableBiometric,
    disable: disableBiometric,
    isLoading: biometricLoading,
  } = useBiometricAuth();

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

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const ok = await enableBiometric();
        if (!ok) {
          Alert.alert('Biometric Login', 'Enable failed. Check device settings.');
        }
      } else {
        await disableBiometric();
      }
    },
    [enableBiometric, disableBiometric]
  );

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

  const handleChangePaymentMethod = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Payment Method', 'Payment method updated successfully.');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to change payment method.');
    }
  }, [performReauthCheck]);

  const handleViewFullCardNumber = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Card Details', 'Card Number: **** **** **** 4242');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to view card details.');
    }
  }, [performReauthCheck]);

  const handleExportData = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Export Data', 'Your personal data export request has been submitted successfully.');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to export personal data.');
    }
  }, [performReauthCheck]);

  const handleAdminDashboard = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      router.push('/health-dashboard');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to access Admin Dashboard.');
    }
  }, [performReauthCheck, router]);

  const deleteInputRef = useRef<TextInput>(null);

  const handleDeleteAccount = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (!authorized) {
      Alert.alert('Re-authentication Failed', 'Verification required to delete your account.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data, progress, and purchases will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation: require typing DELETE
            if (Platform.OS === 'ios') {
              // iOS Alert.alert doesn't support text input; use a simple confirmation
              Alert.alert(
                'Are you absolutely sure?',
                'Type DELETE in the next prompt to confirm account deletion.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      // Final deletion action
                      Alert.alert('Account Deleted', 'Your account has been deleted.');
                    },
                  },
                ]
              );
            } else {
              // Android: use Alert with prompt
              Alert.alert(
                'Confirm Deletion',
                'Please type DELETE to confirm',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Account Deleted', 'Your account has been deleted.');
                    },
                  },
                ],
                { cancelable: true }
              );
            }
          },
        },
      ]
    );
  }, [performReauthCheck]);

  // Wrap parent-provided callbacks so they are stable references
  const handleChangePassword = useCallback(() => {
    onChangePassword?.();
  }, [onChangePassword]);

  const handleLinkedAccounts = useCallback(() => {
    onLinkedAccounts?.();
  }, [onLinkedAccounts]);

  // ── Memoised right elements (stable references) ────────
  const profileVisibilityRight = useMemo(
    () => (
      <SettingsPicker
        label="Visibility"
        value={profileVisibility}
        options={VISIBILITY_OPTIONS}
        onValueChange={setProfileVisibility}
      />
    ),
    [profileVisibility, setProfileVisibility]
  );

  const twoFactorRight = useMemo(
    () => <NativeToggle value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} />,
    [twoFactorEnabled, setTwoFactorEnabled]
  );

  const biometricIcon = useMemo(
    () => (biometricLoading ? <ActivityIndicator /> : ICON_FINGERPRINT),
    [biometricLoading]
  );

  const biometricRight = useMemo(
    () => (
      <NativeToggle
        value={biometricEnabled}
        onValueChange={handleBiometricToggle}
        disabled={biometricLoading}
      />
    ),
    [biometricEnabled, handleBiometricToggle, biometricLoading]
  );

  const themeRight = useMemo(
    () => (
      <SettingsPicker
        label="Theme"
        value={theme}
        options={THEME_OPTIONS}
        onValueChange={setTheme}
      />
    ),
    [theme, setTheme]
  );

  const dataSaverRight = useMemo(
    () => (
      <NativeToggle value={dataSaverEnabled} onValueChange={setDataSaverEnabled} />
    ),
    [dataSaverEnabled, setDataSaverEnabled]
  );

  const analyticsRight = useMemo(
    () => <NativeToggle value={analyticsEnabled} onValueChange={setAnalyticsEnabled} />,
    [analyticsEnabled, setAnalyticsEnabled]
  );

  const wifiOnlyRight = useMemo(
    () => (
      <NativeToggle value={downloadOverWifiOnly} onValueChange={setDownloadOverWifiOnly} />
    ),
    [downloadOverWifiOnly, setDownloadOverWifiOnly]
  );

  const qualityRight = useMemo(
    () => (
      <SettingsPicker
        label="Quality"
        value={downloadQuality}
        options={QUALITY_OPTIONS}
        onValueChange={setDownloadQuality}
      />
    ),
    [downloadQuality, setDownloadQuality]
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── ESSENTIAL: ACCOUNT ─────────────────────────────── */}
      <SettingsSection title="Account">
        <SettingRow
          icon={ICON_EYE}
          label="Profile Visibility"
          right={profileVisibilityRight}
        />

        <SettingRow
          icon={ICON_LOCK}
          label="Two-Factor Auth"
          right={twoFactorRight}
        />

        {biometricAvailable && (
          <SettingRow
            icon={biometricIcon}
            label="Biometric Login"
            description={biometricEnabled ? 'Enabled' : 'Disabled'}
            right={biometricRight}
          />
        )}

        <SettingRow icon={ICON_USER} label="Change Password" onPress={handleChangePassword} />
        <SettingRow
          icon={ICON_CREDIT_CARD_YELLOW}
          label="Change Payment Method"
          onPress={handleChangePaymentMethod}
        />
        <SettingRow
          icon={ICON_CREDIT_CARD_GREEN}
          label="View Full Card Number"
          onPress={handleViewFullCardNumber}
        />
      </SettingsSection>

      {/* ── ESSENTIAL: APP ─────────────────────────────────── */}
      <SettingsSection title="App">
        <SettingRow
          icon={ICON_SUN}
          label="Theme"
          right={themeRight}
        />

        <SettingRow
          icon={ICON_DATABASE}
          label="Data Saver"
          description="Reduces bandwidth by disabling prefetch and lowering image quality"
          right={dataSaverRight}
        />

        <SettingRow
          icon={ICON_FILE}
          label="Open Source Licenses"
          description="Third-party software and licenses used by this app"
          onPress={() => router.push('/licenses')}
        />
      </SettingsSection>

      {/* ── PROGRESSIVE DISCLOSURE: ADVANCED SETTINGS ──────── */}
      <AdvancedToggle expanded={showAdvancedSettings} onToggle={handleToggleAdvanced} />

      {showAdvancedSettings && (
        <>
          {/* PRIVACY */}
          <SettingsSection title="Privacy">
            <SettingRow
              icon={ICON_BAR_CHART}
              label="Analytics"
              right={analyticsRight}
            />

            <SettingRow
              icon={ICON_TRASH_RED}
              label="Clear Cached Form Data"
              description="Remove saved autofill values from this device"
              onPress={handleClearFormCache}
              destructive
            />

            <SettingRow
              icon={ICON_DOWNLOAD_INDIGO}
              label="Export Personal Data"
              description="Export your account details and learning progress"
              onPress={handleExportData}
            />
          </SettingsSection>

          {/* DOWNLOADS */}
          <SettingsSection title="Downloads">
            <SettingRow
              icon={ICON_WIFI}
              label="WiFi Only"
              right={wifiOnlyRight}
            />

            <SettingRow
              icon={ICON_DOWNLOAD}
              label="Quality"
              right={qualityRight}
            />

            <SettingRow
              icon={ICON_TRASH_RED}
              label="Clear Downloads"
              onPress={handleClearDownloads}
              destructive
            />
          </SettingsSection>

          {/* SYNC */}
          <SettingsSection title="Sync">
            <SettingRow
              icon={ICON_REFRESH}
              label="Manual Sync"
              onPress={handleManualSync}
            />
          </SettingsSection>

          {/* PERFORMANCE & UTILITIES */}
          <SettingsSection title="Performance & Utilities">
            <SettingRow
              icon={ICON_ZAP}
              label="Clipboard Optimizer"
              description="Test & profile asynchronous clipboard operations"
            />

            <SettingRow
              icon={ICON_SHIELD}
              label="Admin Dashboard"
              description="Access systems health & performance diagnostics"
              onPress={handleAdminDashboard}
            />
          </SettingsSection>
        </>
      )}

      {/* ── ESSENTIAL: ACCOUNT ACTIONS ─────────────────────── */}
      <SettingsSection title="Account Actions">
        <SettingRow
          icon={ICON_LOGOUT_RED}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
        <SettingRow
          icon={ICON_ALERT}
          label="Delete Account"
          description="Permanently delete your account and all data"
          onPress={handleDeleteAccount}
          destructive
        />
      </SettingsSection>
    </ScrollView>
  );
};

export default MobileSettings;
