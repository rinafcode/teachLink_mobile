/**
 * AlertBanner — renders a single DashboardAlert as a dismissible banner.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DashboardAlert } from '../../../services/metricsService';
import { AppText as Text } from '../../common/AppText';

interface AlertBannerProps {
  alert: DashboardAlert;
  onDismiss?: (id: string) => void;
  isDark?: boolean;
}

const SEVERITY_COLOURS = {
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: 'ℹ️' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: '⚠️' },
  critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '🚨' },
};

const SEVERITY_COLOURS_DARK = {
  info: { bg: '#1e3a5f', border: '#1e40af', text: '#60a5fa', icon: 'ℹ️' },
  warning: { bg: '#451a03', border: '#78350f', text: '#fbbf24', icon: '⚠️' },
  critical: { bg: '#450a0a', border: '#7f1d1d', text: '#f87171', icon: '🚨' },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss, isDark = false }) => {
  const colours = isDark
    ? SEVERITY_COLOURS_DARK[alert.severity]
    : SEVERITY_COLOURS[alert.severity];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colours.bg, borderColor: colours.border },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${alert.severity} alert: ${alert.title}. ${alert.message}`}
    >
      <Text style={styles.icon}>{colours.icon}</Text>

      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colours.text }]}>{alert.title}</Text>
        <Text style={[styles.message, { color: colours.text }]}>{alert.message}</Text>
      </View>

      {onDismiss ? (
        <Pressable
          onPress={() => onDismiss(alert.id)}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${alert.title} alert`}
          hitSlop={8}
        >
          <Text style={[styles.dismissText, { color: colours.text }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    fontSize: 12,
    opacity: 0.9,
  },
  dismissButton: {
    paddingHorizontal: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AlertBanner;
