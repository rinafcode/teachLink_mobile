import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardSkeleton } from './CourseCardSkeleton';
import { Skeleton } from '../ui/Skeleton';

export const SearchScreenSkeleton = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading search"
    >
      <View style={styles.searchBarRow}>
        <Skeleton width="100%" height={50} borderRadius={25} />
      </View>
      <CourseCardSkeleton />
      <CourseCardSkeleton />
      <CourseCardSkeleton />
      <CourseCardSkeleton />
      <CourseCardSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    alignItems: 'center',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
});
