import { useRouter } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SwipeableRow } from './SwipeableRow';
import { VirtualList } from './VirtualList';
import { useBookmarkStore } from '../../store/bookmarkStore';

import type { ListRenderItemInfo } from 'react-native';

/**
 * Fixed row height for virtualization
 */
const BOOKMARK_ITEM_HEIGHT = 88;

type Bookmark = ReturnType<typeof useBookmarkStore>['bookmarks'][number];

interface BookmarkItemProps {
  item: Bookmark;
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

/**
 * Memoized row component for better performance
 */
const BookmarkItem = memo(function BookmarkItem({
  item,
  onPress,
  onDelete,
  onArchive,
}: BookmarkItemProps) {
  return (
    <SwipeableRow
      id={item.itemId}
      onDelete={onDelete}
      onArchive={onArchive}
      deleteLabel="Delete"
      archiveLabel="Archive"
    >
      <TouchableOpacity
        testID={`bookmark-item-${item.itemId}`}
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="link"
        accessibilityLabel={item.title}
      >
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardType} numberOfLines={1}>
          {item.itemType}
        </Text>
      </TouchableOpacity>
    </SwipeableRow>
  );
});

export const BookmarkList = () => {
  const { bookmarks, removeBookmark } = useBookmarkStore();
  const router = useRouter();

  const handleArchive = useCallback(
    (itemId: string) => {
      Alert.alert('Archive Bookmark', 'Bookmark has been successfully archived.', [
        { text: 'OK', onPress: () => removeBookmark(itemId) },
      ]);
    },
    [removeBookmark]
  );

  const keyExtractor = useCallback((item: Bookmark) => item.itemId, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Bookmark>) => (
      <BookmarkItem
        item={item}
        onPress={() => router.push(item.url as any)}
        onDelete={() => removeBookmark(item.itemId)}
        onArchive={() => handleArchive(item.itemId)}
      />
    ),
    [router, removeBookmark, handleArchive]
  );

  return (
    <VirtualList<Bookmark>
      data={bookmarks}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      itemHeight={BOOKMARK_ITEM_HEIGHT}
      listId="BookmarkList"
      contentContainerStyle={styles.list}
      testID="bookmark-list"
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>☆</Text>
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptySubtitle}>
            Items you bookmark will appear here.
          </Text>
        </View>
      }
    />
  );
};

export default BookmarkList;

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingVertical: 16 },

  card: {
    height: 78,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },

  cardType: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
