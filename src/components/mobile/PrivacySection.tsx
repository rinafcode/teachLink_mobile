import React, { memo, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { NativeToggle } from './NativeToggle';
import { SettingRow } from './SettingRow';
import { ICON_BAR_CHART, ICON_TRASH_RED, ICON_DOWNLOAD_INDIGO } from './settingsIcons';
import { SettingsSection } from './SettingsSection';
import { useRequireReauth } from '../../hooks';
import { useFormCache } from '../../hooks/useFormCache';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * Memoised Privacy section — analytics toggle, clear cached form data,
 * and export personal data. Each handler is self-contained.
 */
export const PrivacySection = memo(function PrivacySection() {
  const { analyticsEnabled, setAnalyticsEnabled } = useSettingsStore();
  const { clearCache: clearStoredFormFields } = useFormCache([]);
  const { performReauthCheck } = useRequireReauth();

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

  const handleExportData = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Export Data', 'Your personal data export request has been submitted successfully.');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to export personal data.');
    }
  }, [performReauthCheck]);

  const analyticsRight = useMemo(
    () => <NativeToggle value={analyticsEnabled} onValueChange={setAnalyticsEnabled} />,
    [analyticsEnabled, setAnalyticsEnabled]
  );

  return (
    <SettingsSection title="Privacy">
      <SettingRow
        icon={ICON_BAR_CHART}
        label="Analytics"
        right={analyticsRight}
        accessibilityLabel={`Analytics: ${analyticsEnabled ? 'enabled' : 'disabled'}`}
      />

      <SettingRow
        icon={ICON_TRASH_RED}
        label="Clear Cached Form Data"
        description="Remove saved autofill values from this device"
        onPress={handleClearFormCache}
        destructive
        accessibilityLabel="Clear Cached Form Data"
      />

      <SettingRow
        icon={ICON_DOWNLOAD_INDIGO}
        label="Export Personal Data"
        description="Export your account details and learning progress"
        onPress={handleExportData}
        accessibilityLabel="Export Personal Data"
      />
    </SettingsSection>
  );
});
