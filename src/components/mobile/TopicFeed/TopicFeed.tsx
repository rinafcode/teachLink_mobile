import { AlertCircle } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TopicFeedCard, TopicFeedItem } from './TopicFeedCard';
import { TopicFeedSkeleton } from './TopicFeedSkeleton';
import { useTopicFeed, UseTopicFeedOptions } from '../../../hooks/useTopicFeed';

export interface TopicFeedProps extends UseTopicFeedOptions {
  onItemPress?: (item: TopicFeedItem) => void;
  /** Optional header rendered above the list */
  ListHeaderComponent?: React.ReactElement;
}

export const TopicFeed = ({ onItemPress, ListHeaderComponent, ...feedOptions }: TopicFeedProps) => {
  const { items, loading, refreshing, hasMore, error, refresh, loadMore } =
    useTopicFeed(feedOptions);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TopicFeedItem>) => (
      <TopicFeedCard item={item} onPress={onItemPress ?? (() => {})} />
    ),
    [onItemPress]
  );

  const keyExtractor = useCallback((item: TopicFeedItem) => item.id, []);

  const renderFooter = useCallback(
    () =>
      hasMore ? (
        <View style={styles.footer} accessibilityLabel="Loading more topics">
          <ActivityIndicator size="small" color="#19c3e6" />
        </View>
      ) : null,
    [hasMore]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <TopicFeedSkeleton count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorWrap} accessibilityRole="alert">
        <AlertCircle size={32} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading topics"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={<Text style={styles.emptyText}>No topics found.</Text>}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshing={refreshing}
      onRefresh={refresh}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#19c3e6',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 40,
  },
});
