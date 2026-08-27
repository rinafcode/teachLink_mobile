import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';

import { SettingRow } from './SettingRow';
import { ICON_REFRESH } from './settingsIcons';
import { SettingsSection } from './SettingsSection';

/**
 * Memoised Sync section — manual sync trigger.
 */
export const SyncSection = memo(function SyncSection() {
  const handleManualSync = useCallback(() => {
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

  return (
    <SettingsSection title="Sync">
      <SettingRow
        icon={ICON_REFRESH}
        label="Manual Sync"
        onPress={handleManualSync}
        accessibilityLabel="Manual Sync"
      />
    </SettingsSection>
  );
});
