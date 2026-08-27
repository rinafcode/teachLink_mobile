import { LinearGradient } from 'expo-linear-gradient';
import { Check, Star } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { PurchaseButton } from '../PurchaseButton';
import { SubscriptionTier } from '../../../services/mobilePayments';
import { TIER_META, FREE_FEATURES } from '../subscriptionMeta';

interface FreePlanCardProps {
  currentTier: SubscriptionTier;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
}

/**
 * Memoised free plan card — always shown when user is on free tier.
 * Features are static, so only theme colours trigger a repaint.
 */
export const FreePlanCard = memo(function FreePlanCard({
  currentTier,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
}: FreePlanCardProps) {
  const isCurrentPlan = currentTier === 'free';

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: cardBg,
          borderColor: isCurrentPlan ? TIER_META.free.colors[0] : borderColor,
          borderWidth: isCurrentPlan ? 2 : 1,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel="Free plan, $0 forever"
    >
      <LinearGradient
        colors={TIER_META.free.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.planHeader}
      >
        <View style={styles.planHeaderLeft}>
          <Star size={18} color="#fff" />
          <Text style={styles.planName}>Free</Text>
        </View>
        <View style={styles.planPricing}>
          <Text style={styles.planPrice}>$0</Text>
          <Text style={styles.planPeriod}>/forever</Text>
        </View>
      </LinearGradient>

      <View style={styles.featuresList}>
        {FREE_FEATURES.map((feature, i) => (
          <View key={`free-feature-${i}`} style={styles.featureRow}>
            <View style={[styles.featureCheck, { backgroundColor: '#64748b20' }]}>
              <Check size={12} color="#64748b" />
            </View>
            <Text style={[styles.featureText, { color: textPrimary }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <View style={styles.planCTA}>
        <PurchaseButton
          label="Current Plan"
          disabled
          variant="outline"
          onPress={() => {}}
          isDark={isDark}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  planPeriod: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  featuresList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  planCTA: {
    padding: 16,
    paddingTop: 12,
  },
});
