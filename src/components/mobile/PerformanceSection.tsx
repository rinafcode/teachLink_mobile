import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { SettingRow } from './SettingRow';
import { ICON_ZAP, ICON_SHIELD } from './settingsIcons';
import { SettingsSection } from './SettingsSection';
import { useRequireReauth } from '../../hooks';

/**
 * Memoised Performance & Utilities section — clipboard optimizer and admin dashboard.
 * Owns the router and reauth hooks it needs.
 */
export const PerformanceSection = memo(function PerformanceSection() {
  const router = useRouter();
  const { performReauthCheck } = useRequireReauth();

  const handleAdminDashboard = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      router.push('/health-dashboard');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to access Admin Dashboard.');
    }
  }, [performReauthCheck, router]);

  return (
    <SettingsSection title="Performance & Utilities">
      <SettingRow
        icon={ICON_ZAP}
        label="Clipboard Optimizer"
        description="Test & profile asynchronous clipboard operations"
        accessibilityLabel="Clipboard Optimizer"
      />

      <SettingRow
        icon={ICON_SHIELD}
        label="Admin Dashboard"
        description="Access systems health & performance diagnostics"
        onPress={handleAdminDashboard}
        accessibilityLabel="Admin Dashboard"
      />
    </SettingsSection>
  );
});
