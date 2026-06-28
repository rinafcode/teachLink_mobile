/**
 * src/components/mobile/ServiceStatusBadge.tsx
 *
 * Renders a coloured pill for a ServiceStatus value.
 *
 * Color mapping (matches spec):
 *   ok        → green  (#22c55e)
 *   timeout   → orange (#f97316)   ← new — between green and red
 *   degraded  → red    (#ef4444)
 *   error     → red    (#ef4444)
 *   unknown   → grey   (#94a3b8)   ← only for not-yet-run checks
 *
 * Also renders a circuit-breaker chip when circuitState is provided.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { CircuitState, ServiceStatus } from '../../types/serviceHealth';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Props {
  status: ServiceStatus;
  circuitState?: CircuitState;
  /** Override the display label (defaults to capitalised status string). */
  label?: string;
  style?: ViewStyle;
}

// ─── Color config ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ServiceStatus, { bg: string; text: string; dot: string }> = {
  ok:       { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  timeout:  { bg: '#ffedd5', text: '#c2410c', dot: '#f97316' },
  degraded: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
  error:    { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
  unknown:  { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};

const CIRCUIT_COLORS: Record<CircuitState, { bg: string; text: string }> = {
  CLOSED:    { bg: '#dcfce7', text: '#15803d' },
  HALF_OPEN: { bg: '#fef9c3', text: '#a16207' },
  OPEN:      { bg: '#fee2e2', text: '#b91c1c' },
};

const CIRCUIT_LABELS: Record<CircuitState, string> = {
  CLOSED:    'Circuit OK',
  HALF_OPEN: 'Probing…',
  OPEN:      'Circuit Open',
};

// ─── Component ─────────────────────────────────────────────────────────────

export const ServiceStatusBadge: React.FC<Props> = ({
  status,
  circuitState,
  label,
  style,
}) => {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
  const displayLabel = label ?? (status.charAt(0).toUpperCase() + status.slice(1));

  return (
    <View style={[styles.row, style]}>
      {/* Status pill */}
      <View style={[styles.pill, { backgroundColor: colors.bg }]}>
        <View style={[styles.dot, { backgroundColor: colors.dot }]} />
        <Text style={[styles.pillText, { color: colors.text }]}>{displayLabel}</Text>
      </View>

      {/* Circuit breaker chip — only shown when relevant */}
      {circuitState && circuitState !== 'CLOSED' && (
        <View
          style={[
            styles.circuitChip,
            { backgroundColor: CIRCUIT_COLORS[circuitState].bg },
          ]}
        >
          <Text
            style={[styles.circuitText, { color: CIRCUIT_COLORS[circuitState].text }]}
          >
            {CIRCUIT_LABELS[circuitState]}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 9999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  circuitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  circuitText: {
    fontSize: 11,
    fontWeight: '500',
  },
});