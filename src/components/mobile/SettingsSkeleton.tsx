import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { Skeleton } from '../ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SettingsSkeleton = () => {
  const renderSection = () => (
    <View style={styles.section}>
      <Skeleton width={100} height={14} style={styles.sectionLabel} />
      {renderRow()}
      {renderRow()}
      {renderRow()}
    </View>
  );

  const renderRow = () => (
    <View style={styles.row}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <Skeleton width="55%" height={14} style={styles.rowLabel} />
      <Skeleton width={46} height={26} borderRadius={13} style={styles.rowToggle} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Skeleton width={120} height={24} style={styles.headerTitle} />
      {renderSection()}
      {renderSection()}
      {renderSection()}
      <View style={styles.signOutArea}>
        <Skeleton width={SCREEN_WIDTH - 32} height={48} borderRadius={12} />
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
    gap: 20,
  },
  headerTitle: {
    marginBottom: 4,
  },
  section: {
    gap: 2,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
  },
  rowToggle: {
    marginLeft: 'auto',
  },
  signOutArea: {
    marginTop: 8,
  },
});
