import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SubscriptionSkeleton = () => {
  const renderPlanCard = () => (
    <View style={styles.planCard}>
      <Skeleton width="100%" height={60} borderRadius={0} />
      <View style={styles.planFeatures}>
        <Skeleton width="80%" height={14} style={styles.featureRow} />
        <Skeleton width="70%" height={14} style={styles.featureRow} />
        <Skeleton width="85%" height={14} style={styles.featureRow} />
        <Skeleton width="60%" height={14} style={styles.featureRow} />
      </View>
      <Skeleton width="100%" height={44} borderRadius={10} style={styles.cta} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Skeleton width={160} height={24} style={styles.headerTitle} />
      <Skeleton width={260} height={14} style={styles.headerSubtitle} />
      <View style={styles.currentPlanBanner}>
        <Skeleton width={SCREEN_WIDTH - 32} height={60} borderRadius={14} />
      </View>
      <Skeleton width={100} height={14} style={styles.sectionLabel} />
      <View style={styles.toggleRow}>
        <Skeleton width={180} height={36} borderRadius={18} />
      </View>
      <Skeleton width={100} height={14} style={styles.sectionLabel} />
      {renderPlanCard()}
      {renderPlanCard()}
      <View style={styles.footer}>
        <Skeleton width={200} height={40} borderRadius={8} />
        <Skeleton width="90%" height={12} style={styles.legalText} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    marginBottom: 6,
  },
  headerSubtitle: {
    marginBottom: 24,
  },
  currentPlanBanner: {
    marginBottom: 28,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  toggleRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  planFeatures: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  featureRow: {},
  cta: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  legalText: {
    marginTop: 4,
  },
});
