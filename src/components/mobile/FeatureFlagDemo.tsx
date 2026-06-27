import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '@/hooks';
import { useFeatureFlag, useFeatureFlagsConfig } from '@/hooks/useFeatureFlags';
import { updateFeatureFlags } from '@/services/featureFlags';

/**
 * FeatureFlagDemo Component
 *
 * This component demonstrates how to use feature flags in practice.
 * It shows:
 * - Basic flag checking with useFeatureFlag hook
 * - User/region context passing
 * - Accessing full flag configuration
 * - Manual flag updates for testing
 */

export const FeatureFlagDemo: React.FC = () => {
  const auth = useAuth();
  const config = useFeatureFlagsConfig();

  // Example: Check if new UI is enabled for current user
  const isNewUIEnabled = useFeatureFlag('new-ui-redesign', {
    userId: auth.user?.id,
  });

  // Example: Check if feature is enabled in specific region
  const isEUFeatureEnabled = useFeatureFlag('eu-launch', {
    region: 'EU',
  });

  // Example: Check a percentage-based rollout (deterministic per user)
  const isGradualFeatureEnabled = useFeatureFlag('gradual-feature', {
    userId: auth.user?.id,
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Feature Flags Demo</Text>

      {/* Current User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Context</Text>
        <Text style={styles.detail}>User ID: {auth.user?.id ?? 'Anonymous'}</Text>
        <Text style={styles.detail}>Name: {auth.user?.name ?? 'Not logged in'}</Text>
      </View>

      {/* Individual Flag Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags Status</Text>

        <View style={styles.flagRow}>
          <Text style={styles.flagName}>new-ui-redesign</Text>
          <View style={[styles.badge, isNewUIEnabled ? styles.badgeEnabled : styles.badgeDisabled]}>
            <Text style={styles.badgeText}>{isNewUIEnabled ? 'ENABLED' : 'DISABLED'}</Text>
          </View>
        </View>

        <View style={styles.flagRow}>
          <Text style={styles.flagName}>eu-launch</Text>
          <View
            style={[styles.badge, isEUFeatureEnabled ? styles.badgeEnabled : styles.badgeDisabled]}
          >
            <Text style={styles.badgeText}>{isEUFeatureEnabled ? 'ENABLED' : 'DISABLED'}</Text>
          </View>
        </View>

        <View style={styles.flagRow}>
          <Text style={styles.flagName}>gradual-feature</Text>
          <View
            style={[
              styles.badge,
              isGradualFeatureEnabled ? styles.badgeEnabled : styles.badgeDisabled,
            ]}
          >
            <Text style={styles.badgeText}>{isGradualFeatureEnabled ? 'ENABLED' : 'DISABLED'}</Text>
          </View>
        </View>
      </View>

      {/* All Flags Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Flags Configuration</Text>
        <Text style={styles.detail}>Version: {config.version ?? 'unknown'}</Text>
        <Text style={styles.detail}>Updated: {config.updatedAt ?? 'never'}</Text>

        {Object.entries(config.flags).length === 0 ? (
          <Text style={styles.noFlags}>No flags configured</Text>
        ) : (
          Object.entries(config.flags).map(([key, definition]) => (
            <View key={key} style={styles.flagDefinition}>
              <Text style={styles.flagKey}>{key}</Text>
              {definition.description && (
                <Text style={styles.flagDescription}>{definition.description}</Text>
              )}
              {definition.enabled !== undefined && (
                <Text style={styles.flagDetail}>Static: {String(definition.enabled)}</Text>
              )}
              {definition.percentage !== undefined && (
                <Text style={styles.flagDetail}>Percentage: {definition.percentage}%</Text>
              )}
              {definition.includedUsers && definition.includedUsers.length > 0 && (
                <Text style={styles.flagDetail}>
                  Included Users: {definition.includedUsers.join(', ')}
                </Text>
              )}
              {definition.includedRegions && definition.includedRegions.length > 0 && (
                <Text style={styles.flagDetail}>
                  Included Regions: {definition.includedRegions.join(', ')}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Testing Section (dev only) */}
      <FeatureFlagTestingPanel />
    </ScrollView>
  );
};

/**
 * Testing Panel - allows manual flag updates for development
 * This should only be visible in development/debug builds
 */
export const FeatureFlagTestingPanel: React.FC = () => {
  const [testFlagEnabled, setTestFlagEnabled] = React.useState(false);

  const handleToggleTestFlag = () => {
    const newState = !testFlagEnabled;
    setTestFlagEnabled(newState);

    updateFeatureFlags({
      flags: {
        'test-feature': {
          enabled: newState,
          description: 'Manual test flag for development',
        },
      },
    });
  };

  const handleSetPercentageRollout = () => {
    updateFeatureFlags({
      flags: {
        'gradual-feature': {
          enabled: false,
          percentage: 50,
          description: 'Gradually rolling out to 50% of users',
        },
      },
    });
  };

  const handleSimulateRegionalLaunch = () => {
    updateFeatureFlags({
      flags: {
        'eu-launch': {
          enabled: false,
          includedRegions: ['DE', 'FR', 'UK'],
          description: 'EU regional launch',
        },
      },
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🧪 Testing Panel (Dev Only)</Text>

      <View style={styles.testControl}>
        <Text style={styles.testLabel}>Toggle Test Flag</Text>
        <Switch
          style={styles.switch}
          value={testFlagEnabled}
          onValueChange={handleToggleTestFlag}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.button} onPress={handleSetPercentageRollout}>
          Test: 50% Rollout
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Text style={styles.button} onPress={handleSimulateRegionalLaunch}>
          Test: EU Regional
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1f2937',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  detail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  flagName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeEnabled: {
    backgroundColor: '#d1fae5',
  },
  badgeDisabled: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  flagDefinition: {
    marginVertical: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  flagKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  flagDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  flagDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  noFlags: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  testControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  switch: {
    marginLeft: 12,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
    textAlign: 'center',
  },
});
