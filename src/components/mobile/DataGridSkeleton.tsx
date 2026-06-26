import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';

export const DataGridSkeleton = () => {
  const renderRow = (index: number) => (
    <View key={`skeleton-row-${index}`} style={styles.row}>
      <Skeleton width={Math.random() > 0.3 ? 80 : 120} height={14} />
      <Skeleton width={Math.random() > 0.5 ? 60 : 100} height={14} />
      <Skeleton width={Math.random() > 0.4 ? 90 : 70} height={14} />
      <Skeleton width={100} height={14} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={34} borderRadius={8} />
      </View>
      <View style={styles.header}>
        <Skeleton width="20%" height={12} />
        <Skeleton width="20%" height={12} />
        <Skeleton width="20%" height={12} />
        <Skeleton width="20%" height={12} />
      </View>
      <View style={styles.filterRow}>
        <Skeleton width="100%" height={36} borderRadius={8} />
      </View>
      <View style={styles.body}>{Array.from({ length: 6 }, (_, i) => renderRow(i))}</View>
      <View style={styles.pagination}>
        <Skeleton width={60} height={14} />
        <Skeleton width={100} height={32} borderRadius={8} />
        <Skeleton width={60} height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterRow: {
    paddingVertical: 4,
  },
  body: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
});
