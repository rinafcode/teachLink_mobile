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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  RefreshCw,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Receipt,
  TrendingUp,
  Calendar,
} from 'lucide-react-native';
import { useInAppPurchase } from '../../hooks/useInAppPurchase';
import {
  PurchaseRecord,
  PurchaseStatus,
  PurchaseType,
  mobilePaymentsService,
} from '../../services/mobilePayments';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | PurchaseType;

// ─── Status display helpers ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PurchaseStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  completed: {
    label: 'Completed',
    color: '#059669',
    bg: '#dcfce7',
    icon: <CheckCircle size={14} color="#059669" />,
  },
  pending: {
    label: 'Pending',
    color: '#d97706',
    bg: '#fef3c7',
    icon: <Clock size={14} color="#d97706" />,
  },
  failed: {
    label: 'Failed',
    color: '#dc2626',
    bg: '#fee2e2',
    icon: <XCircle size={14} color="#dc2626" />,
  },
  refunded: {
    label: 'Refunded',
    color: '#7c3aed',
    bg: '#ede9fe',
    icon: <RotateCcw size={14} color="#7c3aed" />,
  },
  restored: {
    label: 'Restored',
    color: '#0369a1',
    bg: '#e0f2fe',
    icon: <RefreshCw size={14} color="#0369a1" />,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface PaymentHistoryProps {
  isDark?: boolean;
  onBack?: () => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  isDark = false,
  onBack,
}) => {
  const {
    purchaseHistory,
    currentTier,
    isRestoring,
    restorePurchases,
    refreshHistory,
  } = useInAppPurchase();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Theme tokens
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered =
    filter === 'all'
      ? purchaseHistory
      : purchaseHistory.filter((p) => p.type === filter);

  const totalSpent = purchaseHistory
    .filter((p) => p.status === 'completed' || p.status === 'restored')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeSubscription = purchaseHistory.find(
    (p) =>
      p.type === 'subscription' &&
      p.status === 'completed' &&
      p.expiresAt &&
      new Date(p.expiresAt) > new Date(),
  );

  // ── Pull-to-refresh ─────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshHistory();
    setIsRefreshing(false);
  };

  // ── Restore ─────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    const result = await restorePurchases();
    Alert.alert(
      result.count > 0 ? 'Purchases Restored' : 'Nothing to Restore',
      result.message,
    );
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (iso: string): string => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProductLabel = (productId: string): string => {
    const map: Record<string, string> = {
      'com.teachlink.subscription.pro.monthly': 'Pro Monthly',
      'com.teachlink.subscription.pro.annual': 'Pro Annual',
      'com.teachlink.subscription.premium.monthly': 'Premium Monthly',
      'com.teachlink.subscription.premium.annual': 'Premium Annual',
      'com.teachlink.course.bundle.starter': 'Starter Course Bundle',
    };
    return map[productId] ?? productId.split('.').pop() ?? productId;
  };

  // ── Summary card ────────────────────────────────────────────────────────

  const renderSummary = () => (
    <LinearGradient
      colors={['#20afe7', '#2c8aec', '#586ce9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <TrendingUp size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.summaryValue}>
            {mobilePaymentsService.formatPrice(totalSpent)}
          </Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Receipt size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.summaryValue}>{purchaseHistory.length}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <CreditCard size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.summaryValue}>
            {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </Text>
          <Text style={styles.summaryLabel}>Current Plan</Text>
        </View>
      </View>

      {activeSubscription?.expiresAt && (
        <View style={styles.renewalBanner}>
          <Calendar size={13} color="rgba(255,255,255,0.7)" />
          <Text style={styles.renewalText}>
            Renews {formatDate(activeSubscription.expiresAt)}
          </Text>
        </View>
      )}
    </LinearGradient>
  );

  // ── Filter tabs ──────────────────────────────────────────────────────────

  const renderFilterTabs = () => {
    const tabs: { key: FilterType; label: string; count: number }[] = [
      {
        key: 'all',
        label: 'All',
        count: purchaseHistory.length,
      },
      {
        key: 'subscription',
        label: 'Subscriptions',
        count: purchaseHistory.filter((p) => p.type === 'subscription').length,
      },
      {
        key: 'one_time',
        label: 'One-time',
        count: purchaseHistory.filter((p) => p.type === 'one_time').length,
      },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[
              styles.filterTab,
              {
                backgroundColor:
                  filter === tab.key ? '#19c3e6' : cardBg,
                borderColor:
                  filter === tab.key ? '#19c3e6' : borderColor,
              },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === tab.key ? '#fff' : textSecondary },
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.filterBadge,
                {
                  backgroundColor:
                    filter === tab.key
                      ? 'rgba(255,255,255,0.25)'
                      : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterBadgeText,
                  { color: filter === tab.key ? '#fff' : textSecondary },
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // ── Transaction item ────────────────────────────────────────────────────

  const renderTransaction = (record: PurchaseRecord) => {
    const statusCfg = STATUS_CONFIG[record.status];

    return (
      <View
        key={record.id}
        style={[styles.transactionCard, { backgroundColor: cardBg, borderColor }]}
      >
        {/* Left icon */}
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor:
                record.type === 'subscription' ? '#e0f2fe' : '#ede9fe',
            },
          ]}
        >
          {record.type === 'subscription' ? (
            <RefreshCw size={18} color="#0369a1" />
          ) : (
            <CreditCard size={18} color="#7c3aed" />
          )}
        </View>

        {/* Details */}
        <View style={styles.transactionDetails}>
          <Text
            style={[styles.transactionProduct, { color: textPrimary }]}
            numberOfLines={1}
          >
            {getProductLabel(record.productId)}
          </Text>

          <View style={styles.transactionMeta}>
            <Text style={[styles.transactionDate, { color: textSecondary }]}>
              {formatDate(record.purchasedAt)} · {formatTime(record.purchasedAt)}
            </Text>
          </View>

          {record.expiresAt && record.status !== 'refunded' && (
            <Text style={[styles.expiryText, { color: textSecondary }]}>
              {new Date(record.expiresAt) > new Date()
                ? `Expires ${formatDate(record.expiresAt)}`
                : `Expired ${formatDate(record.expiresAt)}`}
            </Text>
          )}

          <Text style={[styles.txnId, { color: textSecondary }]}>
            #{record.transactionId}
          </Text>
        </View>

        {/* Right: amount + status */}
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: textPrimary }]}>
            {mobilePaymentsService.formatPrice(record.amount, record.currency)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            {statusCfg.icon}
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Receipt size={32} color="#94a3b8" />
      </View>
      <Text style={[styles.emptyTitle, { color: textPrimary }]}>
        No transactions yet
      </Text>
      <Text style={[styles.emptyText, { color: textSecondary }]}>
        {filter === 'all'
          ? 'Your purchase history will appear here.'
          : `No ${filter === 'one_time' ? 'one-time purchases' : 'subscriptions'} found.`}
      </Text>
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          Payment History
        </Text>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={isRestoring}
          style={styles.restoreBtn}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#19c3e6" />
          ) : (
            <RefreshCw size={18} color="#19c3e6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#19c3e6"
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Summary */}
        <View style={styles.summaryWrapper}>{renderSummary()}</View>

        {/* Filter tabs */}
        {purchaseHistory.length > 0 && renderFilterTabs()}

        {/* Transaction list */}
        <View style={styles.listWrapper}>
          {filtered.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              {filtered.map(renderTransaction)}
              <Text style={[styles.endNote, { color: textSecondary }]}>
                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}{' '}
                shown
              </Text>
            </>
          )}
        </View>

        {/* Restore CTA when no history */}
        {purchaseHistory.length === 0 && (
          <View style={styles.restoreCTA}>
            <Text style={[styles.restoreCTAText, { color: textSecondary }]}>
              Made purchases on another device?
            </Text>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={isRestoring}
              style={styles.restoreCTABtn}
            >
              <Text style={styles.restoreCTABtnText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  restoreBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 40,
  },
  summaryWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  summaryCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  renewalBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  renewalText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  // Filter tabs
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Transaction list
  listWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  transactionDetails: {
    flex: 1,
    gap: 2,
  },
  transactionProduct: {
    fontSize: 14,
    fontWeight: '700',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  expiryText: {
    fontSize: 11,
  },
  txnId: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  endNote: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 8,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
  // Restore CTA
  restoreCTA: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 10,
  },
  restoreCTAText: {
    fontSize: 14,
  },
  restoreCTABtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#19c3e6',
  },
  restoreCTABtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#19c3e6',
  },
});
