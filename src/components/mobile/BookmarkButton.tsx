import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';

import { useBookmarkStore, BookmarkItem } from '../../store/bookmarkStore';

interface BookmarkButtonProps {
  item: BookmarkItem;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function BookmarkButton({ item, size = 'medium', showLabel = true }: BookmarkButtonProps) {
  const { isBookmarked, addBookmark, removeBookmark, isLoading } = useBookmarkStore();
  const bookmarked = isBookmarked(item.itemId);

  const sizeConfig = {
    small: { iconSize: 18, padding: 8 },
    medium: { iconSize: 24, padding: 12 },
    large: { iconSize: 32, padding: 16 },
  };
  const config = sizeConfig[size];

  const handleToggle = async () => {
    if (bookmarked) {
      await removeBookmark(item.itemId);
    } else {
      await addBookmark(item);
    }
  };

  const backgroundColor = bookmarked ? '#fef3c7' : '#f3f4f6';
  const borderColor = bookmarked ? '#facc15' : '#d1d5db';
  const textColor = bookmarked ? '#b45309' : '#4b5563';

  return (
    <TouchableOpacity
      testID="bookmark-button"
      onPress={handleToggle}
      disabled={isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      accessibilityHint="Double tap to toggle bookmark"
      accessibilityState={{ disabled: isLoading, selected: bookmarked, busy: isLoading }}
      style={[styles.button, { backgroundColor, borderColor, padding: config.padding, opacity: isLoading ? 0.5 : 1 }]}
    >
      {isLoading ? (
        <ActivityIndicator color={bookmarked ? '#F59E0B' : '#19c3e6'} size="small" />
      ) : (
        <View style={styles.content}>
          <Text style={{ fontSize: config.iconSize }}>{bookmarked ? '⭐' : '☆'}</Text>
          {showLabel && (
            <Text style={[styles.label, { color: textColor }]}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
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
    borderWidth: 2,
    borderRadius: 24,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', fontSize: 14, marginLeft: 8 },
});
