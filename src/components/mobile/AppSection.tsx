import React, { memo, useMemo } from 'react';

import { NativeToggle } from './NativeToggle';
import { SettingRow } from './SettingRow';
import { SettingsPicker } from './SettingsPicker';
import { ICON_SUN, ICON_DATABASE } from './settingsIcons';
import { THEME_OPTIONS } from './settingsOptions';
import { SettingsSection } from './SettingsSection';
import { useAppStore, useTheme } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * Memoised App section — theme picker and data saver toggle.
 * Owns the useTheme / setTheme hooks directly.
 */
export const AppSection = memo(function AppSection() {
  const theme = useTheme();
  const setTheme = useAppStore(state => state.setTheme);
  const { dataSaverEnabled, setDataSaverEnabled } = useSettingsStore();

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
    () => <NativeToggle value={dataSaverEnabled} onValueChange={setDataSaverEnabled} />,
    [dataSaverEnabled, setDataSaverEnabled]
  );

  return (
    <SettingsSection title="App">
      <SettingRow
        icon={ICON_SUN}
        label="Theme"
        right={themeRight}
        accessibilityLabel={`Theme: ${theme}`}
      />

      <SettingRow
        icon={ICON_DATABASE}
        label="Data Saver"
        description="Reduces bandwidth by disabling prefetch and lowering image quality"
        right={dataSaverRight}
        accessibilityLabel={`Data Saver: ${dataSaverEnabled ? 'enabled' : 'disabled'}`}
      />
    </SettingsSection>
  );
});
