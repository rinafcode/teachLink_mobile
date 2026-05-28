import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppText as Text } from '../common/AppText';
import { useMetricsStore } from '../../store/metricsStore';
import type { DashboardMetrics, DashboardSection, MetricValue } from '../../hooks/useDashboardMetrics';
import type { DashboardAlert } from '../../store/metricsStore';

// ─── Status colours ──────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  ok: '#16a34a',
  warning: '#d97706',
  critical: '#dc2626',
  neutral: '#6b7280',
};

const ALERT_BG: Record<string, string> = {
  critical: '#fef2f2',
  warning: '#fffbeb',
  info: '#eff6ff',
};

const ALERT_BORDER: Record<string, string> = {
  critical: '#fca5a5',
  warning: '#fcd34d',
  info: '#93c5fd',
};

const ALERT_TEXT: Record<string, string> = {
  critical: '#991b1b',
  warning: '#92400e',
  info: '#1e40af',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function AlertBanner({ alert, onDismiss }: { alert: DashboardAlert; onDismiss: (id: string) => void }) {
  return (
    <View
      style={[
        styles.alertBanner,
        { backgroundColor: ALERT_BG[alert.severity], borderColor: ALERT_BORDER[alert.severity] },
      ]}
    >
      <Text style={[styles.alertText, { color: ALERT_TEXT[alert.severity] }]} numberOfLines={2}>
        {alert.severity === 'critical' ? '🚨 ' : alert.severity === 'warning' ? '⚠️ ' : 'ℹ️ '}
        {alert.message}
      </Text>
      <TouchableOpacity onPress={() => onDismiss(alert.id)} style={styles.dismissButton}>
        <Text style={[styles.dismissText, { color: ALERT_TEXT[alert.severity] }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function MetricCard({ metric }: { metric: MetricValue }) {
  const dotColor = STATUS_COLOR[metric.status] ?? STATUS_COLOR.neutral;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <Text style={styles.metricLabel} numberOfLines={1}>
          {metric.label}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: dotColor }]}>{metric.value}</Text>
      {metric.detail ? (
        <Text style={styles.metricDetail} numberOfLines={1}>
          {metric.detail}
        </Text>
      ) : null}
    </View>
  );
}

function SectionBlock({ section }: { section: DashboardSection }) {
  const pairs: MetricValue[][] = [];
  for (let i = 0; i < section.metrics.length; i += 2) {
    pairs.push(section.metrics.slice(i, i + 2));
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {pairs.map((pair, i) => (
        <View key={i} style={styles.metricRow}>
          {pair.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
          {pair.length === 1 && <View style={styles.metricCardSpacer} />}
        </View>
      ))}
    </View>
  );
}

// ─── Header bar ─────────────────────────────────────────────────────────────

function formatAge(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function HeaderBar({
  role,
  lastRefreshedAt,
  isAutoRefresh,
}: {
  role: string;
  lastRefreshedAt: number;
  isAutoRefresh: boolean;
}) {
  return (
    <View style={styles.headerBar}>
      <View>
        <Text style={styles.headerTitle}>Team Dashboard</Text>
        <Text style={styles.headerSub}>
          Updated {formatAge(lastRefreshedAt)}
          {'  '}
          <Text style={{ color: isAutoRefresh ? '#16a34a' : '#9ca3af' }}>
            {isAutoRefresh ? '● Live' : '○ Paused'}
          </Text>
        </Text>
      </View>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
      </View>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface MetricsDashboardProps {
  metrics: DashboardMetrics;
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const { dismissAlert } = useMetricsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    metrics.refresh();
    // Give a brief visual beat before clearing the spinner
    setTimeout(() => setRefreshing(false), 600);
  }, [metrics]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#19c3e6" />}
    >
      <HeaderBar
        role={metrics.role}
        lastRefreshedAt={metrics.lastRefreshedAt}
        isAutoRefresh={metrics.isAutoRefreshEnabled}
      />

      {/* Alert banners */}
      {metrics.alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {metrics.alerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} onDismiss={dismissAlert} />
          ))}
        </View>
      )}

      {metrics.alerts.length === 0 && (
        <View style={styles.healthyBanner}>
          <Text style={styles.healthyText}>✓  All metrics within normal range</Text>
        </View>
      )}

      {/* Metric sections */}
      {metrics.sections.map((section) => (
        <SectionBlock key={section.id} section={section} />
      ))}

      <Text style={styles.footer}>
        Pull to refresh  •  Auto-refresh every 30s
      </Text>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    paddingBottom: 40,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    letterSpacing: 0.5,
  },

  // Alerts
  alertsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissButton: {
    paddingHorizontal: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Healthy banner
  healthyBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  healthyText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  // Metric cards
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  metricCardSpacer: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  metricDetail: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
