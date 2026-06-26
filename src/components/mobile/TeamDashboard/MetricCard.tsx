/**
 * MetricCard — reusable single-metric tile used throughout the dashboard.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '../../common/AppText';

export type MetricCardStatus = 'healthy' | 'warning' | 'critical' | 'neutral';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  status?: MetricCardStatus;
  /** Optional emoji / short icon string shown to the left of the value */
  icon?: string;
  isDark?: boolean;
}

const STATUS_COLOURS: Record<MetricCardStatus, { bg: string; text: string; border: string }> = {
  healthy: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  warning: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  neutral: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

const STATUS_COLOURS_DARK: Record<MetricCardStatus, { bg: string; text: string; border: string }> =
  {
    healthy: { bg: '#14532d', text: '#4ade80', border: '#166534' },
    warning: { bg: '#451a03', text: '#fbbf24', border: '#78350f' },
    critical: { bg: '#450a0a', text: '#f87171', border: '#7f1d1d' },
    neutral: { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
  };

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subLabel,
  status = 'neutral',
  icon,
  isDark = false,
}) => {
  const colours = isDark ? STATUS_COLOURS_DARK[status] : STATUS_COLOURS[status];
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${subLabel ? `, ${subLabel}` : ''}`}
    >
      {/* Status indicator stripe */}
      <View style={[styles.stripe, { backgroundColor: colours.text }]} />

      <View style={styles.body}>
        <View style={styles.header}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <Text
          style={[
            styles.value,
            {
              color: colours.text,
              backgroundColor: colours.bg,
              borderColor: colours.border,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        {subLabel ? (
          <Text style={[styles.subLabel, { color: labelColor }]} numberOfLines={1}>
            {subLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  stripe: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  subLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default MetricCard;
