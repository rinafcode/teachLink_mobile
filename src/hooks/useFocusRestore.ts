import { useEffect, useRef } from 'react';
import { Platform, findNodeHandle, AccessibilityInfo } from 'react-native';

/**
 * Hook to capture the currently focused element and restore focus to it.
 *
 * Can be triggered by:
 * 1. Mounting/unmounting (using default active = true)
 * 2. Toggling the active state (e.g. for components that stay mounted but change visibility)
 *
 * @param active Whether focus restore is active (defaults to true)
 * @param triggerRef Optional ref of the element to restore focus to (if not the previously focused one)
 */
export const useFocusRestore = (active = true, triggerRef?: React.RefObject<any>) => {
  const previouslyFocusedRef = useRef<any>(null);

  useEffect(() => {
    if (active) {
      if (Platform.OS === 'web') {
        previouslyFocusedRef.current = document.activeElement;
      } else {
        // On native, we can allow the consumer to explicitly pass the triggering element ref
        // or we try to find it if we have it.
        if (triggerRef && triggerRef.current) {
          previouslyFocusedRef.current = triggerRef.current;
        }
      }
    } else {
      // Deactivating: restore focus
      restoreFocus();
    }
  }, [active, triggerRef]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      restoreFocus();
    };
  }, []);

  const restoreFocus = () => {
    if (previouslyFocusedRef.current) {
      const element = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;

      if (Platform.OS === 'web') {
        if (typeof element.focus === 'function') {
          element.focus();
        }
      } else {
        if (typeof element.focus === 'function') {
          element.focus();
        }

        // Restore accessibility focus for screen readers
        try {
          const tag = findNodeHandle(element);
          if (tag) {
            AccessibilityInfo.setAccessibilityFocus(tag);
          }
        } catch {
          // Ignore errors in environments where findNodeHandle is not supported (e.g. testing)
        }
      }
    }
  };
};
