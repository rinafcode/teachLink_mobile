import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  AutoCapitalize,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { AppText as Text } from '../common/AppText';
import { useDynamicFontSize } from '../../hooks';

/**
 * Explicit props for the MobileFormInput component.
 *
 * NOTE: Do NOT reintroduce `{...rest}` or generic prop spreading here.
 * If you need an additional TextInput prop, add it explicitly to this interface
 * and thread it through to <TextInput> below.
 * See docs/prop-patterns.md.
 */
interface MobileFormInputProps {
  /** Label text for the input field */
  label: string;
  /** Current value of the input */
  value: string;
  /** Callback when the input value changes */
  onChangeText: (text: string) => void;
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Error message to display */
  error?: string;
  /** Hint text to display next to the label */
  hint?: string;
  /** Icon to display on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to use dark mode styling */
  isDark?: boolean;
  /** Show as a password field with visibility toggle */
  secureTextEntry?: boolean;
  /** Allow multiple lines of text */
  multiline?: boolean;
  /** Keyboard type for the input */
  keyboardType?: KeyboardTypeOptions;
  /** Auto-capitalisation behaviour */
  autoCapitalize?: AutoCapitalize;
  /** Whether auto-correction is enabled */
  autoCorrect?: boolean;
  /** Auto-complete type hint for the OS */
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  /** Return key label on the software keyboard */
  returnKeyType?: ReturnKeyTypeOptions;
  /** Callback when the user presses the return key */
  onSubmitEditing?: (
    event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => void;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the input is editable */
  editable?: boolean;
  /** Test identifier for automated tests */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

export const MobileFormInput: React.FC<MobileFormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  leftIcon,
  required = false,
  isDark = false,
  secureTextEntry,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize,
  autoCorrect,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  maxLength,
  editable,
  testID,
  accessibilityLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { scale } = useDynamicFontSize();
  const isPassword = secureTextEntry === true;

  const borderColor = error ? '#ef4444' : isFocused ? '#19c3e6' : isDark ? '#334155' : '#e2e8f0';

  const labelColor = error ? '#ef4444' : isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: labelColor, fontSize: scale(14) }]}>
          {label}
          {required && <Text style={[styles.required, { fontSize: scale(14) }]}> *</Text>}
        </Text>
        {hint && !error && (
          <Text
            style={[styles.hint, { color: isDark ? '#475569' : '#94a3b8', fontSize: scale(12) }]}
          >
            {hint}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: isDark ? '#1e293b' : '#fff',
            minHeight: multiline ? scale(100) : scale(52),
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: isDark ? '#f1f5f9' : '#1e293b',
              paddingLeft: leftIcon ? 0 : scale(16),
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? scale(14) : 0,
              fontSize: scale(15),
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          editable={editable}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightIcon}>
            {showPassword ? (
              <EyeOff size={scale(20)} color={isDark ? '#64748b' : '#94a3b8'} />
            ) : (
              <Eye size={scale(20)} color={isDark ? '#64748b' : '#94a3b8'} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={scale(14)} color="#ef4444" />
          <Text style={[styles.errorText, { fontSize: scale(12) }]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  leftIconWrapper: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 16,
  },
  rightIcon: {
    paddingHorizontal: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    flex: 1,
  },
});
