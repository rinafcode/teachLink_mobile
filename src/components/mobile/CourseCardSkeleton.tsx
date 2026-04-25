import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '../ui/Skeleton';

export const CourseCardSkeleton = () => {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={10} style={styles.iconSkeleton} />
      <View style={styles.body}>
        <Skeleton width="80%" height={18} style={styles.titleSkeleton} />
        <Skeleton width="100%" height={14} style={styles.descSkeleton} />
        <View style={styles.metaRow}>
          <Skeleton width={60} height={12} />
          <Skeleton width={40} height={12} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconSkeleton: {
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  descSkeleton: {
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
