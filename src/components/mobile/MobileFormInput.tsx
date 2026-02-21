import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';

interface MobileFormInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  required?: boolean;
  isDark?: boolean;
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
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;

  const borderColor = error
    ? '#ef4444'
    : isFocused
    ? '#19c3e6'
    : isDark
    ? '#334155'
    : '#e2e8f0';

  const labelColor = error ? '#ef4444' : isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: labelColor }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {hint && !error && (
          <Text style={[styles.hint, { color: isDark ? '#475569' : '#94a3b8' }]}>
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
            minHeight: multiline ? 100 : 52,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconWrapper}>{leftIcon}</View>
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: isDark ? '#f1f5f9' : '#1e293b',
              paddingLeft: leftIcon ? 0 : 16,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? 14 : 0,
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
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            {showPassword ? (
              <EyeOff size={20} color={isDark ? '#64748b' : '#94a3b8'} />
            ) : (
              <Eye size={20} color={isDark ? '#64748b' : '#94a3b8'} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
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
