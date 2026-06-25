import React, { memo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';

import { getAccessibilityProps } from '../../utils/accessibility';

/**
 * Explicit props for the AccessibleButton component.
 *
 * NOTE: Do NOT reintroduce `{...rest}` or generic prop spreading here.
 * If you need an additional TouchableOpacity prop, add it explicitly to this
 * interface and thread it through to <TouchableOpacity> below.
 * See docs/prop-patterns.md.
 */
interface AccessibleButtonProps {
  label: string;
  hint?: string;
  role?: 'button' | 'link';
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  disabled?: boolean;
  activeOpacity?: number;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  testID?: string;
}

/**
 * A reusable accessible button component for TeachLink mobile.
 * Ensures a minimum touch target of 44x44 and provides consistent accessibility props.
 */
const AccessibleButtonComponent: React.FC<AccessibleButtonProps> = ({
  label,
  hint,
  role = 'button',
  children,
  style,
  containerStyle,
  disabled,
  activeOpacity = 0.7,
  onPress,
  onLongPress,
  testID,
}) => {
  const accessibilityProps = getAccessibilityProps(label, role as 'button' | 'link', hint, {
    disabled: !!disabled,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      testID={testID}
      style={[styles.base, containerStyle, style]}
      {...accessibilityProps}
    >
      {children}
    </TouchableOpacity>
  );
};

export const AccessibleButton = memo(AccessibleButtonComponent);

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
