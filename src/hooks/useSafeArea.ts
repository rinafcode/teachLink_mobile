import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useSafeArea = () => {
  const insets = useSafeAreaInsets();

  return {
    insets,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    // Helper for adding extra padding
    safePaddingTop: (extra: number = 0) => ({ paddingTop: insets.top + extra }),
    safePaddingBottom: (extra: number = 0) => ({ paddingBottom: insets.bottom + extra }),
  };
};
