import React, { useCallback, useEffect, useState } from 'react';
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
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { useDynamicFontSize } from '../../hooks';
import {
  formCacheService,
  setCachedFieldValue,
  type FormCacheFieldKey,
} from '../../services/formCache';
import { AppText as Text } from '../common/AppText';

interface MobileFormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  required?: boolean;
  isDark?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: AutoCapitalize;
  autoCorrect?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: (event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
  maxLength?: number;
  editable?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  cacheKey?: FormCacheFieldKey;
  cacheOnBlur?: boolean;
  inputRef?: React.Ref<TextInput>;
  onBlur?: TextInputProps['onBlur'];
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
  cacheKey,
  cacheOnBlur = true,
  inputRef,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const { scale } = useDynamicFontSize();
  const isPassword = secureTextEntry === true;

  useEffect(() => {
    if (!cacheKey || !isFocused) {
      setSuggestion(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const store = await formCacheService.loadFormCache();
      if (cancelled) return;
      setSuggestion(formCacheService.getSuggestionForField(store, cacheKey, value));
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, isFocused, value]);

  const handleBlur = useCallback((e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    if (cacheKey && cacheOnBlur && value.trim()) {
      void setCachedFieldValue(cacheKey, value);
    }
    onBlur?.(e);
  }, [cacheKey, cacheOnBlur, value, onBlur]);

  const handleApplySuggestion = useCallback(() => {
    if (suggestion) {
      onChangeText(suggestion);
      setSuggestion(null);
    }
  }, [suggestion, onChangeText]);

  const handleFocus = useCallback(() => setIsFocused(true), []);

  const handleTogglePassword = useCallback(() => setShowPassword(prev => !prev), []);

  const borderColor = error ? '#ef4444' : isFocused ? '#19c3e6' : isDark ? '#334155' : '#e2e8f0';
  const labelColor = error ? '#ef4444' : isDark ? '#94a3b8' : '#64748b';

  return (
    <View className="mb-4 w-full">
      <View className="flex-row justify-between items-center mb-1.5">
        <Text
          className="font-semibold tracking-[0.1px]"
          style={{ color: labelColor, fontSize: scale(14) }}
        >
          {label}
          {required && (
            <Text className="text-red-500" style={{ fontSize: scale(14) }}>
              {' '}
              *
            </Text>
          )}
        </Text>
        {hint && !error && (
          <Text style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: scale(12) }}>
            {hint}
          </Text>
        )}
      </View>

      <View
        className="flex-row items-center border-[1.5px] rounded-xl overflow-hidden"
        style={{
          borderColor,
          backgroundColor: isDark ? '#1e293b' : '#fff',
          minHeight: multiline ? scale(100) : scale(52),
        }}
      >
        {leftIcon && <View className="px-3.5 justify-center items-center">{leftIcon}</View>}

        <TextInput
          className="flex-1 py-3.5 pr-4"
          style={{
            color: isDark ? '#f1f5f9' : '#1e293b',
            paddingLeft: leftIcon ? 0 : scale(16),
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? scale(14) : 0,
            fontSize: scale(15),
          }}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
          value={value}
          onChangeText={onChangeText}
          ref={inputRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
          <TouchableOpacity onPress={handleTogglePassword} className="px-3.5">
            {showPassword ? (
              <EyeOff size={scale(20)} color={isDark ? '#64748b' : '#94a3b8'} />
            ) : (
              <Eye size={scale(20)} color={isDark ? '#64748b' : '#94a3b8'} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {suggestion && !error && (
        <TouchableOpacity
          className="flex-row items-center gap-1.5 mt-1.5 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
            borderColor: isDark ? '#334155' : '#bae6fd',
          }}
          onPress={handleApplySuggestion}
          accessibilityRole="button"
          accessibilityLabel={`Use cached value ${suggestion}`}
        >
          <Text
            className="font-medium"
            style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: scale(12) }}
          >
            Use saved:
          </Text>
          <Text
            className="flex-1 font-semibold"
            style={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: scale(12) }}
            numberOfLines={1}
          >
            {suggestion}
          </Text>
        </TouchableOpacity>
      )}

      {error && (
        <View className="flex-row items-center gap-1 mt-1">
          <AlertCircle size={scale(14)} color="#ef4444" />
          <Text className="text-red-500 flex-1" style={{ fontSize: scale(12) }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};