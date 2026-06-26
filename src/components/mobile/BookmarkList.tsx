import { useRouter } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { FlatList, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';

import { SwipeableRow } from './SwipeableRow';
import { useBookmarkStore } from '../../store/bookmarkStore';

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

  if (bookmarks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>☆</Text>
        <Text style={styles.emptyTitle}>No bookmarks yet</Text>
        <Text style={styles.emptySubtitle}>Items you bookmark will appear here.</Text>
      </View>
    );
  }

  return (
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
  );
};

export default BookmarkList;

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
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
