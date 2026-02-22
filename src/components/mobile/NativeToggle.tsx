import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface NativeToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Hex colour for the active track. Defaults to the project's primary cyan. */
  activeTrackColor?: string;
  /** Hex colour for the active thumb. Defaults to the project's primary dark cyan. */
  activeThumbColor?: string;
}

/**
 * NativeToggle wraps React Native's Switch with project-consistent styling
 * and haptic feedback. When `label` is provided the component renders a full
 * pressable row; otherwise just the bare Switch is returned so it can be
 * embedded inside a parent row.
 */
export function NativeToggle({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  activeTrackColor = '#19c3e6',
  activeThumbColor = '#0099b3',
}: NativeToggleProps) {
  const handleChange = (newValue: boolean) => {
    useHapticFeedback('light');
    onValueChange(newValue);
  };

  const switchControl = (
    <Switch
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      trackColor={{ false: '#D1D5DB', true: activeTrackColor }}
      thumbColor={value ? activeThumbColor : '#9CA3AF'}
      ios_backgroundColor="#D1D5DB"
    />
  );

  if (!label) return switchControl;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => !disabled && handleChange(!value)}
      disabled={disabled}
      className={`flex-row items-center ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="flex-1 mr-3">
        <Text className="text-[15px] font-medium text-gray-900 dark:text-white">
          {label}
        </Text>
        {description ? (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </Text>
        ) : null}
      </View>
      {switchControl}
    </TouchableOpacity>
  );
}

export default NativeToggle;
