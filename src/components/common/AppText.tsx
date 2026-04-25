import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';

interface AppTextProps extends TextProps {
  /**
   * If true, the font size will NOT be scaled.
   * Useful for elements that should remain at a fixed size regardless of system settings.
   */
  fixed?: boolean;
}

/**
 * A wrapper around React Native's Text component that uses the useDynamicFontSize hook
 * to ensure consistent scaling across the application.
 */
export const AppText: React.FC<AppTextProps> = ({ style, fixed = false, ...props }) => {
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
      {...props}
      style={dynamicStyle}
      // We set allowFontScaling to false because we are manually scaling
      // via the dynamicStyle to have explicit control via our hook.
      allowFontScaling={false}
    />
  );
};
