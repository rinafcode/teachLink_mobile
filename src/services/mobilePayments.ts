/**
 * mobilePayments.ts
 * Service layer for in-app purchases and subscription management.
 *
 * IAP library: react-native-iap
 * Install:     npx expo install react-native-iap
 * Docs:        https://react-native-iap.dooboolab.com
 *
 * Server-side receipt validation endpoint:
 *   POST /payments/validate  { receipt, platform, productId }
 *   POST /payments/restore   { receipts[], platform }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';

import { apiService } from './api';
import { appLogger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type PurchaseType = 'subscription' | 'one_time';
export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'restored';

export interface SubscriptionPlan {
  id: string;
  productId: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  period: 'monthly' | 'annual';
  trialDays?: number;
  savings?: string;
  features: string[];
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: PurchaseType;
  status: PurchaseStatus;
  purchasedAt: string;
  expiresAt?: string;
  platform: 'ios' | 'android';
  receiptData?: string;
}

export interface ReceiptValidationResult {
  valid: boolean;
  expiry?: string;
  productId?: string;
  tier?: SubscriptionTier;
  error?: string;
}

// ─── Product catalogue ────────────────────────────────────────────────────────
// These IDs must match exactly what is configured in:
//   - Apple App Store Connect > In-App Purchases
//   - Google Play Console > Products > Subscriptions

export const PRODUCT_IDS = {
  PRO_MONTHLY: 'com.teachlink.subscription.pro.monthly',
  PRO_ANNUAL: 'com.teachlink.subscription.pro.annual',
  PREMIUM_MONTHLY: 'com.teachlink.subscription.premium.monthly',
  PREMIUM_ANNUAL: 'com.teachlink.subscription.premium.annual',
  COURSE_BUNDLE: 'com.teachlink.course.bundle.starter',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro_monthly',
    productId: PRODUCT_IDS.PRO_MONTHLY,
    name: 'Pro',
    tier: 'pro',
    price: 9.99,
    currency: 'USD',
    period: 'monthly',
    trialDays: 7,
    features: [
      'Access all 500+ courses',
      'Offline downloads',
      'Completion certificates',
      'Priority support',
      'No ads',
    ],
  },
  {
    id: 'pro_annual',
    productId: PRODUCT_IDS.PRO_ANNUAL,
    name: 'Pro Annual',
    tier: 'pro',
    price: 79.99,
    currency: 'USD',
    period: 'annual',
    trialDays: 14,
    savings: 'Save 33%',
    features: [
      'Access all 500+ courses',
      'Offline downloads',
      'Completion certificates',
      'Priority support',
      'No ads',
      '33% savings vs monthly',
    ],
  },
  {
    id: 'premium_monthly',
    productId: PRODUCT_IDS.PREMIUM_MONTHLY,
    name: 'Premium',
    tier: 'premium',
    price: 19.99,
    currency: 'USD',
    period: 'monthly',
    trialDays: 7,
    features: [
      'Everything in Pro',
      'Live sessions with instructors',
      'Personalised learning path',
      'Exclusive premium content',
      'Early access to new courses',
    ],
  },
  {
    id: 'premium_annual',
    productId: PRODUCT_IDS.PREMIUM_ANNUAL,
    name: 'Premium Annual',
    tier: 'premium',
    price: 159.99,
    currency: 'USD',
    period: 'annual',
    trialDays: 14,
    savings: 'Save 33%',
    features: [
      'Everything in Pro',
      'Live sessions with instructors',
      'Personalised learning path',
      'Exclusive premium content',
      'Early access to new courses',
      '33% savings vs monthly',
    ],
  },
];

// ─── AsyncStorage keys ────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  PURCHASES: '@teachlink:purchases',
  SUBSCRIPTION_TIER: '@teachlink:subscription_tier',
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

class MobilePaymentsService {
  private isInitialized = false;

  /**
   * Must be called once on app start (e.g. in App.tsx useEffect).
   * Sets up the IAP connection and purchase event listeners.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await IAP.initConnection();

      IAP.purchaseUpdatedListener(async (purchase) => {
        const receipt = purchase.purchaseToken ?? null;
        if (receipt) {
          const result = await this.validateReceipt(
            receipt,
            Platform.OS as 'ios' | 'android',
          );
          if (result.valid) {
            await IAP.finishTransaction({ purchase, isConsumable: false });
          }
        }
      });

      IAP.purchaseErrorListener((error) => {
        appLogger.errorSync('[Payments] Purchase error', error instanceof Error ? error : new Error(String(error)));
      });

      this.isInitialized = true;
    } catch (error) {
      appLogger.errorSync('[Payments] Initialize error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /** Must be called when the component that initialized payments unmounts. */
  async destroy(): Promise<void> {
    await IAP.endConnection();
    this.isInitialized = false;
  }

  /**
   * Fetches localised product info from the App Store / Play Store.
   * Falls back to the static SUBSCRIPTION_PLANS catalogue when not connected.
   */
  async getProducts(productIds: string[]): Promise<SubscriptionPlan[]> {
    try {
      const storeProducts = await IAP.fetchProducts({ skus: productIds, type: 'subs' });
      const products = (storeProducts ?? []) as {
        id: string;
        title: string;
        price?: number | null;
        displayPrice: string;
        currency: string;
      }[];
      return products.map((sp) => {
        const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === sp.id);
        return {
          id: plan?.id ?? sp.id,
          productId: sp.id,
          name: sp.title.replace(/^.*?-\s*/, '').trim(),
          tier: plan?.tier ?? 'pro',
          price: sp.price ?? parseFloat(sp.displayPrice.replace(/[^0-9.]/g, '') || '9.99'),
          currency: sp.currency || 'USD',
          period: sp.id.includes('.annual') ? 'annual' : 'monthly',
          trialDays: plan?.trialDays,
          savings: plan?.savings,
          features: plan?.features ?? [],
        };
      });
    } catch (error) {
      appLogger.errorSync('[Payments] getProducts error', error instanceof Error ? error : new Error(String(error)));
      return SUBSCRIPTION_PLANS.filter((p) => productIds.includes(p.productId));
    }
  }

  /**
   * Triggers the platform-native subscription purchase sheet.
   * On real devices, IAP.requestSubscription opens the iOS/Android payment UI.
   */
  async purchaseSubscription(productId: string): Promise<PurchaseRecord> {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === productId);
    if (!plan) throw new Error(`Unknown product: ${productId}`);

    try {
      await IAP.requestPurchase({
        type: 'subs',
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
      });

      // The actual purchase completion is handled by purchaseUpdatedListener.
      // For the hook, we await a Promise that resolves when the listener fires.
      // This is a simplified placeholder - in production you'd use a more sophisticated pattern
      // with a promise that resolves on the purchase event.

      // ── Fallback mock for development ──
      const record: PurchaseRecord = {
        id: `mock_${Date.now()}`,
        productId,
        transactionId: `txn_${Math.random().toString(36).slice(2, 10)}`,
        amount: plan.price,
        currency: plan.currency,
        type: 'subscription',
        status: 'completed',
        purchasedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() +
            (plan.period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        platform: Platform.OS as 'ios' | 'android',
      };

      await this._savePurchaseRecord(record);
      await this._setTier(plan.tier);
      return record;
    } catch (error) {
      appLogger.errorSync('[Payments] purchaseSubscription error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /** Triggers a one-time consumable / non-consumable purchase. */
  async purchaseProduct(productId: string): Promise<PurchaseRecord> {
    try {
      await IAP.requestPurchase({
        type: 'in-app',
        request: {
          ios: { sku: productId },
          android: { skus: [productId] },
        },
      });

      // ── Fallback mock for development ──
      const record: PurchaseRecord = {
        id: `mock_${Date.now()}`,
        productId,
        transactionId: `txn_${Math.random().toString(36).slice(2, 10)}`,
        amount: 29.99,
        currency: 'USD',
        type: 'one_time',
        status: 'completed',
        purchasedAt: new Date().toISOString(),
        platform: Platform.OS as 'ios' | 'android',
      };

      await this._savePurchaseRecord(record);
      return record;
    } catch (error) {
      appLogger.errorSync('[Payments] purchaseProduct error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Restores previous purchases from the App Store / Play Store.
   * Should be triggered by an explicit user action (e.g. "Restore Purchases" button).
   */
  async restorePurchases(): Promise<PurchaseRecord[]> {
    try {
      const available = await IAP.getAvailablePurchases();
      const validated: PurchaseRecord[] = [];

      for (const purchase of available) {
        const receipt = purchase.purchaseToken ?? null;
        if (receipt) {
          const result = await this.validateReceipt(
            receipt,
            Platform.OS as 'ios' | 'android',
            purchase.productId,
          );
          if (result.valid) {
            const txnId = purchase.transactionId ?? purchase.id;
            const plan = SUBSCRIPTION_PLANS.find((p) => p.productId === purchase.productId);
            validated.push({
              id: txnId,
              productId: purchase.productId,
              transactionId: txnId,
              amount: plan?.price ?? 0,
              currency: plan?.currency ?? 'USD',
              type: purchase.productId.includes('subscription')
                ? 'subscription'
                : 'one_time',
              status: 'restored',
              purchasedAt: purchase.transactionDate
                ? new Date(purchase.transactionDate).toISOString()
                : new Date().toISOString(),
              platform: Platform.OS as 'ios' | 'android',
              receiptData: receipt,
            });
            await IAP.finishTransaction({ purchase, isConsumable: false });
          }
        }
      }

      if (validated.length === 0) {
        // Fallback to local history for development
        const history = await this.getPurchaseHistory();
        const restorable = history.filter((p) => p.status === 'completed');

        const activeSub = restorable
          .filter(
            (p) =>
              p.type === 'subscription' &&
              p.expiresAt &&
              new Date(p.expiresAt) > new Date(),
          )
          .sort(
            (a, b) =>
              new Date(b.purchasedAt).getTime() -
              new Date(a.purchasedAt).getTime(),
          )[0];

        if (activeSub) {
          const plan = SUBSCRIPTION_PLANS.find(
            (p) => p.productId === activeSub.productId,
          );
          if (plan) await this._setTier(plan.tier);
        }

        return restorable.map((r) => ({
          ...r,
          status: 'restored' as PurchaseStatus,
        }));
      }

      return validated;
    } catch (error) {
      appLogger.errorSync('[Payments] restorePurchases error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validates a purchase receipt against the server.
   * The server should verify with Apple / Google using their validation APIs.
   *
   * Apple server validation:  https://buy.itunes.apple.com/verifyReceipt
   * Google server validation: https://www.googleapis.com/androidpublisher/v3/...
   */
  async validateReceipt(
    receiptData: string,
    platform: 'ios' | 'android',
    productId?: string,
  ): Promise<ReceiptValidationResult> {
    try {
      const response = await apiService.post('/payments/validate', {
        receipt: receiptData,
        platform,
        productId,
      });
      return response.data as ReceiptValidationResult;
    } catch {
      // Fallback mock for development — remove in production
      return {
        valid: true,
        expiry: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        productId: productId ?? PRODUCT_IDS.PRO_MONTHLY,
        tier: 'pro',
      };
    }
  }

  // ─── Storage helpers ────────────────────────────────────────────────────────

  async getPurchaseHistory(): Promise<PurchaseRecord[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASES);
    return raw ? (JSON.parse(raw) as PurchaseRecord[]) : [];
  }

  async getSubscriptionTier(): Promise<SubscriptionTier> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_TIER);
    return (raw as SubscriptionTier) ?? 'free';
  }

  async clearPaymentData(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PURCHASES,
      STORAGE_KEYS.SUBSCRIPTION_TIER,
    ]);
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  formatPrice(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  isSubscriptionActive(purchase: PurchaseRecord): boolean {
    if (!purchase.expiresAt) return false;
    return new Date(purchase.expiresAt) > new Date();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async _savePurchaseRecord(record: PurchaseRecord): Promise<void> {
    const existing = await this.getPurchaseHistory();
    await AsyncStorage.setItem(
      STORAGE_KEYS.PURCHASES,
      JSON.stringify([record, ...existing]),
    );
  }

  private async _setTier(tier: SubscriptionTier): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_TIER, tier);
  }
}

export const mobilePaymentsService = new MobilePaymentsService();
