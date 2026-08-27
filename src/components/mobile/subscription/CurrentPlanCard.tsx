import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { SubscriptionTier } from '../../../services/mobilePayments';
import { TIER_META } from '../subscriptionMeta';

interface CurrentPlanCardProps {
  currentTier: SubscriptionTier;
  textSecondary: string;
}

/**
 * Memoised current plan summary — gradient card showing the active tier.
 * Only repaints when currentTier or the secondary text colour changes.
 */
export const CurrentPlanCard = memo(function CurrentPlanCard({
  currentTier,
  textSecondary,
}: CurrentPlanCardProps) {
  const meta = TIER_META[currentTier];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: textSecondary }]}>Current Plan</Text>
      <LinearGradient
        colors={meta.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.currentPlanCard}
      >
        <View style={styles.currentPlanLeft}>
          <View style={styles.currentPlanIconBadge}>{meta.icon}</View>
          <View>
            <Text style={styles.currentPlanTier}>{meta.label}</Text>
            <Text style={styles.currentPlanSub}>
              {currentTier === 'free' ? 'Upgrade to unlock everything' : 'Your plan is active'}
            </Text>
          </View>
        </View>
        <Shield size={20} color="rgba(255,255,255,0.6)" />
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  currentPlanCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPlanIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanTier: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  currentPlanSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});
