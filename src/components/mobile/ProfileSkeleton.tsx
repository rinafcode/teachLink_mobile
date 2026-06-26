import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardSkeleton } from './CourseCardSkeleton';
import { Skeleton } from '../ui/Skeleton';

export const ProfileSkeleton = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading profile"
    >
      <Skeleton width={96} height={96} circle style={{ marginBottom: 16 }} />
      <Skeleton width="50%" height={24} style={{ marginBottom: 8 }} />
      <Skeleton width="35%" height={16} style={{ marginBottom: 24 }} />
      <View style={styles.statsRow}>
        <Skeleton width="28%" height={56} borderRadius={12} />
        <Skeleton width="28%" height={56} borderRadius={12} />
        <Skeleton width="28%" height={56} borderRadius={12} />
      </View>
      <View style={styles.cards}>
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  cards: {
    width: '100%',
    gap: 12,
  },
});
