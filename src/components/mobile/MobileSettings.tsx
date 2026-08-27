import React, { useCallback, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { AccountActionsSection } from './AccountActionsSection';
import { AccountSection } from './AccountSection';
import { AppSection } from './AppSection';
import { DownloadsSection } from './DownloadsSection';
import { ICON_SETTINGS2 } from './settingsIcons';
import { PerformanceSection } from './PerformanceSection';
import { PrivacySection } from './PrivacySection';
import { SyncSection } from './SyncSection';
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
        {ICON_SETTINGS2}
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
// Component — each <SettingsSection> is now a separate memoised
// component that owns its own hooks, so toggling one section
// re-renders only that section.
// ─────────────────────────────────────────────────────────────

export const MobileSettings = ({ onSignOut, onChangePassword, onLinkedAccounts }: any) => {
  // Progressive disclosure: advanced settings collapsed by default
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const handleToggleAdvanced = useCallback(() => {
    configureNext();
    setShowAdvancedSettings(prev => !prev);
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── ESSENTIAL: ACCOUNT ─────────────────────────────── */}
      <AccountSection onChangePassword={onChangePassword} />

      {/* ── ESSENTIAL: APP ─────────────────────────────────── */}
      <AppSection />
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
          <PrivacySection />
          <DownloadsSection />
          <SyncSection />
          <PerformanceSection />
        </>
      )}

      {/* ── ESSENTIAL: ACCOUNT ACTIONS ─────────────────────── */}
      <AccountActionsSection onSignOut={onSignOut} />
    </ScrollView>
  );
};

export default MobileSettings;
