import React, { memo } from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import type {
  StyleProp,
  TextStyle,
  AccessibilityRole,
  AccessibilityState,
} from 'react-native';
import { useDynamicFontSize } from '../../hooks';

/**
 * Explicit subset of React Native TextProps that AppText consumers may pass.
 *
 * NOTE: Do NOT add `{...rest}` or generic prop spreading here.
 * If you need an additional prop, add it explicitly to this interface
 * and thread it through to <RNText> below. This keeps the component
 * surface area predictable and prevents unnecessary re-renders caused
 * by unknown prop changes. See docs/prop-patterns.md.
 */
export interface AppTextProps {
  /** Text content */
  children?: React.ReactNode;
  /** Style overrides for the text element */
  style?: StyleProp<TextStyle>;
  /**
   * If true, the font size will NOT be scaled.
   * Useful for elements that should remain at a fixed size regardless of system settings.
   */
  fixed?: boolean;
  /** Maximum number of lines before truncation */
  numberOfLines?: number;
  /** Truncation strategy when numberOfLines is set */
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  /** Press handler */
  onPress?: () => void;
  /** Long-press handler */
  onLongPress?: () => void;
  /** Test identifier for automated tests */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility role for screen readers */
  accessibilityRole?: AccessibilityRole;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Accessibility state for screen readers */
  accessibilityState?: AccessibilityState;
  /** Controls importance for accessibility on Android */
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  /** Allow the text to be selected by the user */
  selectable?: boolean;
}

/**
 * A wrapper around React Native's Text component that uses the useDynamicFontSize hook
 * to ensure consistent scaling across the application.
 */
const AppTextComponent: React.FC<AppTextProps> = ({ style, fixed = false, ...props }) => {
export const AppText: React.FC<AppTextProps> = ({
  style,
  fixed = false,
  children,
  numberOfLines,
  ellipsizeMode,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
  accessibilityState,
  importantForAccessibility,
  selectable,
}) => {
  const { scale } = useDynamicFontSize();

  // We flatten the style to easily extract and modify the fontSize
  const flattenedStyle = StyleSheet.flatten(style) || {};

  const dynamicStyle = { ...flattenedStyle };

  if (!fixed && flattenedStyle.fontSize) {
    dynamicStyle.fontSize = scale(flattenedStyle.fontSize);

    // Also scale lineHeight if it exists to maintain proportions
    if (flattenedStyle.lineHeight) {
      dynamicStyle.lineHeight = scale(flattenedStyle.lineHeight);
    }
  }

  return (
    <RNText
      style={dynamicStyle}
      // We set allowFontScaling to false because we are manually scaling
      // via the dynamicStyle to have explicit control via our hook.
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      importantForAccessibility={importantForAccessibility}
      selectable={selectable}
    >
      {children}
    </RNText>
  );
};

export const AppText = memo(AppTextComponent);
