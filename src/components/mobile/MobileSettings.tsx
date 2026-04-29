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
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../store';
import { useNotificationStore } from '../../store/notificationStore';
import { useSettingsStore } from '../../store/settingsStore';
import { NativeToggle } from './NativeToggle';
import { PickerOption, SettingsPicker } from './SettingsPicker';
import { SettingsSection } from './SettingsSection';

import { AppText } from '../common/AppText';
import { useDynamicFontSize } from '../../hooks';

// ─── Shared row ────────────────────────────────────────────────────────────────

/**
 * Props for the SettingRow component
 */
interface SettingRowProps {
  /** Icon to display on the left side of the row */
  icon: React.ReactNode;
  /** Background color class for the icon container */
  iconBg?: string;
  /** Primary label text for the setting */
  label: string;
  /** Optional secondary description text */
  description?: string;
  /** Optional component to render on the right side (e.g., toggle, picker) */
  right?: React.ReactNode;
  /** Callback when the row is pressed */
  onPress?: () => void;
  /** Whether this is a destructive action (affects styling) */
  /** Icon to display for the setting */
  icon: React.ReactNode;
  /** Background color class for the icon container */
  iconBg?: string;
  /** Label text for the setting */
  label: string;
  /** Optional description text */
  description?: string;
  /** Optional right-side component */
  right?: React.ReactNode;
  /** Optional callback when the row is pressed */
  onPress?: () => void;
  /** Whether the action is destructive (e.g., sign out, delete) */
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
          style={{ fontSize: 15 }}
          className={`font-medium ${
            destructive ? 'text-red-500' : 'text-gray-900 dark:text-white'
          }`}
        >
          {label}
        </AppText>
        {description ? (
          <AppText style={{ fontSize: 12 }} className="mt-0.5 text-gray-500 dark:text-gray-400">
            {description}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={scale(16)} color="#9CA3AF" /> : null)}
    </Row>
  );
}

// ─── Picker option sets ─────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: PickerOption[] = [
  { label: 'Public', value: 'public', description: 'Anyone can view your profile' },
  { label: 'Friends Only', value: 'friends_only', description: 'Only your connections' },
  { label: 'Private', value: 'private', description: 'Only you can view your profile' },
];

const THEME_OPTIONS: PickerOption[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const QUALITY_OPTIONS: PickerOption[] = [
  { label: 'Low', value: 'low', description: 'Saves the most storage space' },
  { label: 'Medium', value: 'medium', description: 'Balanced quality and size' },
  { label: 'High', value: 'high', description: 'Best quality, largest files' },
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
  { label: 'German', value: 'german' },
];

const FONT_SIZE_OPTIONS: PickerOption[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

// ─── Main component ─────────────────────────────────────────────────────────────

/**
 * Props for the MobileSettings component
 */
interface MobileSettingsProps {
  /** Called when the user taps the sign-out row */
  onSignOut?: () => void;
  /** Called when the user taps "Change Password" */
  onChangePassword?: () => void;
  /** Called when the user taps "Linked Accounts" */
  onLinkedAccounts?: () => void;
}

export function MobileSettings({
  onSignOut,
  onChangePassword,
  onLinkedAccounts,
}: MobileSettingsProps) {
  const { theme, setTheme } = useAppStore();

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

  const { preferences, setPreference } = useNotificationStore();

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear Downloads',
      'All downloaded content will be removed from your device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: implement actual file clearing via download service
            Alert.alert('Done', 'All downloads have been cleared.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: onSignOut,
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      contentContainerStyle={{ paddingTop: scale(20), paddingBottom: scale(40) }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Account ─────────────────────────────────────────── */}
      <SettingsSection
        title="Account"
        footer="Your profile visibility controls who can discover you on TeachLink."
      >
        <SettingRow
          iconBg="bg-indigo-100 dark:bg-indigo-900/50"
          icon={<Eye size={18} color="#6366f1" />}
          label="Profile Visibility"
          right={
            <SettingsPicker
              label="Profile Visibility"
              value={profileVisibility}
              options={VISIBILITY_OPTIONS}
              onValueChange={v => setProfileVisibility(v as any)}
            />
          }
        />
        <SettingRow
          iconBg="bg-emerald-100 dark:bg-emerald-900/50"
          icon={<Lock size={18} color="#10b981" />}
          label="Two-Factor Authentication"
          description={twoFactorEnabled ? 'Enabled' : 'Disabled'}
          right={<NativeToggle value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} />}
        />
        <SettingRow
          iconBg="bg-blue-100 dark:bg-blue-900/50"
          icon={<User size={scale(18)} color="#3b82f6" />}
          label="Change Password"
          onPress={onChangePassword}
        />
        <SettingRow
          iconBg="bg-purple-100 dark:bg-purple-900/50"
          icon={<Shield size={scale(18)} color="#8b5cf6" />}
          label="Linked Accounts"
          onPress={onLinkedAccounts}
        />
      </SettingsSection>

      {/* ── Notification Preferences ─────────────────────────── */}
      <SettingsSection
        title="Notifications"
        footer="Manage which activities send you push notifications."
      >
        <SettingRow
          iconBg="bg-amber-100 dark:bg-amber-900/50"
          icon={<Bell size={18} color="#f59e0b" />}
          label="Course Updates"
          description="New lessons and announcements"
          right={
            <NativeToggle
              value={preferences.courseUpdates}
              onValueChange={v => setPreference('courseUpdates', v)}
            />
          }
        />
        <SettingRow
          iconBg="bg-cyan-100 dark:bg-cyan-900/50"
          icon={<Bell size={18} color="#06b6d4" />}
          label="Messages"
          description="Direct messages and chat"
          right={
            <NativeToggle
              value={preferences.messages}
              onValueChange={v => setPreference('messages', v)}
            />
          }
        />
        <SettingRow
          iconBg="bg-orange-100 dark:bg-orange-900/50"
          icon={<Bell size={18} color="#f97316" />}
          label="Learning Reminders"
          description="Daily streak reminders"
          right={
            <NativeToggle
              value={preferences.learningReminders}
              onValueChange={v => setPreference('learningReminders', v)}
            />
          }
        />
        <SettingRow
          iconBg="bg-yellow-100 dark:bg-yellow-900/50"
          icon={<Bell size={18} color="#eab308" />}
          label="Achievement Unlocks"
          description="Celebrate your milestones"
          right={
            <NativeToggle
              value={preferences.achievementUnlocks}
              onValueChange={v => setPreference('achievementUnlocks', v)}
            />
          }
        />
        <SettingRow
          iconBg="bg-pink-100 dark:bg-pink-900/50"
          icon={<Bell size={18} color="#ec4899" />}
          label="Community Activity"
          description="Posts, comments, and updates"
          right={
            <NativeToggle
              value={preferences.communityActivity}
              onValueChange={v => setPreference('communityActivity', v)}
            />
          }
        />
      </SettingsSection>

      {/* ── Privacy ──────────────────────────────────────────── */}
      <SettingsSection
        title="Privacy"
        footer="Data sharing and analytics help us improve TeachLink. You can opt out at any time."
      >
        <SettingRow
          iconBg="bg-teal-100 dark:bg-teal-900/50"
          icon={<BarChart2 size={18} color="#14b8a6" />}
          label="Data Sharing"
          description="Share anonymised usage data"
          right={<NativeToggle value={dataSharing} onValueChange={setDataSharing} />}
        />
        <SettingRow
          iconBg="bg-violet-100 dark:bg-violet-900/50"
          icon={<BarChart2 size={18} color="#7c3aed" />}
          label="Analytics"
          description="Help improve app performance"
          right={<NativeToggle value={analyticsEnabled} onValueChange={setAnalyticsEnabled} />}
        />
        <SettingRow
          iconBg="bg-rose-100 dark:bg-rose-900/50"
          icon={<MapPin size={18} color="#f43f5e" />}
          label="Location Services"
          description="Used for regional content recommendations"
          right={<NativeToggle value={locationServices} onValueChange={setLocationServices} />}
        />
      </SettingsSection>

      {/* ── Downloads ────────────────────────────────────────── */}
      <SettingsSection
        title="Downloads"
        footer="Downloaded content is stored locally for offline access."
      >
        <SettingRow
          iconBg="bg-sky-100 dark:bg-sky-900/50"
          icon={<Wifi size={18} color="#0ea5e9" />}
          label="Download over Wi-Fi Only"
          description="Avoid mobile data charges"
          right={
            <NativeToggle value={downloadOverWifiOnly} onValueChange={setDownloadOverWifiOnly} />
          }
        />
        <SettingRow
          iconBg="bg-green-100 dark:bg-green-900/50"
          icon={<Download size={18} color="#22c55e" />}
          label="Auto-Download"
          description="Download enrolled courses automatically"
          right={<NativeToggle value={autoDownload} onValueChange={setAutoDownload} />}
        />
        <SettingRow
          iconBg="bg-indigo-100 dark:bg-indigo-900/50"
          icon={<Download size={18} color="#6366f1" />}
          label="Download Quality"
          right={
            <SettingsPicker
              label="Download Quality"
              value={downloadQuality}
              options={QUALITY_OPTIONS}
              onValueChange={v => setDownloadQuality(v as any)}
            />
          }
        />
        <SettingRow
          iconBg="bg-slate-100 dark:bg-slate-700"
          icon={<HardDrive size={18} color="#64748b" />}
          label="Storage Limit"
          right={
            <SettingsPicker
              label="Storage Limit"
              value={storageLimit}
              options={STORAGE_OPTIONS}
              onValueChange={v => setStorageLimit(v as any)}
            />
          }
        />
        <SettingRow
          iconBg="bg-red-100 dark:bg-red-900/50"
          icon={<Trash2 size={18} color="#ef4444" />}
          label="Clear Downloads"
          description="Free up storage space"
          onPress={handleClearDownloads}
          destructive
        />
      </SettingsSection>

      {/* ── App Preferences ──────────────────────────────────── */}
      <SettingsSection title="App Preferences">
        <SettingRow
          iconBg="bg-yellow-100 dark:bg-yellow-900/50"
          icon={<Sun size={18} color="#f59e0b" />}
          label="Theme"
          right={
            <SettingsPicker
              label="Theme"
              value={theme}
              options={THEME_OPTIONS}
              onValueChange={v => setTheme(v as 'light' | 'dark')}
            />
          }
        />
        <SettingRow
          iconBg="bg-blue-100 dark:bg-blue-900/50"
          icon={<Globe size={18} color="#3b82f6" />}
          label="Language"
          right={
            <SettingsPicker
              label="Language"
              value={language}
              options={LANGUAGE_OPTIONS}
              onValueChange={v => setLanguage(v as any)}
            />
          }
        />
        <SettingRow
          iconBg="bg-purple-100 dark:bg-purple-900/50"
          icon={<Type size={18} color="#8b5cf6" />}
          label="Font Size"
          right={
            <SettingsPicker
              label="Font Size"
              value={fontSize}
              options={FONT_SIZE_OPTIONS}
              onValueChange={v => setFontSize(v as any)}
            />
          }
        />
        <SettingRow
          iconBg="bg-cyan-100 dark:bg-cyan-900/50"
          icon={<Play size={18} color="#06b6d4" />}
          label="Autoplay Videos"
          description="Start next lesson automatically"
          right={<NativeToggle value={autoplay} onValueChange={setAutoplay} />}
        />
        <SettingRow
          iconBg="bg-emerald-100 dark:bg-emerald-900/50"
          icon={<Vibrate size={18} color="#10b981" />}
          label="Haptic Feedback"
          description="Vibration on interactions"
          right={<NativeToggle value={hapticFeedback} onValueChange={setHapticFeedback} />}
        />
      </SettingsSection>

      {/* ── Sign Out ──────────────────────────────────────────── */}
      <SettingsSection title="Account Actions">
        <SettingRow
          iconBg="bg-red-100 dark:bg-red-900/50"
          icon={<LogOut size={scale(18)} color="#ef4444" />}
          label="Sign Out"
          onPress={handleSignOut}
          destructive
        />
      </SettingsSection>
    </ScrollView>
  );
}

export default MobileSettings;
