/**
 * src/components/mobile/ServiceHealthPanel.tsx
 *
 * Drop-in panel for HealthDashboard that shows per-service status rows.
 * Renders ServiceStatusBadge for each service, including the circuit
 * breaker chip when the circuit is not CLOSED.
 *
 * Usage (inside HealthDashboard):
 *   import { ServiceHealthPanel } from './ServiceHealthPanel';
 *   ...
 *   <ServiceHealthPanel />
 */

import { useHealthDashboardStore } from '@store/healthDashboardStore';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ServiceStatus } from '../../types/serviceHealth';
import { ServiceStatusBadge } from './ServiceStatusBadge';

// ─── Label overrides ───────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  auth:          'Auth',
  sync:          'Sync',
  notifications: 'Notifications',
  payments:      'Payments',
};

const STATUS_DESCRIPTIONS: Record<ServiceStatus, string> = {
  ok:       'Healthy',
  timeout:  'Slow response',
  degraded: 'Degraded',
  error:    'Error',
  unknown:  'Not checked',
};

// ─── Component ─────────────────────────────────────────────────────────────

export const ServiceHealthPanel: React.FC = () => {
  const statuses = useHealthDashboardStore(s => s.serviceHealthStatuses);

  if (statuses.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Service Health</Text>

      {statuses.map(entry => (
        <View key={entry.service} style={styles.row}>
          {/* Service name + description */}
          <View style={styles.labelCol}>
            <Text style={styles.serviceName}>
              {SERVICE_LABELS[entry.service] ?? entry.service}
            </Text>
            <Text style={styles.description}>
              {STATUS_DESCRIPTIONS[entry.status] ?? entry.status}
              {entry.status === 'timeout' && entry.consecutiveTimeouts != null && (
                entry.consecutiveTimeouts > 1
                  ? `  ·  ${entry.consecutiveTimeouts}× consecutive`
                  : ''
              )}
            </Text>
          </View>

          {/* Status badge + circuit chip */}
          <ServiceStatusBadge
            status={entry.status}
            circuitState={entry.circuitState}
          />
        </View>
      ))}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  labelCol: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});