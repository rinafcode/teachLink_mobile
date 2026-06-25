/**
 * DashboardSkeleton — loading state for the TeamDashboard.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '../../ui/Skeleton';

interface DashboardSkeletonProps {
  isDark?: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ isDark = false }) => {
  const bg = isDark ? '#0f172a' : '#f8fafc';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width="45%" height={24} borderRadius={6} />
        <Skeleton width="20%" height={32} borderRadius={8} />
      </View>

      {/* View tabs */}
      <View style={styles.tabs}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={72} height={32} borderRadius={16} />
        ))}
      </View>

      {/* Health ring + cards row */}
      <View style={styles.topRow}>
        <Skeleton width={120} height={120} borderRadius={60} />
        <View style={styles.cardsColumn}>
          <Skeleton width="100%" height={70} borderRadius={12} />
          <Skeleton width="100%" height={70} borderRadius={12} />
        </View>
      </View>

      {/* Metric grid */}
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="48%" height={90} borderRadius={12} />
        ))}
      </View>

      {/* Alerts section */}
      <Skeleton width="35%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={56} borderRadius={10} />
      <Skeleton width="100%" height={56} borderRadius={10} style={{ marginTop: 8 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardsColumn: {
    flex: 1,
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default DashboardSkeleton;
