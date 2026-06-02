import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseCardSkeleton } from './CourseCardSkeleton';
import { Skeleton } from '../ui/Skeleton';

export const HomeScreenSkeleton = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading home screen"
    >
      <View style={styles.header}>
        <Skeleton width={60} height={60} circle style={{ marginBottom: 16 }} />
        <Skeleton width="60%" height={28} style={{ marginBottom: 12 }} />
        <Skeleton width="40%" height={16} />
      </View>
      <View style={styles.body}>
        <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 20 }} />
        <CourseCardSkeleton />
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  body: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 24,
  },
});
