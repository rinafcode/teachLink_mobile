import { MetricsDashboard } from '@/src/components/mobile/MetricsDashboard';
import { useDashboardMetrics } from '@/src/hooks/useDashboardMetrics';
import { useMetricsStore } from '@/src/store/metricsStore';
import type { DashboardRole } from '@/src/store/metricsStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText as Text } from '@/src/components/common/AppText';

const ROLE_OPTIONS: { label: string; value: DashboardRole | null }[] = [
  { label: 'My Role', value: null },
  { label: 'Admin', value: 'admin' },
  { label: 'Instructor', value: 'instructor' },
  { label: 'Student', value: 'student' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const metrics = useDashboardMetrics();
  const { roleOverride, setRoleOverride, autoRefreshEnabled, setAutoRefresh } = useMetricsStore();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAutoRefresh(!autoRefreshEnabled)}
          style={[styles.autoRefreshToggle, autoRefreshEnabled && styles.autoRefreshActive]}
        >
          <Text style={[styles.autoRefreshText, autoRefreshEnabled && styles.autoRefreshTextActive]}>
            {autoRefreshEnabled ? '⏸ Pause' : '▶ Resume'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Role selector — lets team members preview other views */}
      <View style={styles.roleSelector}>
        <Text style={styles.roleSelectorLabel}>View as:</Text>
        {ROLE_OPTIONS.map((opt) => {
          const isActive = roleOverride === opt.value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => setRoleOverride(opt.value)}
              style={[styles.roleChip, isActive && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipText, isActive && styles.roleChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <MetricsDashboard metrics={metrics} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
  },
  autoRefreshToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  autoRefreshActive: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  autoRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  autoRefreshTextActive: {
    color: '#15803d',
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  roleSelectorLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginRight: 2,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  roleChipActive: {
    borderColor: '#19c3e6',
    backgroundColor: '#e0f7fb',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleChipTextActive: {
    color: '#0c7a8a',
  },
});
