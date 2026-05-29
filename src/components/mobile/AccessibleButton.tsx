import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
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
  /** Accessibility label for screen readers */
  label: string;
  /** Additional accessibility hint for screen readers */
  hint?: string;
  /** Accessibility role for the button */
  role?: 'button' | 'link';
  /** Optional custom styles for the button container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style applied to the TouchableOpacity */
  style?: StyleProp<ViewStyle>;
  /** Button content */
  children?: React.ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Opacity when pressed. Defaults to 0.7 */
  activeOpacity?: number;
  /** Press handler */
  onPress?: (event: GestureResponderEvent) => void;
  /** Long-press handler */
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Test identifier for automated tests */
  testID?: string;
}

/**
 * A reusable accessible button component for TeachLink mobile.
 * Ensures a minimum touch target of 44x44 and provides consistent accessibility props.
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
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

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
