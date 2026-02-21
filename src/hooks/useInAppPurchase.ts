import { useState, useEffect, useCallback } from 'react';
import {
  mobilePaymentsService,
  SubscriptionPlan,
  PurchaseRecord,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  PRODUCT_IDS,
} from '../services/mobilePayments';

// ─── State shape ──────────────────────────────────────────────────────────────

interface UseInAppPurchaseState {
  /** Available subscription plans fetched from the store */
  plans: SubscriptionPlan[];
  /** Full purchase history from local storage */
  purchaseHistory: PurchaseRecord[];
  /** User's current subscription tier */
  currentTier: SubscriptionTier;
  /** True while fetching product info */
  isLoading: boolean;
  /** True while a purchase flow is in progress */
  isPurchasing: boolean;
  /** True while restoring previous purchases */
  isRestoring: boolean;
  /** Last error message, or null */
  error: string | null;
  /** True when purchase just succeeded (resets after 3 s) */
  purchaseSuccess: boolean;
}

interface UseInAppPurchaseActions {
  /** Load localised product details from the App Store / Play Store */
  loadProducts: () => Promise<void>;
  /** Initiate a subscription purchase for the given productId */
  purchaseSubscription: (productId: string) => Promise<boolean>;
  /** Initiate a one-time product purchase */
  purchaseProduct: (productId: string) => Promise<boolean>;
  /** Restore purchases made on this Apple ID / Google account */
  restorePurchases: () => Promise<{ count: number; message: string }>;
  /** Refresh purchase history from local storage */
  refreshHistory: () => Promise<void>;
  /** Dismiss the current error */
  clearError: () => void;
}

export type UseInAppPurchase = UseInAppPurchaseState & UseInAppPurchaseActions;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useInAppPurchase = (): UseInAppPurchase => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // ── Initialise on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await mobilePaymentsService.initialize();
        const [tier, history] = await Promise.all([
          mobilePaymentsService.getSubscriptionTier(),
          mobilePaymentsService.getPurchaseHistory(),
        ]);
        if (!mounted) return;
        setCurrentTier(tier);
        setPurchaseHistory(history);
      } catch (err) {
        console.error('[useInAppPurchase] init error:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      // mobilePaymentsService.destroy(); // Uncomment if managing lifecycle here
    };
  }, []);

  // ── Load products ────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const productIds = Object.values(PRODUCT_IDS);
      const loaded = await mobilePaymentsService.getProducts(productIds);
      setPlans(loaded.length > 0 ? loaded : SUBSCRIPTION_PLANS);
    } catch {
      setError('Could not load plans. Please check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Purchase subscription ────────────────────────────────────────────────

  const purchaseSubscription = useCallback(
    async (productId: string): Promise<boolean> => {
      setIsPurchasing(true);
      setError(null);
      try {
        const record =
          await mobilePaymentsService.purchaseSubscription(productId);
        const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === productId);
        if (plan) setCurrentTier(plan.tier);
        setPurchaseHistory((prev) => [record, ...prev]);
        setPurchaseSuccess(true);
        setTimeout(() => setPurchaseSuccess(false), 3000);
        return true;
      } catch (err: any) {
        const msg: string = err?.message ?? '';
        // User-cancelled flows should not show an error banner
        if (!msg.toLowerCase().includes('cancel')) {
          setError(msg || 'Purchase failed. Please try again.');
        }
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [],
  );

  // ── Purchase one-time product ────────────────────────────────────────────

  const purchaseProduct = useCallback(
    async (productId: string): Promise<boolean> => {
      setIsPurchasing(true);
      setError(null);
      try {
        const record = await mobilePaymentsService.purchaseProduct(productId);
        setPurchaseHistory((prev) => [record, ...prev]);
        setPurchaseSuccess(true);
        setTimeout(() => setPurchaseSuccess(false), 3000);
        return true;
      } catch (err: any) {
        const msg: string = err?.message ?? '';
        if (!msg.toLowerCase().includes('cancel')) {
          setError(msg || 'Purchase failed. Please try again.');
        }
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [],
  );

  // ── Restore purchases ────────────────────────────────────────────────────

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const restored = await mobilePaymentsService.restorePurchases();
      const tier = await mobilePaymentsService.getSubscriptionTier();
      setCurrentTier(tier);
      await refreshHistory();

      if (restored.length === 0) {
        return {
          count: 0,
          message: 'No previous purchases found for this account.',
        };
      }
      return {
        count: restored.length,
        message: `${restored.length} purchase${restored.length > 1 ? 's' : ''} restored successfully.`,
      };
    } catch {
      setError('Restore failed. Please try again.');
      return { count: 0, message: 'Restore failed.' };
    } finally {
      setIsRestoring(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh history ──────────────────────────────────────────────────────

  const refreshHistory = useCallback(async () => {
    const history = await mobilePaymentsService.getPurchaseHistory();
    setPurchaseHistory(history);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    plans,
    purchaseHistory,
    currentTier,
    isLoading,
    isPurchasing,
    isRestoring,
    error,
    purchaseSuccess,
    loadProducts,
    purchaseSubscription,
    purchaseProduct,
    restorePurchases,
    refreshHistory,
    clearError,
  };
};
