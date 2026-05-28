import { useCallback, useEffect, useState } from 'react';

import { crashReportingService } from '../services/crashReporting';
import { useAppStore } from '../store';
import { useCourseProgressStore } from '../store/courseProgressStore';
import type { DashboardAlert, DashboardRole } from '../store/metricsStore';
import { useMetricsStore } from '../store/metricsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useQuizStore } from '../store/quizStore';
import { useSettingsStore } from '../store/settingsStore';

export interface MetricValue {
  label: string;
  value: string | number;
  status: 'ok' | 'warning' | 'critical' | 'neutral';
  icon: string;
  detail?: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  metrics: MetricValue[];
}

export interface DashboardMetrics {
  role: DashboardRole;
  lastRefreshedAt: number;
  alerts: DashboardAlert[];
  sections: DashboardSection[];
  refresh: () => void;
  isAutoRefreshEnabled: boolean;
}

function resolveRole(userRole: string | undefined, override: DashboardRole | null): DashboardRole {
  if (override) return override;
  if (userRole === 'admin') return 'admin';
  if (userRole === 'instructor') return 'instructor';
  return 'student';
}

export function useDashboardMetrics(): DashboardMetrics {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const progressMap = useCourseProgressStore((s) => s.progressMap);
  const quizProgress = useQuizStore((s) => s.quizProgress);

  const pushToken = useNotificationStore((s) => s.pushToken);
  const isTokenRegistered = useNotificationStore((s) => s.isTokenRegistered);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);

  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);

  const { thresholds, dismissedAlertIds, refreshIntervalMs, autoRefreshEnabled, roleOverride } =
    useMetricsStore();

  const [errorCount, setErrorCount] = useState(() => crashReportingService.getErrorCount());
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now);

  const refresh = useCallback(() => {
    setErrorCount(crashReportingService.getErrorCount());
    setLastRefreshedAt(Date.now());
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const id = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(id);
  }, [autoRefreshEnabled, refresh, refreshIntervalMs]);

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const role = resolveRole(user?.role, roleOverride);

  const courseIds = Object.keys(progressMap);
  const completedCourses = courseIds.filter(
    (id) => progressMap[id].overallProgress >= 100
  ).length;
  const inProgressCourses = courseIds.filter(
    (id) => progressMap[id].overallProgress > 0 && progressMap[id].overallProgress < 100
  ).length;

  const completedQuizzes = Object.values(quizProgress).filter((q) => q.completed);
  const avgQuizScore =
    completedQuizzes.length > 0
      ? Math.round(
          completedQuizzes.reduce((sum, q) => sum + (q.score ?? 0), 0) / completedQuizzes.length
        )
      : 0;

  const recentNotifications = notifications.filter((n) => {
    const age = Date.now() - new Date(n.receivedAt).getTime();
    return age < 24 * 60 * 60 * 1000; // last 24 h
  }).length;

  // ─── Alerts ─────────────────────────────────────────────────────────────────
  const rawAlerts: DashboardAlert[] = [];

  if (errorCount >= thresholds.errorCountCritical) {
    rawAlerts.push({
      id: 'err_critical',
      severity: 'critical',
      message: `${errorCount} unhandled errors this session — investigate immediately`,
      timestamp: lastRefreshedAt,
    });
  } else if (errorCount >= thresholds.errorCountWarning) {
    rawAlerts.push({
      id: 'err_warning',
      severity: 'warning',
      message: `${errorCount} errors logged this session`,
      timestamp: lastRefreshedAt,
    });
  }

  if (avgQuizScore > 0 && avgQuizScore < thresholds.avgQuizScoreWarning) {
    rawAlerts.push({
      id: 'quiz_score_low',
      severity: 'warning',
      message: `Average quiz score is low (${avgQuizScore}%) — content review may be needed`,
      timestamp: lastRefreshedAt,
    });
  }

  if (!isAuthenticated) {
    rawAlerts.push({
      id: 'auth_none',
      severity: 'info',
      message: 'No authenticated user — some metrics are unavailable',
      timestamp: lastRefreshedAt,
    });
  }

  const alerts = rawAlerts.filter((a) => !dismissedAlertIds.includes(a.id));

  // ─── Sections ───────────────────────────────────────────────────────────────
  const appHealthSection: DashboardSection = {
    id: 'app_health',
    title: 'App Health',
    metrics: [
      {
        label: 'Errors',
        value: errorCount,
        status:
          errorCount >= thresholds.errorCountCritical
            ? 'critical'
            : errorCount >= thresholds.errorCountWarning
              ? 'warning'
              : 'ok',
        icon: errorCount > 0 ? 'exclamationmark.triangle.fill' : 'checkmark.shield.fill',
        detail: `threshold: ${thresholds.errorCountCritical}`,
      },
      {
        label: 'Session',
        value: isAuthenticated ? 'Active' : 'Guest',
        status: isAuthenticated ? 'ok' : 'neutral',
        icon: 'person.circle',
        detail: user?.name ?? 'Not signed in',
      },
      {
        label: 'Analytics',
        value: analyticsEnabled ? 'On' : 'Off',
        status: analyticsEnabled ? 'ok' : 'warning',
        icon: 'chart.bar.fill',
      },
      {
        label: 'Push Token',
        value: isTokenRegistered ? 'Registered' : 'Pending',
        status: isTokenRegistered ? 'ok' : pushToken ? 'warning' : 'neutral',
        icon: 'bell.fill',
        detail: isTokenRegistered ? 'Device registered' : 'Not yet registered',
      },
    ],
  };

  const notificationsSection: DashboardSection = {
    id: 'notifications',
    title: 'Notifications',
    metrics: [
      {
        label: 'Unread',
        value: unreadCount,
        status: unreadCount > 10 ? 'warning' : 'neutral',
        icon: 'envelope.badge.fill',
      },
      {
        label: 'Last 24h',
        value: recentNotifications,
        status: 'neutral',
        icon: 'clock.fill',
        detail: `of ${notifications.length} total`,
      },
    ],
  };

  const learningSection: DashboardSection = {
    id: 'learning',
    title: 'Learning Metrics',
    metrics: [
      {
        label: 'In Progress',
        value: inProgressCourses,
        status: 'neutral',
        icon: 'play.circle.fill',
        detail: `${courseIds.length} total courses`,
      },
      {
        label: 'Completed',
        value: completedCourses,
        status: completedCourses > 0 ? 'ok' : 'neutral',
        icon: 'checkmark.circle.fill',
      },
      {
        label: 'Quizzes Done',
        value: completedQuizzes.length,
        status: 'neutral',
        icon: 'doc.text.fill',
      },
      {
        label: 'Avg Score',
        value: completedQuizzes.length > 0 ? `${avgQuizScore}%` : 'N/A',
        status:
          avgQuizScore >= 80
            ? 'ok'
            : avgQuizScore >= thresholds.avgQuizScoreWarning
              ? 'neutral'
              : avgQuizScore > 0
                ? 'warning'
                : 'neutral',
        icon: 'star.fill',
        detail: `from ${completedQuizzes.length} attempt(s)`,
      },
    ],
  };

  // Role gates which sections are visible
  const sections: DashboardSection[] =
    role === 'admin'
      ? [appHealthSection, notificationsSection, learningSection]
      : role === 'instructor'
        ? [notificationsSection, learningSection]
        : [learningSection];

  return {
    role,
    lastRefreshedAt,
    alerts,
    sections,
    refresh,
    isAutoRefreshEnabled: autoRefreshEnabled,
  };
}
