import { AccessibilityInfo, Platform } from 'react-native';


export const combineAriaLabels = (...labels: (string | undefined | null)[]): string => {
  return labels.filter(Boolean).join(', ');
};

/**
 * Announces a message to the screen reader.
 */
export const announceToScreenReader = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

/**
 * Returns accessibility props for interactive elements.
 */
export const getAccessibilityProps = (
  label: string,
  role: 'button' | 'link' | 'image' | 'header' | 'none' = 'button',
  hint?: string,
  state?: { disabled?: boolean; selected?: boolean; checked?: boolean }
) => {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: role as any,
    accessibilityHint: hint,
    accessibilityState: state,
    ...(Platform.OS === 'android' ? { importantForAccessibility: 'yes' as const } : {}),
  };
};
