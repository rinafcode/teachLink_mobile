/**
 * ThresholdEditor — collapsible panel for adjusting alert thresholds.
 *
 * Lets operators tune warning/critical levels for each metric without
 * redeploying. Values are held in the Zustand store (session-scoped).
 */

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { AlertThresholds } from '../../../services/healthMetrics';

interface ThresholdEditorProps {
  thresholds: AlertThresholds;
  onChange: (partial: Partial<AlertThresholds>) => void;
}

interface FieldConfig {
  key: keyof AlertThresholds;
  label: string;
  unit: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'crashRateWarning', label: 'Crash Rate Warning', unit: '%' },
  { key: 'crashRateCritical', label: 'Crash Rate Critical', unit: '%' },
  { key: 'errorRateWarning', label: 'Error Rate Warning', unit: '/min' },
  { key: 'errorRateCritical', label: 'Error Rate Critical', unit: '/min' },
  { key: 'apiLatencyWarning', label: 'API Latency Warning', unit: 'ms' },
  { key: 'apiLatencyCritical', label: 'API Latency Critical', unit: 'ms' },
  { key: 'apiErrorRateWarning', label: 'API Error Rate Warning', unit: '%' },
  { key: 'apiErrorRateCritical', label: 'API Error Rate Critical', unit: '%' },
];

export const ThresholdEditor: React.FC<ThresholdEditorProps> = ({
  thresholds,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (key: keyof AlertThresholds, raw: string) => {
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      onChange({ [key]: num });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel="Toggle threshold settings"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.toggleLabel}>⚙️ Alert Thresholds</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.fields}>
          {FIELDS.map(({ key, label, unit }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>
                {label} ({unit})
              </Text>
              <TextInput
                style={styles.input}
                value={String(thresholds[key])}
                onChangeText={(v) => handleChange(key, v)}
                keyboardType="numeric"
                accessibilityLabel={`${label} threshold`}
                returnKeyType="done"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 12,
    color: '#94a3b8',
  },
  fields: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 14,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  input: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'right',
    backgroundColor: '#f8fafc',
  },
});

export default ThresholdEditor;
