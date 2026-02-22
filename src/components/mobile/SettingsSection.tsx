import React from 'react';
import { View, Text } from 'react-native';

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
        <Text className="px-4 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {title}
        </Text>
      ) : null}

      <View className="bg-white dark:bg-gray-800 mx-4 rounded-2xl overflow-hidden">
        {childArray.map((child, index) => (
          <View key={index}>
            {child}
            {index < childArray.length - 1 ? (
              <View className="h-px bg-gray-100 dark:bg-gray-700 ml-4" />
            ) : null}
          </View>
        ))}
      </View>

      {footer ? (
        <Text className="px-4 pt-2 text-xs text-gray-400 dark:text-gray-500 leading-4">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export default SettingsSection;
