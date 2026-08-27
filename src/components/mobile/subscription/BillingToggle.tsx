import React, { memo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface BillingToggleProps {
  billingPeriod: 'monthly' | 'annual';
  onPeriodChange: (period: 'monthly' | 'annual') => void;
  cardBg: string;
  borderColor: string;
  textSecondary: string;
}

/**
 * Memoised billing period toggle — monthly vs annual with savings badge.
 * Only repaints when billingPeriod or theme colours change.
 */
export const BillingToggle = memo(function BillingToggle({
  billingPeriod,
  onPeriodChange,
  cardBg,
  borderColor,
  textSecondary,
}: BillingToggleProps) {
  return (
    <View style={[styles.toggleRow, { backgroundColor: cardBg, borderColor }]}>
      {(['monthly', 'annual'] as const).map(period => (
        <TouchableOpacity
          key={period}
          style={[styles.toggleOption, billingPeriod === period && styles.toggleOptionActive]}
          onPress={() => onPeriodChange(period)}
          accessibilityRole="radio"
          accessibilityLabel={`${period} billing`}
          accessibilityState={{ checked: billingPeriod === period }}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: billingPeriod === period ? '#fff' : textSecondary,
                fontWeight: billingPeriod === period ? '700' : '500',
              },
            ]}
          >
            {period === 'monthly' ? 'Monthly' : 'Annual'}
          </Text>
          {period === 'annual' && (
            <View style={styles.toggleSavingsBadge}>
              <Text style={styles.toggleSavingsText}>Save 33%</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: '#19c3e6',
  },
  toggleText: {
    fontSize: 14,
  },
  toggleSavingsBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  toggleSavingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
  },
});
