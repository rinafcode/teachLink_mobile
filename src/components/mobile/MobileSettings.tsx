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
import { configureNext } from '../../utils/layoutAnimation';
import { AppText } from '../common/AppText';

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
