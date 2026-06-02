/**
 * DelegatedKeyboardAvoidingView
 *
 * A drop-in replacement for React Native's `KeyboardAvoidingView` that reads
 * keyboard state from the root `KeyboardDelegateProvider` context instead of
 * registering its own Keyboard listeners.
 *
 * Why use this instead of `KeyboardAvoidingView`?
 * ------------------------------------------------
 * Each `KeyboardAvoidingView` instance registers its own `keyboardWillShow` /
 * `keyboardDidShow` listeners.  When multiple screens are mounted (e.g. inside
 * a tab navigator with `detachInactiveScreens={false}`), those listeners
 * accumulate.  This component avoids that by consuming the single delegated
 * listener registered at the root.
 *
 * Usage
 * -----
 * Replace:
 *   <KeyboardAvoidingView behavior="padding" style={styles.kav}>
 *
 * With:
 *   <DelegatedKeyboardAvoidingView behavior="padding" style={styles.kav}>
 *
 * The `KeyboardDelegateProvider` must be an ancestor in the tree.
 */

import React, { useMemo } from 'react';
import {
    Platform,
    StyleSheet,
    View,
    ViewProps,
    ViewStyle
} from 'react-native';

import { useKeyboardState } from './KeyboardDelegateProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type KeyboardAvoidingBehavior = 'height' | 'position' | 'padding';

export interface DelegatedKeyboardAvoidingViewProps extends ViewProps {
  /**
   * Mirrors the `behavior` prop of `KeyboardAvoidingView`.
   * Defaults to `'padding'` on iOS and `'height'` on Android (same as RN default).
   */
  behavior?: KeyboardAvoidingBehavior;
  /**
   * Additional offset subtracted from the keyboard height.
   * Useful when a header or tab bar sits above the view.
   */
  keyboardVerticalOffset?: number;
  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Keyboard-avoiding container backed by the delegated root listener.
 * Registers **zero** additional Keyboard event listeners.
 */
export function DelegatedKeyboardAvoidingView({
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset = 0,
  style,
  children,
  ...rest
}: DelegatedKeyboardAvoidingViewProps) {
  const { isVisible, height } = useKeyboardState();

  const avoidingStyle = useMemo<ViewStyle>(() => {
    if (!isVisible) return {};

    const effectiveHeight = Math.max(0, height - keyboardVerticalOffset);

    switch (behavior) {
      case 'height':
        return { height: undefined, maxHeight: undefined, flex: undefined };

      case 'padding':
        return { paddingBottom: effectiveHeight };

      case 'position':
        return { bottom: effectiveHeight };

      default:
        return {};
    }
  }, [isVisible, height, keyboardVerticalOffset, behavior]);

  return (
    <View style={[styles.base, style, avoidingStyle]} {...rest}>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
