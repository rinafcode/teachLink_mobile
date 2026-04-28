import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDynamicFontSize } from '../../hooks';

/**
 * Props for the PrimaryButton component
 */
interface PrimaryButtonProps {
  /** Callback function when the button is pressed */
  onPress: () => void;
  /** Text to display on the button */
  title: string;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Visual style variant of the button */
  variant?: 'gradient' | 'solid' | 'outline';
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Custom style for the button container */
  style?: ViewStyle;
  /** Custom style for the button text */
  textStyle?: TextStyle;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
  accessibilityHint?: string;
  accessibilityLabel?: string;
}

export default function PrimaryButton({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'gradient',
  size = 'medium',
  style,
  textStyle,
  icon,
  accessibilityHint,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const isDisabled = loading || disabled;
  const { scale } = useDynamicFontSize();
  const buttonLabel = accessibilityLabel ?? title;

  const sizeConfig = {
    small: { 
      paddingHorizontal: scale(12), 
      paddingVertical: scale(8), 
      borderRadius: 8, 
      fontSize: scale(14) 
    },
    medium: { 
      paddingHorizontal: scale(24), 
      paddingVertical: scale(12), 
      borderRadius: 12, 
      fontSize: scale(16) 
    },
    large: { 
      paddingHorizontal: scale(32), 
      paddingVertical: scale(16), 
      borderRadius: 12, 
      fontSize: scale(18) 
    },
  };

  const config = sizeConfig[size];

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[{ opacity: isDisabled ? 0.6 : 1 }, style]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={['#20afe7', '#2c8aec', '#586ce9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.button,
            styles.gradientButton,
            {
              paddingHorizontal: config.paddingHorizontal,
              paddingVertical: config.paddingVertical,
              borderRadius: config.borderRadius,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              {icon}
              <Text
                allowFontScaling={false}
                style={[
                  styles.buttonText,
                  { fontSize: config.fontSize, color: '#ffffff' },
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'solid') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.button,
          {
            backgroundColor: '#19c3e6',
            paddingHorizontal: config.paddingHorizontal,
            paddingVertical: config.paddingVertical,
            borderRadius: config.borderRadius,
            opacity: isDisabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            {icon}
            <Text
              allowFontScaling={false}
              style={[
                styles.buttonText,
                { fontSize: config.fontSize, color: '#ffffff' },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Outline variant
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={buttonLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          borderWidth: 2,
          borderColor: '#19c3e6',
          backgroundColor: '#f0f1f5',
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          borderRadius: config.borderRadius,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#19c3e6" size="small" />
      ) : (
        <>
          {icon}
          <Text
            allowFontScaling={false}
            style={[
              styles.buttonText,
              { fontSize: config.fontSize, color: '#19c3e6' },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gradientButton: {
    shadowColor: '#20afe7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontWeight: '600',
  },
});
