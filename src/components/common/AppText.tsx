import React, { useMemo } from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

import { useDynamicFontSize } from '../../hooks';

interface AppTextProps extends TextProps {
  /**
   * If true, the font size will NOT be scaled.
   * Useful for elements that should remain at a fixed size regardless of system settings.
   */
  fixed?: boolean;
}

const AppTextInner: React.FC<AppTextProps> = ({ style, fixed = false, ...props }) => {
  const { fontScale } = useDynamicFontSize();

  const dynamicStyle = useMemo(() => {
    const flat = StyleSheet.flatten(style) || {};
    if (fixed || !flat.fontSize) return flat;

    return {
      ...flat,
      fontSize: flat.fontSize * fontScale,
      ...(flat.lineHeight ? { lineHeight: flat.lineHeight * fontScale } : {}),
    };
  }, [style, fixed, fontScale]);

  return <RNText {...props} style={dynamicStyle} allowFontScaling={false} />;
};

/**
 * A wrapper around React Native's Text component that uses the useDynamicFontSize hook
 * to ensure consistent scaling across the application.
 */
export const AppText = React.memo(AppTextInner);
