import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';

/**
 * Props for the BookmarkButton component
 */
interface BookmarkButtonProps {
  /** Whether the item is currently bookmarked */
  isBookmarked: boolean;
  /** Callback when the bookmark toggle is pressed */
  onToggle: () => void;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show the label text */
  showLabel?: boolean;
}

export default function BookmarkButton({
  isBookmarked,
  onToggle,
  isLoading = false,
  size = 'medium',
  showLabel = true,
}: BookmarkButtonProps) {
  const sizeConfig = {
    small: { iconSize: 18, padding: 8 },
    medium: { iconSize: 24, padding: 12 },
    large: { iconSize: 32, padding: 16 },
  };

  const config = sizeConfig[size];

  const backgroundColor = isBookmarked 
    ? '#fef3c7' // yellow-50
    : '#f3f4f6'; // gray-100

  const borderColor = isBookmarked
    ? '#facc15' // yellow-400
    : '#d1d5db'; // gray-300

  const textColor = isBookmarked
    ? '#b45309' // yellow-700
    : '#4b5563'; // gray-600

  const iconColor = isBookmarked
    ? '#eab308' // yellow-500
    : '#9ca3af'; // gray-400

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      accessibilityHint="Double tap to toggle lesson bookmark status"
      accessibilityState={{ disabled: isLoading, selected: isBookmarked, busy: isLoading }}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: 2,
          padding: config.padding,
          borderRadius: 24,
          opacity: isLoading ? 0.5 : 1,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={isBookmarked ? '#F59E0B' : '#19c3e6'} size="small" />
      ) : (
        <View style={styles.content}>
          <Text style={{ fontSize: config.iconSize }}>
            {isBookmarked ? '⭐' : '☆'}
          </Text>
          {showLabel && (
            <Text
              style={[
                styles.label,
                { color: textColor, marginLeft: 8 },
              ]}
            >
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
  },
});
