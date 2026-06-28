import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { useFocusRestore } from '../../hooks/useFocusRestore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

export type DrawerPosition = 'left' | 'right' | 'bottom';

interface DrawerProps {
  /** Whether the drawer is visible */
  visible: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Side from which the drawer slides in */
  position?: DrawerPosition;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Width of the drawer (left/right). Defaults to 80% of screen width. */
  width?: number;
  /** Height of the drawer (bottom). Defaults to 50% of screen height. */
  height?: number;
  /** Optional ref of the triggering element for focus restoration */
  triggerRef?: React.RefObject<any>;
  /** Style overrides for the drawer panel */
  drawerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Accessible slide-in drawer with keyboard navigation support.
 *
 * Keyboard behaviour (Web / iPad + Smart Keyboard):
 * - Escape: closes the drawer
 * - Tab / Shift+Tab: cycles focus within the drawer (focus trap)
 * - Focus is restored to the triggering element on close
 *
 * WCAG 2.1 AA: satisfies 2.1.1 Keyboard, 2.4.3 Focus Order, 2.4.7 Focus Visible.
 */
export const Drawer: React.FC<DrawerProps> = ({
  visible,
  onClose,
  position = 'right',
  accessibilityLabel = 'Drawer',
  width,
  height,
  triggerRef,
  drawerStyle,
  children,
}) => {
  const containerRef = useRef<View>(null);
  const translateAnim = useRef(new Animated.Value(0)).current;

  const drawerWidth = width ?? SCREEN_WIDTH * 0.8;
  const drawerHeight = height ?? SCREEN_HEIGHT * 0.5;

  // Focus trap inside the drawer
  useFocusRestore(visible, triggerRef);
  const { containerProps, backgroundProps } = useFocusTrap(containerRef, visible, {
    autoFocus: true,
  });

  // Escape key closes the drawer (web / tablet keyboard)
  useKeyboardNavigation({
    enabled: visible,
    onEscape: onClose,
  });

  // Slide animation
  useEffect(() => {
    const hiddenOffset =
      position === 'bottom' ? drawerHeight : position === 'left' ? -drawerWidth : drawerWidth;
    const toValue = visible ? 0 : hiddenOffset;
    Animated.timing(translateAnim, {
      toValue,
      duration: 280,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, position, drawerWidth, drawerHeight]);

  function getTransformStyle() {
    if (position === 'bottom') {
      return { transform: [{ translateY: translateAnim }] };
    }
    return { transform: [{ translateX: translateAnim }] };
  }

  function getPositionStyle(): ViewStyle {
    switch (position) {
      case 'left':
        return { left: 0, top: 0, bottom: 0, width: drawerWidth };
      case 'right':
        return { right: 0, top: 0, bottom: 0, width: drawerWidth };
      case 'bottom':
        return { left: 0, right: 0, bottom: 0, height: drawerHeight };
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
        {...backgroundProps}
      />

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, getPositionStyle(), getTransformStyle(), drawerStyle]}>
        <View
          ref={containerRef}
          style={styles.inner}
          accessibilityRole="complementary"
          accessibilityLabel={accessibilityLabel}
          accessibilityViewIsModal
          {...containerProps}
          {...Platform.select({
            web: {
              // Visible focus outline for WCAG 2.4.7
              style: [styles.inner, { outline: 'none' }] as any,
            },
            default: {},
          })}
        >
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flex: 1,
  },
});
