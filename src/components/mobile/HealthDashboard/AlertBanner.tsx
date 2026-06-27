/**
 * AlertBanner — dismissible alert row for the health dashboard.
 *
 * Renders a coloured banner for each active MetricAlert with a dismiss button.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { MetricAlert } from '../../../services/healthMetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertBannerProps {
  alert: MetricAlert;
  onDismiss: (id: string) => void;
}

// ─── Severity styles ──────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  warning: {
    bg: '#fffbeb',
    border: '#f59e0b',
    text: '#92400e',
    icon: '⚠️',
  },
  critical: {
    bg: '#fef2f2',
    border: '#ef4444',
    text: '#7f1d1d',
    icon: '🚨',
  },
  ok: {
    bg: '#f0fdf4',
    border: '#22c55e',
    text: '#14532d',
    icon: '✅',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  const style = SEVERITY_STYLES[alert.severity];

  return (
    <View
      style={[styles.container, { backgroundColor: style.bg, borderLeftColor: style.border }]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${alert.severity} alert: ${alert.message}`}
    >
      <Text style={styles.icon}>{style.icon}</Text>
      <View style={styles.body}>
        <Text style={[styles.metric, { color: style.text }]}>{alert.metric}</Text>
        <Text style={[styles.message, { color: style.text }]}>{alert.message}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onDismiss(alert.id)}
        style={styles.dismiss}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${alert.metric} alert`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.dismissText, { color: style.text }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  metric: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  dismiss: {
    paddingLeft: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AlertBanner;
