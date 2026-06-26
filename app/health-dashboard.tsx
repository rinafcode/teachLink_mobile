/**
 * /health-dashboard — App Health Dashboard screen.
 *
 * Accessible via:
 *   router.push('/health-dashboard')
 *
 * Shows real-time crash rate, error rate, API latency, user sessions,
 * performance metrics, and threshold-based alerts.
 *
 * Intended for internal / admin use. In production you may want to
 * gate this route behind a role check (e.g. role === 'admin').
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { HealthDashboard } from '../src/components/mobile/HealthDashboard';

const HealthDashboardScreen: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Health Dashboard</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Dashboard wrapped in an error boundary so a render error
          doesn't crash the whole app */}
      <ErrorBoundary boundaryName="HealthDashboardScreen">
        <HealthDashboard />
      </ErrorBoundary>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  navSpacer: {
    minWidth: 60,
  },
});

export default HealthDashboardScreen;
