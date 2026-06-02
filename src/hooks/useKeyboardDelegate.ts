/**
 * useKeyboardDelegate
 *
 * Centralises all Keyboard event subscriptions at a single point (the root
 * provider) instead of letting each screen/component register its own
 * listeners.  Consumers call `useKeyboardState()` to read the shared state
 * without adding any extra listeners.
 *
 * Benefits
 * --------
 *  ⚡ One pair of Keyboard listeners for the entire app (was N per screen)
 *  📊 Lower memory footprint — no listener accumulation across navigations
 *  🎯 Single source of truth for keyboard height / visibility
 */

import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface KeyboardState {
  /** Whether the software keyboard is currently visible */
  isVisible: boolean;
  /** Current keyboard height in logical pixels (0 when hidden) */
  height: number;
  /** Duration of the show/hide animation in ms */
  animationDuration: number;
}

export interface KeyboardDelegateOptions {
  /**
   * Called whenever the keyboard shows.
   * Receives the native KeyboardEvent so callers can read `endCoordinates`.
   */
  onShow?: (event: KeyboardEvent) => void;
  /** Called whenever the keyboard hides. */
  onHide?: (event: KeyboardEvent) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Registers **one** pair of Keyboard listeners and returns live keyboard state.
 *
 * Intended to be called **once** at the root of the component tree
 * (inside `KeyboardDelegateProvider`).  Child components should use
 * `useKeyboardState()` from the context instead of calling this hook directly.
 *
 * @param options - Optional show/hide callbacks for side-effects.
 */
export function useKeyboardDelegate(
  options: KeyboardDelegateOptions = {}
): KeyboardState {
  const { onShow, onHide } = options;

  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    animationDuration: 250,
  });

  // Keep callback refs stable so the effect doesn't re-run on every render
  const onShowRef = useRef(onShow);
  const onHideRef = useRef(onHide);
  useEffect(() => { onShowRef.current = onShow; }, [onShow]);
  useEffect(() => { onHideRef.current = onHide; }, [onHide]);

  useEffect(() => {
    // Use the correct event names per platform
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setState({
        isVisible: true,
        height: event.endCoordinates.height,
        animationDuration: event.duration ?? 250,
      });
      onShowRef.current?.(event);
    });

    const hideSub = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => {
      setState(prev => ({
        ...prev,
        isVisible: false,
        height: 0,
        animationDuration: event.duration ?? 250,
      }));
      onHideRef.current?.(event);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []); // empty deps — listeners are registered once and never re-created

  return state;
}
