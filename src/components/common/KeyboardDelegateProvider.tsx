import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

type KeyboardState = {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
};

const defaultKeyboardState: KeyboardState = {
  isKeyboardVisible: false,
  keyboardHeight: 0,
};

const KeyboardDelegateContext = createContext<KeyboardState>(defaultKeyboardState);

export const KeyboardDelegateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>(defaultKeyboardState);

  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    setKeyboardState({
      isKeyboardVisible: true,
      keyboardHeight: event.endCoordinates?.height ?? 0,
    });
  }, []);

  const handleKeyboardHide = useCallback(() => {
    setKeyboardState(defaultKeyboardState);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [handleKeyboardHide, handleKeyboardShow]);

  const value = useMemo(() => keyboardState, [keyboardState]);

  return (
    <KeyboardDelegateContext.Provider value={value}>{children}</KeyboardDelegateContext.Provider>
  );
};

export const useKeyboardState = (): KeyboardState => {
  return useContext(KeyboardDelegateContext);
};
