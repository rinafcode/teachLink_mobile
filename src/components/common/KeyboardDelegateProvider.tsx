/**
 * KeyboardDelegateProvider
 *
 * Mounts a **single** pair of Keyboard listeners for the whole app and
 * distributes the resulting state via React context.  Any component that
 * needs keyboard height / visibility reads from `useKeyboardState()` without
 * registering its own listeners.
 *
 * Usage
 * -----
 * Wrap the app root once:
 *
 *   <KeyboardDelegateProvider>
 *     <AppNavigator />
 *   </KeyboardDelegateProvider>
 *
 * Then in any child component:
 *
 *   const { isVisible, height } = useKeyboardState();
 */

import React, { createContext, useContext } from 'react';

import {
    KeyboardDelegateOptions,
    KeyboardState,
    useKeyboardDelegate,
} from '../../hooks/useKeyboardDelegate';

// ─── Context ──────────────────────────────────────────────────────────────────

const KeyboardContext = createContext<KeyboardState>({
  isVisible: false,
  height: 0,
  animationDuration: 250,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface KeyboardDelegateProviderProps extends KeyboardDelegateOptions {
  children: React.ReactNode;
}

/**
 * Place this **once** near the root of your component tree.
 * It registers exactly two Keyboard listeners (show + hide) for the entire app.
 */
export function KeyboardDelegateProvider({
  children,
  onShow,
  onHide,
}: KeyboardDelegateProviderProps) {
  // Single hook call = single pair of listeners for the whole app
  const keyboardState = useKeyboardDelegate({ onShow, onHide });

  return (
    <KeyboardContext.Provider value={keyboardState}>
      {children}
    </KeyboardContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Returns the current keyboard state from the delegated root listener.
 * Does **not** register any additional Keyboard listeners.
 *
 * @example
 * const { isVisible, height } = useKeyboardState();
 */
export function useKeyboardState(): KeyboardState {
  return useContext(KeyboardContext);
}
