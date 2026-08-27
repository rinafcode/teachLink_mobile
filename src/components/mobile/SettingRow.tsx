import { ChevronDown } from 'lucide-react-native';
import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useDynamicFontSize } from '../../hooks';
import { AppText } from '../common/AppText';

export interface SettingRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
}

/**
 * Memoised setting row used across all MobileSettings sections.
 * A toggle on one section should not repaint rows in other sections.
 */
export const SettingRow = memo(function SettingRow({
  icon,
  iconBg = 'bg-gray-100 dark:bg-gray-700',
  label,
  description,
  right,
  onPress,
  destructive = false,
  accessibilityLabel,
}: SettingRowProps) {
  const Row = onPress ? TouchableOpacity : View;
  const { scale } = useDynamicFontSize();

  return (
    <Row
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      className="flex-row items-center px-4 py-3.5"
    >
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
