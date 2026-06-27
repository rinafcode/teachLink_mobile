import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ShimmerItem as Skeleton } from '../common/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CourseViewerSkeletonProps {
  isDark?: boolean;
}

export const CourseViewerSkeleton = ({ isDark = false }: CourseViewerSkeletonProps) => {
  const containerBg = isDark ? '#0f172a' : '#F0F1F5';
  const sectionBg = isDark ? '#1e293b' : '#FFFFFF';
  const borderCol = isDark ? '#334155' : '#E5E7EB';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <View style={[styles.header, { backgroundColor: sectionBg, borderBottomColor: borderCol }]}>
        <View style={styles.headerRow}>
          <Skeleton width={32} height={32} borderRadius={8} isDark={isDark} />
          <Skeleton width="60%" height={20} style={styles.headerTitle} isDark={isDark} />
          <Skeleton width={28} height={28} borderRadius={6} isDark={isDark} />
        </View>
        <Skeleton width="100%" height={6} borderRadius={3} style={styles.progressBar} isDark={isDark} />
        <Skeleton width={80} height={12} style={styles.progressText} isDark={isDark} />
      </View>
      <View style={[styles.tabBar, { backgroundColor: sectionBg, borderBottomColor: borderCol }]}>
        <Skeleton width="45%" height={38} borderRadius={0} isDark={isDark} />
        <Skeleton width="45%" height={38} borderRadius={0} isDark={isDark} />
      </View>
      <View style={styles.content}>
        <Skeleton
          width={SCREEN_WIDTH - 32}
          height={200}
          borderRadius={12}
          style={styles.contentBlock}
          isDark={isDark}
        />
        <Skeleton width="60%" height={18} style={styles.sectionTitle} isDark={isDark} />
        <Skeleton width="100%" height={14} style={styles.contentLine} isDark={isDark} />
        <Skeleton width="95%" height={14} style={styles.contentLine} isDark={isDark} />
        <Skeleton width="80%" height={14} style={styles.contentLine} isDark={isDark} />
        <Skeleton width="90%" height={14} style={styles.contentLine} isDark={isDark} />
      </View>
      <View style={[styles.bottomBar, { backgroundColor: sectionBg, borderTopColor: borderCol }]}>
        <Skeleton width={SCREEN_WIDTH / 2 - 24} height={44} borderRadius={10} isDark={isDark} />
        <Skeleton width={SCREEN_WIDTH / 2 - 24} height={44} borderRadius={10} isDark={isDark} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    borderBottomWidth: 1,
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
    borderTopWidth: 1,
  },
});

export default CourseViewerSkeleton;
