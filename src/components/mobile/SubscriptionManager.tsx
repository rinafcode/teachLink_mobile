import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';

import { BillingToggle } from './subscription/BillingToggle';
import { CurrentPlanCard } from './subscription/CurrentPlanCard';
import { FreePlanCard } from './subscription/FreePlanCard';
import { PlanCard } from './subscription/PlanCard';
import { RestoreFooter } from './subscription/RestoreFooter';
import { SubscriptionSkeleton } from './SubscriptionSkeleton';
import { useInAppPurchase } from '../../hooks';
import { SubscriptionPlan } from '../../services/mobilePayments';

// ─── Component ────────────────────────────────────────────────────────────────

interface SubscriptionManagerProps {
  isDark?: boolean;
  onClose?: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  isDark = false,
  onClose,
}) => {
  const {
    plans,
    currentTier,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    purchaseSuccess,
    loadProducts,
    purchaseSubscription,
    restorePurchases,
    clearError,
  } = useInAppPurchase();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (error) {
      Alert.alert('Payment Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Filter plans by billing period
  const visiblePlans = plans.filter(p => p.period === billingPeriod);

  const handlePurchase = useCallback(
    async (plan: SubscriptionPlan) => {
      setActivatingId(plan.productId);
      await purchaseSubscription(plan.productId);
      setActivatingId(null);
    },
    [purchaseSubscription]
  );

  const handleRestore = useCallback(async () => {
    const result = await restorePurchases();
    Alert.alert(result.count > 0 ? 'Purchases Restored' : 'Nothing to Restore', result.message);
  }, [restorePurchases]);

  // ── Loading skeleton ────────────────────────────────────────────────────

  if (isLoading) {
    return <SubscriptionSkeleton />;
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} accessibilityLabel="Subscription manager">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Choose Your Plan</Text>
          <Text style={[styles.headerSub, { color: textSecondary }]}>
            Cancel anytime · Secure payment
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close subscription screen"
          >
            <Text style={[styles.closeBtnText, { color: '#19c3e6' }]}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} removeClippedSubviews={true}>
        {/* Current plan */}
        <CurrentPlanCard currentTier={currentTier} textSecondary={textSecondary} />

        {/* Billing toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Billing Period</Text>
          <BillingToggle
            billingPeriod={billingPeriod}
            onPeriodChange={setBillingPeriod}
            cardBg={cardBg}
            borderColor={borderColor}
            textSecondary={textSecondary}
          />
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Available Plans</Text>
          {currentTier === 'free' && (
            <FreePlanCard
              currentTier={currentTier}
              isDark={isDark}
              cardBg={cardBg}
              borderColor={borderColor}
              textPrimary={textPrimary}
            />
          )}
          {visiblePlans.map(plan => {
            const isActivating = activatingId === plan.productId;
            const isAnyPurchasing = isPurchasing && !isActivating;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentTier={currentTier}
                isActivating={isActivating}
                isAnyPurchasing={isAnyPurchasing}
                purchaseSuccess={purchaseSuccess}
                isDark={isDark}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                onPurchase={handlePurchase}
              />
            );
          })}
        </View>

        {/* Restore & legal */}
        <RestoreFooter
          isRestoring={isRestoring}
          onRestore={handleRestore}
          textSecondary={textSecondary}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles (layout-only; visual styles moved to sub-components) ──────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    paddingBottom: 40,
  },
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
});
