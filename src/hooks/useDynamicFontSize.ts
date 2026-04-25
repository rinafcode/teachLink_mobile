import { useWindowDimensions } from 'react-native';

/**
 * Hook to track and react to dynamic font scaling changes.
 * Returns the current font scale factor and a scaling function.
 * Uses useWindowDimensions to automatically update when system settings change.
 */
export const useDynamicFontSize = () => {
  const { fontScale } = useWindowDimensions();

  /**
   * Scales a given size based on the current font scale.
   * Useful for font sizes, but also for padding, margin, etc.
   * that should scale with the text.
   */
  const scale = (size: number) => size * fontScale;

  return { fontScale, scale };
};
