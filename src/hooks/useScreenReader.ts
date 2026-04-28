import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to detect if a screen reader (VoiceOver/TalkBack) is currently enabled.
 */
export const useScreenReader = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then((status) => {
      if (isMounted) {
        setIsEnabled(status);
      }
    });

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (status: boolean) => {
        setIsEnabled(status);
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isEnabled;
};
