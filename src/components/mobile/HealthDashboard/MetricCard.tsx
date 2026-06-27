/**
 * MetricCard — single KPI tile used throughout the health dashboard.
 *
 * Shows a label, primary value, optional sub-value, and a coloured
 * status indicator (ok / warning / critical).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AlertSeverity } from '../../../services/healthMetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  severity?: AlertSeverity;
  /** Small icon character / emoji shown top-left */
  icon?: string;
  /** If true, renders a wider card spanning full row */
  wide?: boolean;
}

// ─── Severity colours ─────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; border: string; dot: string }> = {
  ok: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  warning: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  critical: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subValue,
  severity = 'ok',
  icon,
  wide = false,
}) => {
  const colors = SEVERITY_COLORS[severity];

  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${unit ?? ''}, status ${severity}`}
    >
      {/* Header row */}
      <View style={styles.header}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      </View>

      {/* Primary value */}
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {/* Sub-value */}
      {subValue ? (
        <Text style={styles.subValue} numberOfLines={1}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardWide: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 32,
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 3,
    marginBottom: 3,
  },
  subValue: {
    marginTop: 4,
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default MetricCard;
