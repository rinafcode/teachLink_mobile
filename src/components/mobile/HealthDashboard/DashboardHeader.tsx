/**
 * DashboardHeader — top bar for the health dashboard.
 *
 * Shows overall status badge, last-updated time, auto-refresh toggle,
 * and a manual refresh button.
 */

import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type OverallStatus = 'ok' | 'warning' | 'critical';

interface DashboardHeaderProps {
  overallStatus: OverallStatus;
  lastUpdated: number | null;
  isPolling: boolean;
  isAutoRefresh: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
}

const STATUS_CONFIG: Record<OverallStatus, { label: string; bg: string; text: string }> = {
  ok: { label: 'Healthy', bg: '#dcfce7', text: '#15803d' },
  warning: { label: 'Warning', bg: '#fef9c3', text: '#a16207' },
  critical: { label: 'Critical', bg: '#fee2e2', text: '#b91c1c' },
};

function formatTime(ts: number | null): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  overallStatus,
  lastUpdated,
  isPolling,
  isAutoRefresh,
  onRefresh,
  onToggleAutoRefresh,
}) => {
  const cfg = STATUS_CONFIG[overallStatus];

  return (
    <View style={styles.container}>
      {/* Title + status badge */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>App Health</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        {/* Last updated */}
        <View style={styles.updatedRow}>
          {isPolling ? (
            <ActivityIndicator size="small" color="#94a3b8" style={styles.spinner} />
          ) : null}
          <Text style={styles.updatedText}>Updated {formatTime(lastUpdated)}</Text>
        </View>

        {/* Auto-refresh toggle */}
        <TouchableOpacity
          onPress={onToggleAutoRefresh}
          style={[styles.toggleBtn, isAutoRefresh && styles.toggleBtnActive]}
          accessibilityRole="switch"
          accessibilityState={{ checked: isAutoRefresh }}
          accessibilityLabel="Toggle auto-refresh"
        >
          <Text style={[styles.toggleText, isAutoRefresh && styles.toggleTextActive]}>
            {isAutoRefresh ? '⏸ Auto' : '▶ Auto'}
          </Text>
        </TouchableOpacity>

        {/* Manual refresh */}
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          accessibilityRole="button"
          accessibilityLabel="Refresh metrics now"
          disabled={isPolling}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updatedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 6,
  },
  updatedText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#2563eb',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontSize: 18,
    color: '#475569',
  },
});

export default DashboardHeader;
