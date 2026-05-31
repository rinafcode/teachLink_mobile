import { useEffect } from 'react';
import { Platform, findNodeHandle, AccessibilityInfo } from 'react-native';

/**
 * Hook to trap focus inside a container element.
 *
 * On Web: Traps Tab / Shift+Tab keyboard focus.
 * On Native: Sets accessibility focus to the container or initial element,
 * and helps manage screen reader boundaries.
 *
 * Returns helper accessibility props for wrapping elements.
 */
export const useFocusTrap = (
  containerRef: React.RefObject<any>,
  active = true,
  options: {
    initialFocusRef?: React.RefObject<any>;
    autoFocus?: boolean;
  } = {}
) => {
  const { initialFocusRef, autoFocus = true } = options;

  // On Web, handle focus trapping via keyboard listener
  useEffect(() => {
    if (!active || Platform.OS !== 'web' || !containerRef.current) return;

    const container = containerRef.current;

    // Selector for focusable elements on web
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]',
      '[focusable="true"]',
      '[role="button"]',
      '[role="link"]',
    ].join(',');

    const getFocusableElements = (): HTMLElement[] => {
      // Find all elements matching the selectors
      const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
      return elements.filter(el => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
          return false;
        }
        const tabIndexAttr = el.getAttribute('tabindex');
        if (tabIndexAttr && parseInt(tabIndexAttr, 10) < 0) {
          return false;
        }
        // Ensure element is visible
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        return true;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const activeEl = document.activeElement as HTMLElement;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: focus previous
        if (activeEl === firstEl || !container.contains(activeEl)) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        // Tab: focus next
        if (activeEl === lastEl || !container.contains(activeEl)) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on activation
    if (autoFocus) {
      const focusTarget = initialFocusRef?.current || getFocusableElements()[0] || container;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        const timer = setTimeout(() => {
          focusTarget.focus();
        }, 50);
        return () => {
          clearTimeout(timer);
          document.removeEventListener('keydown', handleKeyDown);
        };
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, containerRef, initialFocusRef, autoFocus]);

  // On Native, handle initial focus and screen reader focus
  useEffect(() => {
    if (!active || Platform.OS === 'web' || !containerRef.current) return;

    if (autoFocus) {
      const timer = setTimeout(() => {
        const targetElement = initialFocusRef?.current || containerRef.current;
        if (targetElement) {
          if (typeof targetElement.focus === 'function') {
            targetElement.focus();
          }

          try {
            const tag = findNodeHandle(targetElement);
            if (tag) {
              AccessibilityInfo.setAccessibilityFocus(tag);
            }
          } catch {
            // Ignore errors in environments where findNodeHandle is not supported
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [active, containerRef, initialFocusRef, autoFocus]);

  return {
    containerProps: {
      accessible: true,
      accessibilityViewIsModal: active,
      'aria-modal': active ? ('true' as const) : undefined,
    },
    backgroundProps: {
      accessibilityElementsHidden: active,
      importantForAccessibility: active ? ('no-hide-descendants' as const) : ('auto' as const),
    },
  };
};
