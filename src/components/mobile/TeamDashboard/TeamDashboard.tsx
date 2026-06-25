/**
 * TeamDashboard — Issue #390
 *
 * Real-time team visibility dashboard showing app health, performance metrics,
 * error rates, and user metrics. Supports role-based customisable views.
 *
 * UI-only tests are deferred (floating, data-driven dashboards with mocked
 * intervals are low-value in snapshot tests — see docs/metrics-dashboard.md).
 */

import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardMetrics } from '../../../hooks/useDashboardMetrics';
import type { DashboardAlert } from '../../../services/metricsService';
import type { DashboardView } from '../../../store/metricsStore';
import { AppText as Text } from '../../common/AppText';
import { AlertBanner } from './AlertBanner';
import { DashboardSkeleton } from './DashboardSkeleton';
import { HealthScoreRing } from './HealthScoreRing';
import { MetricCard } from './MetricCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── View Tab config ──────────────────────────────────────────────────────────

const VIEW_TABS: { key: DashboardView; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'performance', label: 'Perf', icon: '⚡' },
  { key: 'errors', label: 'Errors', icon: '🚨' },
  { key: 'users', label: 'Users', icon: '👥' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamDashboardProps {
  isDark?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ isDark = false }) => {
  const {
    snapshot,
    isRefreshing,
    error,
    activeView,
    autoRefreshEnabled,
    setActiveView,
    setAutoRefresh,
    refresh,
    alerts,
  } = useDashboardMetrics();

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  }, []);

  const visibleAlerts = alerts.filter((a: DashboardAlert) => !dismissedAlerts.has(a.id));

  // Theme tokens
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const tabActiveColor = '#19c3e6';
  const tabInactiveColor = isDark ? '#475569' : '#94a3b8';

  // ── Empty / loading state ──────────────────────────────────────────────────
  if (!snapshot && isRefreshing) {
    return <DashboardSkeleton isDark={isDark} />;
  }

  if (!snapshot) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.emptyState}>
          {error ? (
            <>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                Failed to load metrics
              </Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { borderColor: tabActiveColor }]}
                onPress={refresh}
                accessibilityRole="button"
                accessibilityLabel="Retry loading metrics"
              >
                <Text style={[styles.retryButtonText, { color: tabActiveColor }]}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No data yet</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                Pull to refresh to collect metrics.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { appHealth, performance, errorRate, userMetrics } = snapshot;

  // ── Section renderers ──────────────────────────────────────────────────────

  const renderOverview = () => (
    <>
      {/* Health ring + key health cards */}
      <View
        style={[styles.healthRow, { backgroundColor: cardBg, borderColor }]}
        accessibilityLabel="App health overview"
      >
        <HealthScoreRing
          score={appHealth.healthScore}
          status={appHealth.status}
          isDark={isDark}
          size={120}
        />
        <View style={styles.healthCards}>
          <MetricCard
            label="Uptime"
            value={`${appHealth.uptimePercent}%`}
            status={appHealth.uptimePercent >= 99 ? 'healthy' : appHealth.uptimePercent >= 95 ? 'warning' : 'critical'}
            icon="🟢"
            isDark={isDark}
          />
          <MetricCard
            label="Session Errors"
            value={appHealth.errorCount}
            status={appHealth.errorCount === 0 ? 'healthy' : appHealth.errorCount < 5 ? 'warning' : 'critical'}
            icon="🐛"
            isDark={isDark}
          />
        </View>
      </View>

      {/* Quick stats grid */}
      <View style={styles.grid}>
        <MetricCard
          label="Avg API Time"
          value={performance.avgApiResponseMs > 0 ? `${performance.avgApiResponseMs}ms` : 'N/A'}
          status={
            performance.avgApiResponseMs === 0
              ? 'neutral'
              : performance.avgApiResponseMs < 500
              ? 'healthy'
              : performance.avgApiResponseMs < 2000
              ? 'warning'
              : 'critical'
          }
          icon="🌐"
          isDark={isDark}
        />
        <MetricCard
          label="Errors/min"
          value={errorRate.errorsPerMinute}
          status={
            errorRate.errorsPerMinute === 0
              ? 'healthy'
              : errorRate.errorsPerMinute < 5
              ? 'warning'
              : 'critical'
          }
          subLabel={errorRate.trend === 'improving' ? '↓ improving' : errorRate.trend === 'degrading' ? '↑ degrading' : '→ stable'}
          icon="📈"
          isDark={isDark}
        />
        <MetricCard
          label="Memory Usage"
          value={
            performance.usedHeapBytes > 0 ? formatBytes(performance.usedHeapBytes) : 'N/A'
          }
          status={
            performance.heapUtilPercent === 0
              ? 'neutral'
              : performance.heapUtilPercent < 60
              ? 'healthy'
              : performance.heapUtilPercent < 80
              ? 'warning'
              : 'critical'
          }
          icon="💾"
          isDark={isDark}
        />
        <MetricCard
          label="Active Sessions"
          value={userMetrics.activeSessions}
          status="neutral"
          icon="👥"
          isDark={isDark}
        />
      </View>
    </>
  );

  const renderPerformance = () => (
    <View style={styles.grid}>
      <MetricCard
        label="Frame Time"
        value={`${performance.avgFrameTimeMs}ms`}
        subLabel={performance.avgFrameTimeMs <= 16 ? '60fps target met' : 'Below 60fps'}
        status={performance.avgFrameTimeMs <= 16 ? 'healthy' : 'warning'}
        icon="🎞️"
        isDark={isDark}
      />
      <MetricCard
        label="Avg API Time"
        value={performance.avgApiResponseMs > 0 ? `${performance.avgApiResponseMs}ms` : 'N/A'}
        status={
          performance.avgApiResponseMs === 0
            ? 'neutral'
            : performance.avgApiResponseMs < 500
            ? 'healthy'
            : performance.avgApiResponseMs < 2000
            ? 'warning'
            : 'critical'
        }
        icon="🌐"
        isDark={isDark}
      />
      <MetricCard
        label="Heap Used"
        value={performance.usedHeapBytes > 0 ? formatBytes(performance.usedHeapBytes) : 'N/A'}
        status={
          performance.heapUtilPercent === 0
            ? 'neutral'
            : performance.heapUtilPercent < 60
            ? 'healthy'
            : performance.heapUtilPercent < 80
            ? 'warning'
            : 'critical'
        }
        icon="💾"
        isDark={isDark}
      />
      <MetricCard
        label="Heap Total"
        value={performance.heapSizeBytes > 0 ? formatBytes(performance.heapSizeBytes) : 'N/A'}
        status="neutral"
        icon="📦"
        isDark={isDark}
      />
      <MetricCard
        label="Heap Utilisation"
        value={performance.heapUtilPercent > 0 ? `${performance.heapUtilPercent}%` : 'N/A'}
        status={
          performance.heapUtilPercent === 0
            ? 'neutral'
            : performance.heapUtilPercent < 60
            ? 'healthy'
            : performance.heapUtilPercent < 80
            ? 'warning'
            : 'critical'
        }
        icon="📊"
        isDark={isDark}
      />
      {appHealth.memoryLeakSuspected ? (
        <MetricCard
          label="Memory Leak"
          value="Suspected"
          status="warning"
          icon="⚠️"
          isDark={isDark}
        />
      ) : (
        <MetricCard
          label="Memory Leak"
          value="None"
          status="healthy"
          icon="✅"
          isDark={isDark}
        />
      )}
    </View>
  );

  const renderErrors = () => (
    <>
      <View style={styles.grid}>
        <MetricCard
          label="Errors/min"
          value={errorRate.errorsPerMinute}
          status={
            errorRate.errorsPerMinute === 0
              ? 'healthy'
              : errorRate.errorsPerMinute < 5
              ? 'warning'
              : 'critical'
          }
          icon="📈"
          isDark={isDark}
        />
        <MetricCard
          label="Total Errors"
          value={errorRate.totalErrors}
          status={
            errorRate.totalErrors === 0
              ? 'healthy'
              : errorRate.totalErrors < 10
              ? 'warning'
              : 'critical'
          }
          icon="🐛"
          isDark={isDark}
        />
        <MetricCard
          label="Crashes"
          value={appHealth.crashCount}
          status={appHealth.crashCount === 0 ? 'healthy' : 'critical'}
          icon="💥"
          isDark={isDark}
        />
        <MetricCard
          label="Trend"
          value={
            errorRate.trend === 'improving'
              ? '↓ Improving'
              : errorRate.trend === 'degrading'
              ? '↑ Degrading'
              : '→ Stable'
          }
          status={
            errorRate.trend === 'improving'
              ? 'healthy'
              : errorRate.trend === 'degrading'
              ? 'warning'
              : 'neutral'
          }
          icon="📉"
          isDark={isDark}
        />
      </View>

      {errorRate.byCategory.length > 0 ? (
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>By Category</Text>
          {errorRate.byCategory.map((item) => (
            <View
              key={item.category}
              style={[styles.categoryRow, { borderBottomColor: borderColor }]}
            >
              <Text style={[styles.categoryName, { color: textPrimary }]}>{item.category}</Text>
              <View style={styles.categoryRight}>
                <View
                  style={[
                    styles.categoryBar,
                    { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${item.percent}%`,
                        backgroundColor:
                          item.percent > 50 ? '#dc2626' : item.percent > 20 ? '#d97706' : '#19c3e6',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.categoryCount, { color: textSecondary }]}>
                  {item.count} ({item.percent}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.emptySection, { color: textSecondary }]}>
            ✅ No errors recorded this session.
          </Text>
        </View>
      )}
    </>
  );

  const renderUsers = () => (
    <View style={styles.grid}>
      <MetricCard
        label="Active Sessions"
        value={userMetrics.activeSessions}
        status="neutral"
        icon="👥"
        isDark={isDark}
      />
      <MetricCard
        label="Screens Viewed"
        value={userMetrics.screensViewed}
        status="neutral"
        icon="📱"
        isDark={isDark}
      />
      <MetricCard
        label="Events Tracked"
        value={userMetrics.eventsTracked}
        status="neutral"
        icon="📋"
        isDark={isDark}
      />
      <MetricCard
        label="Session Duration"
        value={formatDuration(userMetrics.avgSessionDurationSec)}
        status="neutral"
        icon="⏱️"
        isDark={isDark}
      />
      <MetricCard
        label="Role"
        value={userMetrics.currentRole}
        status="neutral"
        icon="🎭"
        isDark={isDark}
      />
      <MetricCard
        label="Analytics"
        value="Active"
        status="healthy"
        icon="📊"
        isDark={isDark}
      />
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: bg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={tabActiveColor}
            title="Refreshing metrics…"
            titleColor={textSecondary}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.heading, { color: textPrimary }]}>Team Dashboard</Text>
            <Text style={[styles.subHeading, { color: textSecondary }]}>
              Updated {formatTimestamp(snapshot.collectedAt)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.refreshToggle,
              {
                backgroundColor: autoRefreshEnabled ? '#19c3e6' : (isDark ? '#334155' : '#e2e8f0'),
              },
            ]}
            onPress={() => setAutoRefresh(!autoRefreshEnabled)}
            accessibilityRole="switch"
            accessibilityState={{ checked: autoRefreshEnabled }}
            accessibilityLabel={`Auto-refresh ${autoRefreshEnabled ? 'on' : 'off'}`}
          >
            <Text
              style={[
                styles.refreshToggleText,
                { color: autoRefreshEnabled ? '#ffffff' : textSecondary },
              ]}
            >
              {autoRefreshEnabled ? '⏺ Live' : '⏸ Paused'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        {visibleAlerts.length > 0 ? (
          <View style={styles.alertsSection}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              🔔 Alerts ({visibleAlerts.length})
            </Text>
            {visibleAlerts.map((alert: DashboardAlert) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={handleDismissAlert}
                isDark={isDark}
              />
            ))}
          </View>
        ) : null}

        {/* ── View selector tabs ───────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}
        >
          {VIEW_TABS.map((tab) => {
            const isActive = activeView === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? tabActiveColor : (isDark ? '#1e293b' : '#f1f5f9'),
                    borderColor: isActive ? tabActiveColor : borderColor,
                  },
                ]}
                onPress={() => setActiveView(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label} view`}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? '#ffffff' : tabInactiveColor },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Active view content ──────────────────────────────────────────── */}
        {activeView === 'overview' ? renderOverview() : null}
        {activeView === 'performance' ? renderPerformance() : null}
        {activeView === 'errors' ? renderErrors() : null}
        {activeView === 'users' ? renderUsers() : null}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondary }]}>
            Auto-refresh every 30s · Pull to refresh · Swipe views
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
  subHeading: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertsSection: {
    gap: 0,
  },
  tabsScroll: {
    marginHorizontal: -16,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  healthCards: {
    flex: 1,
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  categoryRight: {
    flex: 1.5,
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryCount: {
    fontSize: 11,
  },
  emptySection: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default TeamDashboard;
