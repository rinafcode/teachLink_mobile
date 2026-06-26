import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '../../ui/Skeleton';

interface TopicFeedSkeletonProps {
  count?: number;
}

const TopicFeedCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton width={44} height={44} borderRadius={12} style={styles.icon} />
    <View style={styles.body}>
      <Skeleton width="75%" height={16} style={styles.mb4} />
      <Skeleton width="100%" height={13} style={styles.mb4} />
      <Skeleton width="90%" height={13} style={styles.mb8} />
      <View style={styles.metaRow}>
        <Skeleton width={64} height={20} borderRadius={20} />
        <Skeleton width={50} height={12} />
        <Skeleton width={36} height={12} />
      </View>
      <Skeleton width={80} height={12} style={styles.mt6} />
    </View>
  </View>
);

export const TopicFeedSkeleton = ({ count = 4 }: TopicFeedSkeletonProps) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <TopicFeedCardSkeleton key={i} />
    ))}
  </>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  icon: {
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mt6: {
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
