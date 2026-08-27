import { RefreshCw } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';

interface RestoreFooterProps {
  isRestoring: boolean;
  onRestore: () => void;
  textSecondary: string;
}

/**
 * Memoised restore & legal footer — restore button, legal text, and policy links.
 * Only repaints when isRestoring or the secondary text colour changes.
 */
export const RestoreFooter = memo(function RestoreFooter({
  isRestoring,
  onRestore,
  textSecondary,
}: RestoreFooterProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={onRestore}
        disabled={isRestoring}
        accessibilityRole="button"
        accessibilityLabel={isRestoring ? 'Restoring purchases' : 'Restore purchases'}
      >
        {isRestoring ? (
          <ActivityIndicator size="small" color="#19c3e6" />
        ) : (
          <RefreshCw size={14} color="#19c3e6" />
        )}
        <Text style={styles.restoreBtnText}>
          {isRestoring ? 'Restoring…' : 'Restore Purchases'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.legalText, { color: textSecondary }]}>
        Subscriptions automatically renew unless cancelled at least 24 hours before the end of
        the current period. Manage or cancel in your device Settings → Subscriptions.
      </Text>

      <View style={styles.legalLinks}>
        <TouchableOpacity accessibilityLabel="Terms of Use">
          <Text style={styles.legalLink}>Terms of Use</Text>
        </TouchableOpacity>
        <Text style={[styles.legalSep, { color: textSecondary }]}>·</Text>
        <TouchableOpacity accessibilityLabel="Privacy Policy">
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 16,
    alignItems: 'center',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19c3e6',
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#19c3e6',
  },
  legalSep: {
    fontSize: 12,
  },
});
