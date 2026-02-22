import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { X, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.6, 420);

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface FilterValues {
  [key: string]: string;
}

export interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterField[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onReset?: () => void;
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  values,
  onApply,
  onReset,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const [localValues, setLocalValues] = useState<FilterValues>(values);

  const open = useCallback(() => {
    translateY.value = withTiming(0, { duration: 280 });
    overlayOpacity.value = withTiming(1, { duration: 280 });
  }, [translateY, overlayOpacity]);

  const close = useCallback(() => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 220 });
    overlayOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  }, [translateY, overlayOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      setLocalValues(values);
      open();
    }
  }, [visible, values, open]);

  const handleSelect = useCallback((key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(localValues);
    close();
  }, [onApply, localValues, close]);

  const handleReset = useCallback(() => {
    setLocalValues({});
    onReset?.();
  }, [onReset]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <Animated.View style={[styles.overlay, overlayStyle]} />
      </Pressable>
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          {
            paddingBottom: insets.bottom + 16,
            maxHeight: SHEET_HEIGHT,
          },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={close} hitSlop={12} style={styles.closeBtn}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filters.map((field) => (
            <FilterSection
              key={field.key}
              label={field.label}
              options={field.options}
              selectedValue={localValues[field.key]}
              onSelect={(value) => handleSelect(field.key, value)}
            />
          ))}
        </ScrollView>
        <View style={styles.footer}>
          {onReset && (
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleApply} style={styles.applyBtn} activeOpacity={0.8}>
            <Check size={18} color="#fff" />
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

interface FilterSectionProps {
  label: string;
  options: FilterOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

function FilterSection({ label, options, selectedValue, onSelect }: FilterSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chips}>
        {options.map((opt) => {
          const selected = selectedValue === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
    maxHeight: 280,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipSelected: {
    backgroundColor: '#19c3e6',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#19c3e6',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
