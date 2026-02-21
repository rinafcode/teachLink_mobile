import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Zap,
  Check,
  RefreshCw,
  ChevronRight,
  Star,
  Shield,
} from 'lucide-react-native';
import { PurchaseButton } from './PurchaseButton';
import { useInAppPurchase } from '../../hooks/useInAppPurchase';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  SubscriptionTier,
} from '../../services/mobilePayments';

// ─── Plan metadata ─────────────────────────────────────────────────────────────

const TIER_META: Record<
  SubscriptionTier,
  { label: string; colors: [string, string]; icon: React.ReactNode }
> = {
  free: {
    label: 'Free',
    colors: ['#94a3b8', '#64748b'],
    icon: <Star size={18} color="#fff" />,
  },
  pro: {
    label: 'Pro',
    colors: ['#20afe7', '#586ce9'],
    icon: <Zap size={18} color="#fff" />,
  },
  premium: {
    label: 'Premium',
    colors: ['#d97706', '#f59e0b'],
    icon: <Crown size={18} color="#fff" />,
  },
};

const FREE_FEATURES = [
  '5 courses per month',
  'Standard video quality',
  'Community forum access',
  'Mobile app access',
];

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

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(
    'monthly',
  );
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
      Alert.alert('Payment Error', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  // Filter plans by billing period
  const visiblePlans = plans.filter((p) => p.period === billingPeriod);

  const handlePurchase = async (plan: SubscriptionPlan) => {
    setActivatingId(plan.productId);
    await purchaseSubscription(plan.productId);
    setActivatingId(null);
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    Alert.alert(
      result.count > 0 ? 'Purchases Restored' : 'Nothing to Restore',
      result.message,
    );
  };

  const currentMeta = TIER_META[currentTier];

  // ── Current plan card ───────────────────────────────────────────────────

  const renderCurrentPlan = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: textSecondary }]}>
        Current Plan
      </Text>
      <LinearGradient
        colors={currentMeta.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.currentPlanCard}
      >
        <View style={styles.currentPlanLeft}>
          <View style={styles.currentPlanIconBadge}>
            {currentMeta.icon}
          </View>
          <View>
            <Text style={styles.currentPlanTier}>{currentMeta.label}</Text>
            <Text style={styles.currentPlanSub}>
              {currentTier === 'free'
                ? 'Upgrade to unlock everything'
                : 'Your plan is active'}
            </Text>
          </View>
        </View>
        <Shield size={20} color="rgba(255,255,255,0.6)" />
      </LinearGradient>
    </View>
  );

  // ── Billing period toggle ───────────────────────────────────────────────

  const renderBillingToggle = () => (
    <View style={[styles.toggleRow, { backgroundColor: cardBg, borderColor }]}>
      {(['monthly', 'annual'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.toggleOption,
            billingPeriod === period && styles.toggleOptionActive,
          ]}
          onPress={() => setBillingPeriod(period)}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color:
                  billingPeriod === period ? '#fff' : textSecondary,
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

  // ── Plan card ───────────────────────────────────────────────────────────

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const meta = TIER_META[plan.tier];
    const isCurrentPlan = plan.tier === currentTier;
    const isActivating = activatingId === plan.productId;
    const isAnyPurchasing = isPurchasing && !isActivating;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          {
            backgroundColor: cardBg,
            borderColor: isCurrentPlan ? meta.colors[0] : borderColor,
            borderWidth: isCurrentPlan ? 2 : 1,
          },
        ]}
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
            <Text style={styles.planPrice}>
              ${plan.price}
            </Text>
            <Text style={styles.planPeriod}>
              /{plan.period === 'monthly' ? 'mo' : 'yr'}
            </Text>
          </View>
        </LinearGradient>

        {/* Features list */}
        <View style={styles.featuresList}>
          {plan.features.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View
                style={[
                  styles.featureCheck,
                  { backgroundColor: `${meta.colors[0]}20` },
                ]}
              >
                <Check size={12} color={meta.colors[0]} />
              </View>
              <Text style={[styles.featureText, { color: textPrimary }]}>
                {feature}
              </Text>
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
              label={
                isCurrentPlan
                  ? `Current Plan`
                  : `Get ${plan.name}`
              }
              price={
                plan.trialDays && !isCurrentPlan
                  ? `${plan.trialDays}-day free trial, then $${plan.price}/${plan.period === 'monthly' ? 'mo' : 'yr'}`
                  : undefined
              }
              trialBadge={
                plan.trialDays && !isCurrentPlan
                  ? `${plan.trialDays}-day free trial`
                  : undefined
              }
              savingsBadge={plan.savings && !isCurrentPlan ? plan.savings : undefined}
              isLoading={isActivating}
              isSuccess={purchaseSuccess && activatingId === plan.productId}
              disabled={isCurrentPlan || isAnyPurchasing}
              variant={isCurrentPlan ? 'outline' : 'primary'}
              onPress={() => handlePurchase(plan)}
              isDark={isDark}
            />
          )}
        </View>
      </View>
    );
  };

  // ── Free plan card ──────────────────────────────────────────────────────

  const renderFreeCard = () => (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: cardBg,
          borderColor:
            currentTier === 'free' ? TIER_META.free.colors[0] : borderColor,
          borderWidth: currentTier === 'free' ? 2 : 1,
        },
      ]}
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
          <View key={i} style={styles.featureRow}>
            <View
              style={[
                styles.featureCheck,
                { backgroundColor: '#64748b20' },
              ]}
            >
              <Check size={12} color="#64748b" />
            </View>
            <Text style={[styles.featureText, { color: textPrimary }]}>
              {feature}
            </Text>
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

  // ── Loading skeleton ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#19c3e6" />
          <Text style={[styles.loadingText, { color: textSecondary }]}>
            Loading plans…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            Choose Your Plan
          </Text>
          <Text style={[styles.headerSub, { color: textSecondary }]}>
            Cancel anytime · Secure payment
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: '#19c3e6' }]}>
              Close
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Current plan */}
        {renderCurrentPlan()}

        {/* Billing toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            Billing Period
          </Text>
          {renderBillingToggle()}
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            Available Plans
          </Text>
          {currentTier === 'free' && renderFreeCard()}
          {visiblePlans.map(renderPlanCard)}
        </View>

        {/* Restore & legal */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isRestoring}
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
            Subscriptions automatically renew unless cancelled at least 24 hours
            before the end of the current period. Manage or cancel in your
            device Settings → Subscriptions.
          </Text>

          <View style={styles.legalLinks}>
            <TouchableOpacity>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={[styles.legalSep, { color: textSecondary }]}>·</Text>
            <TouchableOpacity>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
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
  // Current plan card
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
  // Billing toggle
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
  // Plan cards
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
  // Footer
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
