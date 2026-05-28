import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';

import { SwipeableRow } from './SwipeableRow';
import { useBookmarkStore } from '../../store/bookmarkStore';

export const BookmarkList = () => {
  const { bookmarks, removeBookmark } = useBookmarkStore();
  const router = useRouter();

  const handleArchive = (itemId: string) => {
    Alert.alert('Archive Bookmark', 'Bookmark has been successfully archived.', [
      { text: 'OK', onPress: () => removeBookmark(itemId) },
    ]);
  };

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
