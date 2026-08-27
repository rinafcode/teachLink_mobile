import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import React, { memo } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';

import { PurchaseButton } from '../PurchaseButton';
import { SubscriptionPlan, SubscriptionTier } from '../../../services/mobilePayments';
import { TIER_META } from '../subscriptionMeta';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentTier: SubscriptionTier;
  isActivating: boolean;
  isAnyPurchasing: boolean;
  purchaseSuccess: boolean;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  onPurchase: (plan: SubscriptionPlan) => void;
}

/**
 * Memoised plan card — header gradient, features list, and CTA.
 * Only repaints when its owning plan's state or theme changes.
 */
export const PlanCard = memo(function PlanCard({
  plan,
  currentTier,
  isActivating,
  isAnyPurchasing,
  purchaseSuccess,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  onPurchase,
}: PlanCardProps) {
  const meta = TIER_META[plan.tier];
  const isCurrentPlan = plan.tier === currentTier;

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: cardBg,
          borderColor: isCurrentPlan ? meta.colors[0] : borderColor,
          borderWidth: isCurrentPlan ? 2 : 1,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${plan.name} plan, $${plan.price} per ${plan.period}`}
    >
      {/* Plan header */}
      <LinearGradient
        colors={meta.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.planHeader}
      >
        <View style={styles.planHeaderLeft}>
          {meta.icon}
          <Text style={styles.planName}>{plan.name}</Text>
        </View>
        <View style={styles.planPricing}>
          <Text style={styles.planPrice}>${plan.price}</Text>
          <Text style={styles.planPeriod}>/{plan.period === 'monthly' ? 'mo' : 'yr'}</Text>
        </View>
      </LinearGradient>

      {/* Features list */}
      <View style={styles.featuresList}>
        {plan.features.map((feature, i) => (
          <View key={`feature-${plan.id}-${i}`} style={styles.featureRow}>
            <View style={[styles.featureCheck, { backgroundColor: `${meta.colors[0]}20` }]}>
              <Check size={12} color={meta.colors[0]} />
            </View>
            <Text style={[styles.featureText, { color: textPrimary }]}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.planCTA}>
        {isActivating ? (
          <View style={styles.activatingRow}>
            <ActivityIndicator color={meta.colors[0]} />
            <Text style={[styles.activatingText, { color: meta.colors[0] }]}>
              Opening payment…
            </Text>
          </View>
        ) : (
          <PurchaseButton
            label={isCurrentPlan ? `Current Plan` : `Get ${plan.name}`}
            price={
              plan.trialDays && !isCurrentPlan
                ? `${plan.trialDays}-day free trial, then $${plan.price}/${plan.period === 'monthly' ? 'mo' : 'yr'}`
                : undefined
            }
            trialBadge={
              plan.trialDays && !isCurrentPlan ? `${plan.trialDays}-day free trial` : undefined
            }
            savingsBadge={plan.savings && !isCurrentPlan ? plan.savings : undefined}
            isLoading={isActivating}
            isSuccess={purchaseSuccess && isActivating}
            disabled={isCurrentPlan || isAnyPurchasing}
            variant={isCurrentPlan ? 'outline' : 'primary'}
            onPress={() => onPurchase(plan)}
            isDark={isDark}
          />
        )}
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
  activatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  activatingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
