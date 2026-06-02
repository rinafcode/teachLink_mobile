import React, { useEffect, useRef } from 'react';
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

import { useModalPortalSafe } from './ModalPortal';
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
  /**
   * When true, the modal is rendered via ModalPortalProvider at the root level,
   * isolating it from parent re-renders. Requires ModalPortalProvider in the tree.
   * Defaults to true.
   */
  usePortal?: boolean;
}

/**
 * A reusable accessible modal component that wraps React Native's Modal
 * and implements focus trapping (Tab trap on Web, screen reader trap on Native)
 * and focus restoration (returns focus to the triggering element on dismissal).
 *
 * By default renders via ModalPortalProvider to isolate from parent re-renders.
 * Pass usePortal={false} to render inline (e.g. in tests or outside a provider).
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
  usePortal = true,
  ...modalProps
}) => {
  const containerRef = useRef<View>(null);

  useFocusRestore(visible, triggerRef);
  const { containerProps } = useFocusTrap(containerRef, visible, {
    initialFocusRef,
    autoFocus: true,
  });

  // Stable portal id derived from accessibilityLabel
  const portalId = `accessible-modal:${accessibilityLabel}`;
  const portal = useModalPortalSafe();

  const modalContent = (
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
          accessibilityViewIsModal
          onPress={e => e.stopPropagation()}
          {...containerProps}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Register/unregister with the portal when usePortal is enabled
  useEffect(() => {
    if (!usePortal || !portal) return;
    if (visible) {
      portal.showModal(portalId, modalContent);
    } else {
      portal.hideModal(portalId);
    }
    return () => {
      portal.hideModal(portalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, usePortal, portal, portalId]);

  // When portal is active, the host renders the modal — nothing to render here
  if (usePortal && portal) return null;

  // Fallback: render inline (no provider, or usePortal=false)
  return modalContent;
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
