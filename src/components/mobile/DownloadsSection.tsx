import React, { memo, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { NativeToggle } from './NativeToggle';
import { SettingRow } from './SettingRow';
import { SettingsPicker } from './SettingsPicker';
import { ICON_WIFI, ICON_DOWNLOAD, ICON_TRASH_RED } from './settingsIcons';
import { QUALITY_OPTIONS } from './settingsOptions';
import { SettingsSection } from './SettingsSection';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * Memoised Downloads section — WiFi-only toggle, download quality picker,
 * and clear downloads action.
 */
export const DownloadsSection = memo(function DownloadsSection() {
  const {
    downloadOverWifiOnly,
    setDownloadOverWifiOnly,
    downloadQuality,
    setDownloadQuality,
  } = useSettingsStore();

  const handleClearDownloads = useCallback(() => {
    Alert.alert('Clear Downloads', 'Remove all downloads?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive' },
    ]);
  }, []);

  const wifiOnlyRight = useMemo(
    () => <NativeToggle value={downloadOverWifiOnly} onValueChange={setDownloadOverWifiOnly} />,
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
    <SettingsSection title="Downloads">
      <SettingRow
        icon={ICON_WIFI}
        label="WiFi Only"
        right={wifiOnlyRight}
        accessibilityLabel={`WiFi Only: ${downloadOverWifiOnly ? 'enabled' : 'disabled'}`}
      />

      <SettingRow
        icon={ICON_DOWNLOAD}
        label="Quality"
        right={qualityRight}
        accessibilityLabel={`Download Quality: ${downloadQuality}`}
      />

      <SettingRow
        icon={ICON_TRASH_RED}
        label="Clear Downloads"
        onPress={handleClearDownloads}
        destructive
        accessibilityLabel="Clear Downloads"
      />
    </SettingsSection>
  );
});
