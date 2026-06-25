import { useRouter } from 'expo-router';
<<<<<<< HEAD
import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
=======
import React, { memo, useCallback } from 'react';
import { FlatList, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
>>>>>>> upstream/main

import { SwipeableRow } from './SwipeableRow';
import { VirtualList } from './VirtualList';
import { useBookmarkStore } from '../../store/bookmarkStore';

<<<<<<< HEAD
import type { ListRenderItemInfo } from 'react-native';

/**
 * Fixed row height (card height + bottom spacing). Because every bookmark row is
 * the same height we can pass `itemHeight` to VirtualList, which enables
 * getItemLayout for O(1) scroll-to-index and jank-free scrolling.
 */
const BOOKMARK_ITEM_HEIGHT = 88;

// Keep the row type in sync with the store automatically.
type Bookmark = ReturnType<typeof useBookmarkStore>['bookmarks'][number];

/**
 * PERFORMANCE NOTES (issue #219)
 * --------------------------------------------------------------------------
 * Before: a <ScrollView> mapped over every bookmark, so all rows mounted at
 * once. With hundreds/thousands of saved items that means high memory use and
 * dropped frames while scrolling.
 *
 * After: the shared <VirtualList> (a tuned FlatList) renders only the rows near
 * the viewport and recycles them on scroll. This keeps memory flat and holds
 * ~60fps regardless of how many bookmarks the user has saved.
 */
=======
interface BookmarkItemProps {
  item: { itemId: string; title: string; itemType: string; url: string };
  onPress: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

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
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardType}>{item.itemType}</Text>
      </TouchableOpacity>
    </SwipeableRow>
  );
});

>>>>>>> upstream/main
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
<<<<<<< HEAD
=======

  const renderItem = useCallback(
    ({ item }: { item: (typeof bookmarks)[number] }) => (
      <BookmarkItem
        item={item}
        onPress={() => router.push(item.url as any)}
        onDelete={() => removeBookmark(item.itemId)}
        onArchive={() => handleArchive(item.itemId)}
      />
    ),
    [router, removeBookmark, handleArchive]
  );
>>>>>>> upstream/main

  // Stable key per row so FlatList can recycle rows efficiently.
  const keyExtractor = useCallback((item: Bookmark) => item.itemId, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Bookmark>) => (
      <SwipeableRow
        id={item.itemId}
        onDelete={() => removeBookmark(item.itemId)}
        onArchive={() => handleArchive(item.itemId)}
        deleteLabel="Delete"
        archiveLabel="Archive"
      >
        <TouchableOpacity
          testID={`bookmark-item-${item.itemId}`}
          style={styles.card}
          onPress={() => router.push(item.url as any)}
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
    ),
    [handleArchive, removeBookmark, router]
  );

  return (
<<<<<<< HEAD
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
          <Text style={styles.emptySubtitle}>Items you bookmark will appear here.</Text>
        </View>
      }
    />
=======
    <FlatList
      data={bookmarks}
      renderItem={renderItem}
      keyExtractor={item => item.itemId}
      contentContainerStyle={styles.list}
    />
    <ScrollView contentContainerStyle={styles.list} removeClippedSubviews={true}>
      {bookmarks.map(item => (
        <SwipeableRow
          key={item.itemId}
          id={item.itemId}
          onDelete={() => removeBookmark(item.itemId)}
          onArchive={() => handleArchive(item.itemId)}
          deleteLabel="Delete"
          archiveLabel="Archive"
        >
          <TouchableOpacity
            testID={`bookmark-item-${item.itemId}`}
            style={styles.card}
            onPress={() => router.push(item.url as any)}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel={item.title}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardType}>{item.itemType}</Text>
          </TouchableOpacity>
        </SwipeableRow>
      ))}
    </ScrollView>
>>>>>>> upstream/main
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
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cardType: { fontSize: 12, color: '#64748b', marginTop: 4, textTransform: 'capitalize' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
