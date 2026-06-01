import React, { useRef } from 'react';
import {
  Modal,
  ModalProps,
  View,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { useFocusRestore } from '../../hooks/useFocusRestore';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AccessibleModalProps extends Omit<ModalProps, 'visible'> {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal overlay or request close is triggered */
  onClose: () => void;
  /** Accessibility label for the screen reader */
  accessibilityLabel: string;
  /** Style for the outer overlay backdrop */
  overlayStyle?: StyleProp<ViewStyle>;
  /** Style for the inner modal card/container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional ref of the element that triggered the modal, for focus restoration on native */
  triggerRef?: React.RefObject<any>;
  /** Optional ref of the element inside the modal that should receive initial focus */
  initialFocusRef?: React.RefObject<any>;
  /** Contents of the modal */
  children: React.ReactNode;
}

/**
 * A reusable accessible modal component that wraps React Native's Modal
 * and implements focus trapping (Tab trap on Web, screen reader trap on Native)
 * and focus restoration (returns focus to the triggering element on dismissal).
 */
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  visible,
  onClose,
  accessibilityLabel,
  overlayStyle,
  containerStyle,
  triggerRef,
  initialFocusRef,
  children,
  ...modalProps
}) => {
  const containerRef = useRef<View>(null);

  // Restore focus to the trigger element when the modal is closed/dismissed
  useFocusRestore(visible, triggerRef);

  // Trap focus inside the modal container when visible
  const { containerProps } = useFocusTrap(containerRef, visible, {
    initialFocusRef,
    autoFocus: true,
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      {...modalProps}
    >
      <Pressable style={[styles.overlay, overlayStyle]} onPress={onClose}>
        <Pressable
          ref={containerRef}
          style={[styles.content, containerStyle]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="dialog"
          onPress={e => e.stopPropagation()}
          {...containerProps}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
      default: {},
    }),
  },
});
