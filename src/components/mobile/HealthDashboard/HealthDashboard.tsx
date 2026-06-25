/**
 * HealthDashboard — main dashboard component.
 *
 * Composes MetricCard, LatencyBar, AlertBanner, DashboardHeader, and
 * ThresholdEditor into a scrollable real-time health view.
 *
 * Data is driven by useHealthDashboard which polls healthMetricsService
 * on a configurable interval.
 */

import React from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from './AlertBanner';
import { DashboardHeader } from './DashboardHeader';
import { LatencyBar } from './LatencyBar';
import { MetricCard } from './MetricCard';
import { ThresholdEditor } from './ThresholdEditor';
import { useHealthDashboard } from '../../../hooks/useHealthDashboard';

import type { AlertSeverity, HealthSnapshot } from '../../../services/healthMetrics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function crashSeverity(rate: number, warn: number, crit: number): AlertSeverity {
  if (rate >= crit) return 'critical';
  if (rate >= warn) return 'warning';
  return 'ok';
}

function latencySeverity(p95: number, warn: number, crit: number): AlertSeverity {
  if (p95 >= crit) return 'critical';
  if (p95 >= warn) return 'warning';
  return 'ok';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <View style={skeletonStyles.card} />
);

const LoadingSkeleton: React.FC = () => (
  <View style={skeletonStyles.container}>
    <View style={skeletonStyles.row}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <View style={skeletonStyles.row}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
    <View style={skeletonStyles.wide} />
  </View>
);

const skeletonStyles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: '47%',
    height: 90,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  wide: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export const HealthDashboard: React.FC = () => {
  const {
    snapshot,
    alerts,
    thresholds,
    status,
    lastUpdated,
    isAutoRefresh,
    overallStatus,
    refresh,
    dismissAlert,
    setThresholds,
    toggleAutoRefresh,
  } = useHealthDashboard();

  const isRefreshing = status === 'polling';

  const renderContent = (snap: HealthSnapshot) => (
    <>
      {/* ── Alerts section ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>
          {alerts.map((alert) => (
            <AlertBanner key={alert.id} alert={alert} onDismiss={dismissAlert} />
          ))}
        </View>
      )}

      {/* ── Crash & Error metrics ───────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stability</Text>
        <View style={styles.cardRow}>
          <MetricCard
            label="Crash Rate"
            value={snap.crashRate}
            unit="%"
            subValue={`${snap.crashCount} crashes`}
            severity={crashSeverity(snap.crashRate, thresholds.crashRateWarning, thresholds.crashRateCritical)}
            icon="💥"
          />
          <MetricCard
            label="Error Rate"
            value={snap.errorRatePerMinute.toFixed(1)}
            unit="/min"
            subValue={`${snap.errorCount} in window`}
            severity={
              snap.errorRatePerMinute >= thresholds.errorRateCritical
                ? 'critical'
                : snap.errorRatePerMinute >= thresholds.errorRateWarning
                ? 'warning'
                : 'ok'
            }
            icon="⚠️"
          />
        </View>
      </View>

      {/* ── API metrics ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Health</Text>
        <LatencyBar
          p50={snap.apiLatencyP50}
          p95={snap.apiLatencyP95}
          p99={snap.apiLatencyP99}
          warningMs={thresholds.apiLatencyWarning}
          criticalMs={thresholds.apiLatencyCritical}
        />
        <View style={styles.cardRow}>
          <MetricCard
            label="API Calls"
            value={snap.apiCallCount}
            subValue="in 5-min window"
            icon="📡"
          />
          <MetricCard
            label="API Error Rate"
            value={snap.apiErrorRate}
            unit="%"
            subValue={`${snap.apiErrorCount} errors`}
            severity={
              snap.apiErrorRate >= thresholds.apiErrorRateCritical
                ? 'critical'
                : snap.apiErrorRate >= thresholds.apiErrorRateWarning
                ? 'warning'
                : 'ok'
            }
            icon="🔴"
          />
        </View>
      </View>

      {/* ── Sessions ────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        <View style={styles.cardRow}>
          <MetricCard
            label="Active Sessions"
            value={snap.activeSessions}
            subValue="current"
            icon="👥"
          />
          <MetricCard
            label="Network"
            value={snap.isOnline ? 'Online' : 'Offline'}
            subValue={snap.networkType}
            severity={snap.isOnline ? 'ok' : 'critical'}
            icon="🌐"
          />
        </View>
      </View>

      {/* ── Performance ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.cardRow}>
          <MetricCard
            label="FPS"
            value={snap.fps}
            subValue="estimated"
            severity={snap.fps < 30 ? 'critical' : snap.fps < 50 ? 'warning' : 'ok'}
            icon="🎞️"
          />
          <MetricCard
            label="JS Busy"
            value={`${(snap.jsBusyRatio * 100).toFixed(0)}`}
            unit="%"
            subValue="thread load"
            severity={
              snap.jsBusyRatio > 0.8
                ? 'critical'
                : snap.jsBusyRatio > 0.5
                ? 'warning'
                : 'ok'
            }
            icon="⚙️"
          />
        </View>
      </View>

      {/* ── Threshold editor ────────────────────────────────────────────── */}
      <View style={styles.section}>
        <ThresholdEditor thresholds={thresholds} onChange={setThresholds} />
      </View>

      {/* Bottom spacer */}
      <View style={styles.bottomSpacer} />
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <DashboardHeader
        overallStatus={overallStatus}
        lastUpdated={lastUpdated}
        isPolling={isRefreshing}
        isAutoRefresh={isAutoRefresh}
        onRefresh={refresh}
        onToggleAutoRefresh={toggleAutoRefresh}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#3b82f6"
            title="Refreshing metrics…"
          />
        }
      >
        {snapshot ? renderContent(snapshot) : <LoadingSkeleton />}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default HealthDashboard;
