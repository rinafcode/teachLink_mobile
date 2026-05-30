import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CourseViewerSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <Skeleton width="60%" height={20} style={styles.headerTitle} />
          <Skeleton width={28} height={28} borderRadius={6} />
        </View>
        <Skeleton width="100%" height={6} borderRadius={3} style={styles.progressBar} />
        <Skeleton width={80} height={12} style={styles.progressText} />
      </View>
      <View style={styles.tabBar}>
        <Skeleton width="45%" height={38} borderRadius={0} />
        <Skeleton width="45%" height={38} borderRadius={0} />
      </View>
      <View style={styles.content}>
        <Skeleton
          width={SCREEN_WIDTH - 32}
          height={200}
          borderRadius={12}
          style={styles.contentBlock}
        />
        <Skeleton width="60%" height={18} style={styles.sectionTitle} />
        <Skeleton width="100%" height={14} style={styles.contentLine} />
        <Skeleton width="95%" height={14} style={styles.contentLine} />
        <Skeleton width="80%" height={14} style={styles.contentLine} />
        <Skeleton width="90%" height={14} style={styles.contentLine} />
      </View>
      <View style={styles.bottomBar}>
        <Skeleton width={SCREEN_WIDTH / 2 - 24} height={44} borderRadius={10} />
        <Skeleton width={SCREEN_WIDTH / 2 - 24} height={44} borderRadius={10} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F1F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
  },
  progressBar: {
    marginBottom: 6,
  },
  progressText: {},
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 14,
  },
  contentLine: {
    marginBottom: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
