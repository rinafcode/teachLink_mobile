/**
 * LatencyBar — horizontal bar chart showing p50 / p95 / p99 API latency.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LatencyBarProps {
  p50: number;
  p95: number;
  p99: number;
  /** Threshold at which the bar turns amber (ms) */
  warningMs?: number;
  /** Threshold at which the bar turns red (ms) */
  criticalMs?: number;
}

const MAX_DISPLAY_MS = 4000;

const barColor = (value: number, warning: number, critical: number): string => {
  if (value >= critical) return '#ef4444';
  if (value >= warning) return '#f59e0b';
  return '#22c55e';
};

const LatencyRow: React.FC<{
  label: string;
  value: number;
  warning: number;
  critical: number;
}> = ({ label, value, warning, critical }) => {
  const pct = Math.min(100, (value / MAX_DISPLAY_MS) * 100);
  const color = barColor(value, warning, critical);

  return (
    <View style={styles.row} accessible accessibilityLabel={`${label} latency: ${value} milliseconds`}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.rowValue, { color }]}>{value}ms</Text>
    </View>
  );
};

export const LatencyBar: React.FC<LatencyBarProps> = ({
  p50,
  p95,
  p99,
  warningMs = 1000,
  criticalMs = 3000,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>API Latency</Text>
    <LatencyRow label="p50" value={p50} warning={warningMs} critical={criticalMs} />
    <LatencyRow label="p95" value={p95} warning={warningMs} critical={criticalMs} />
    <LatencyRow label="p99" value={p99} warning={warningMs} critical={criticalMs} />
    <Text style={styles.hint}>Max display: {MAX_DISPLAY_MS}ms</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    width: 32,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  rowValue: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  hint: {
    fontSize: 10,
    color: '#cbd5e1',
    textAlign: 'right',
    marginTop: 2,
  },
});

export default LatencyBar;
