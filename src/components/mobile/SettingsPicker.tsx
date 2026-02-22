import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface PickerOption {
  label: string;
  value: string;
  description?: string;
}

interface SettingsPickerProps {
  value: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * SettingsPicker renders a tappable row that opens a bottom-sheet modal
 * showing all available options. The selected option gets a cyan checkmark.
 * Matches the iOS-style grouped settings aesthetic used throughout the app.
 */
export function SettingsPicker({
  value,
  options,
  onValueChange,
  label,
  description,
  icon,
  disabled = false,
}: SettingsPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const handleSelect = (optionValue: string) => {
    useHapticFeedback('light');
    onValueChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      {/* Row trigger */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex-row items-center ${disabled ? 'opacity-50' : ''}`}
      >
        {icon ? (
          <View className="w-8 h-8 items-center justify-center mr-3">{icon}</View>
        ) : null}

        <View className="flex-1">
          <Text className="text-[15px] font-medium text-gray-900 dark:text-white">
            {label}
          </Text>
          {description ? (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {description}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            {selectedLabel}
          </Text>
          <ChevronRight size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      {/* Bottom-sheet modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalContainer}>
          {/* Dim backdrop — tap to dismiss */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <View style={styles.backdrop} />
          </TouchableOpacity>

          {/* Sheet */}
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl pb-8">
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>

            {/* Title */}
            <View className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-base font-semibold text-gray-900 dark:text-white text-center">
                {label}
              </Text>
            </View>

            {/* Options list */}
            <ScrollView className="max-h-80" bounces={false}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(option.value)}
                  className={`flex-row items-center px-6 py-4 ${
                    index < options.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-700'
                      : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-[15px] ${
                        option.value === value
                          ? 'font-semibold text-cyan-500'
                          : 'font-normal text-gray-900 dark:text-white'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {option.description ? (
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </Text>
                    ) : null}
                  </View>

                  {option.value === value ? (
                    <Check size={18} color="#19c3e6" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cancel */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsOpen(false)}
              className="mx-4 mt-3 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl"
            >
              <Text className="text-[15px] font-semibold text-gray-900 dark:text-white text-center">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});

export default SettingsPicker;
