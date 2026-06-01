import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/common/AppText';

export const QRScannerSkeleton = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Opening camera scanner"
    >
      <ActivityIndicator size="large" color="#19c3e6" />
      <Text style={styles.label}>Preparing scanner…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  label: {
    marginTop: 16,
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
});
