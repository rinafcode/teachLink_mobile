import React from 'react';
import { View } from 'react-native';
import { AppText } from '../common/AppText';

interface SettingsSectionProps {
  /** Section header label displayed above the card (uppercase). */
  title?: string;
  /** Optional explanatory text shown below the card. */
  footer?: string;
  children: React.ReactNode;
}

/**
 * SettingsSection renders an iOS-style grouped settings card.
 * Children are separated by thin horizontal rules automatically.
 *
 * Usage:
 * ```tsx
 * <SettingsSection title="Account" footer="Changes apply immediately.">
 *   <SettingRow ... />
 *   <SettingRow ... />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View className="mb-6">
      {title ? (
        <AppText
          style={{ fontSize: 12 }}
          className="px-4 pb-2 font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
        >
          {title}
        </AppText>
      ) : null}

      <View className="mx-4 overflow-hidden rounded-2xl bg-white dark:bg-gray-800">
        {childArray.map((child, index) => (
          <View key={index}>
            {child}
            {index < childArray.length - 1 ? (
              <View className="ml-4 h-px bg-gray-100 dark:bg-gray-700" />
            ) : null}
          </View>
        ))}
      </View>

      {footer ? (
        <AppText
          style={{ fontSize: 12, lineHeight: 16 }}
          className="px-4 pt-2 text-gray-400 dark:text-gray-500"
        >
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export default SettingsSection;
