import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * useKeyboardNavigation
 *
 * Adds global keyboard navigation support for web and tablet targets.
 *
 * - Escape: calls onEscape (close modals, drawers, dropdowns)
 * - Enter / Space: calls onActivate (activate focused interactive element)
 *
 * Only attaches listeners on web (Platform.OS === 'web').
 * Safe to use on native — no-op when not on web.
 *
 * WCAG 2.1 AA: satisfies 2.1.1 Keyboard and 2.1.2 No Keyboard Trap.
 */
export function useKeyboardNavigation(options: {
  onEscape?: () => void;
  onActivate?: () => void;
  enabled?: boolean;
}) {
  const { onEscape, onActivate, enabled = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      switch (e.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
        case ' ':
          // Only activate if the focused element is NOT a native input/button
          // (those handle Enter/Space natively)
          if (
            document.activeElement &&
            !['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'].includes(document.activeElement.tagName)
          ) {
            onActivate?.();
          }
          break;
      }
    },
    [enabled, onEscape, onActivate]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Returns onKeyPress props for custom interactive components that need
 * Enter/Space activation (e.g. custom Pressable cards, list items).
 *
 * Usage:
 *   const keyProps = useInteractiveKeyProps(onPress);
 *   <Pressable {...keyProps} onPress={onPress}>...</Pressable>
 */
export function useInteractiveKeyProps(onPress?: () => void) {
  if (Platform.OS !== 'web') return {};

  return {
    onKeyPress: (e: any) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress?.();
      }
    },
    tabIndex: 0,
    role: 'button' as const,
  };
}
