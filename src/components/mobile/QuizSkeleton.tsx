import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const QuizSkeleton = () => {
  return (
    <View style={styles.container}>
      <Skeleton width={40} height={40} borderRadius={8} style={styles.backButton} />
      <Skeleton width="70%" height={28} style={styles.title} />
      <Skeleton width="90%" height={16} style={styles.subtitle} />
      <Skeleton width="100%" height={6} borderRadius={3} style={styles.progressBar} />
      <View style={styles.statsRow}>
        <Skeleton width={100} height={14} />
        <Skeleton width={80} height={14} />
      </View>
      <Skeleton width={SCREEN_WIDTH - 32} height={180} borderRadius={16} style={styles.questionCard} />
      <View style={styles.optionsBlock}>
        <Skeleton width="100%" height={52} borderRadius={12} style={styles.option} />
        <Skeleton width="100%" height={52} borderRadius={12} style={styles.option} />
        <Skeleton width="100%" height={52} borderRadius={12} style={styles.option} />
        <Skeleton width="100%" height={52} borderRadius={12} style={styles.option} />
      </View>
      <Skeleton width={SCREEN_WIDTH - 32} height={48} borderRadius={12} style={styles.ctaButton} />
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
  backButton: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 20,
  },
  progressBar: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  questionCard: {
    marginBottom: 24,
  },
  optionsBlock: {
    gap: 12,
    marginBottom: 32,
  },
  option: {},
  ctaButton: {
    marginBottom: 24,
  },
});
