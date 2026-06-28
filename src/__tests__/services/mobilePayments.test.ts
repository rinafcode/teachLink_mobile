/**
 * Tests for:
 *   #615 — restorePurchases validates server-side before updating state
 *   #XXX — server-side receipt validation in purchaseUpdatedListener
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';

import { apiService } from '../../services/api';
import { mobilePaymentsService, PRODUCT_IDS } from '../../services/mobilePayments';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-iap');
jest.mock('../../services/api', () => ({
  apiService: { post: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({
  appLogger: { errorSync: jest.fn(), warnSync: jest.fn(), infoSync: jest.fn(), debugSync: jest.fn() },
}));
jest.mock('../../store/deviceStore', () => ({
  useDeviceStore: { getState: () => ({ isDeviceCompromised: false }) },
}));

const mockStoreState = {
  receiptValidationPending: false,
  setReceiptValidationPending: jest.fn(),
  setSubscriptionTier: jest.fn(),
};
jest.mock('../../store', () => ({
  useAppStore: { getState: jest.fn(() => mockStoreState) },
}));

// ─── Typed helpers ────────────────────────────────────────────────────────────

const mockIAP = IAP as jest.Mocked<typeof IAP>;
const mockApi = apiService as jest.Mocked<typeof apiService>;
const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const MOCK_RECEIPT = 'base64-encoded-receipt-data';
const MOCK_PRODUCT_ID = PRODUCT_IDS.PRO_MONTHLY;

function makeNetworkError(): Error {
  // An error with no .response property is a network-level failure
  return new Error('Network Error') as Error;
}

const makePurchase = (productId: string, receipt: string) => ({
  productId,
  transactionId: `txn_${productId}`,
  transactionReceipt: receipt,
  transactionDate: new Date().toISOString(),
  priceAmountMicros: 9_990_000,
  priceCurrencyCode: 'USD',
});

// ─── restorePurchases (#615) ──────────────────────────────────────────────────

describe('mobilePaymentsService.restorePurchases (#615)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.receiptValidationPending = false;
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockIAP.finishTransaction = jest.fn().mockResolvedValue(undefined);
  });

  it('only returns purchases with valid: true from server', async () => {
    const validPurchase = makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'valid-receipt');
    const invalidPurchase = makePurchase(PRODUCT_IDS.PREMIUM_MONTHLY, 'invalid-receipt');

    mockIAP.getAvailablePurchases = jest.fn().mockResolvedValue([validPurchase, invalidPurchase]);

    mockApi.post.mockImplementation((_path, body) => {
      if ((body as { receipt: string }).receipt === 'valid-receipt') {
        return Promise.resolve({ data: { valid: true, tier: 'pro' } });
      }
      return Promise.resolve({ data: { valid: false } });
    });

    const result = await mobilePaymentsService.restorePurchases();

    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe(PRODUCT_IDS.PRO_MONTHLY);
    expect(result[0].status).toBe('restored');
  });

  it('calls finishTransaction only for valid purchases', async () => {
    const validPurchase = makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'valid-receipt');
    const invalidPurchase = makePurchase(PRODUCT_IDS.PRO_ANNUAL, 'invalid-receipt');

    mockIAP.getAvailablePurchases = jest.fn().mockResolvedValue([validPurchase, invalidPurchase]);

    mockApi.post.mockImplementation((_path, body) => {
      const valid = (body as { receipt: string }).receipt === 'valid-receipt';
      return Promise.resolve({ data: { valid } });
    });

    await mobilePaymentsService.restorePurchases();

    expect(mockIAP.finishTransaction).toHaveBeenCalledTimes(1);
    expect(mockIAP.finishTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ purchase: validPurchase })
    );
  });

  it('returns empty array when all receipts are invalid', async () => {
    mockIAP.getAvailablePurchases = jest.fn().mockResolvedValue([
      makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'bad-1'),
      makePurchase(PRODUCT_IDS.PRO_ANNUAL, 'bad-2'),
    ]);
    mockApi.post.mockResolvedValue({ data: { valid: false } });

    const result = await mobilePaymentsService.restorePurchases();

    expect(result).toHaveLength(0);
    expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
  });

  it('updates subscription tier for the valid restored subscription', async () => {
    mockIAP.getAvailablePurchases = jest
      .fn()
      .mockResolvedValue([makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'valid-receipt')]);
    mockApi.post.mockResolvedValue({ data: { valid: true, tier: 'pro' } });

    await mobilePaymentsService.restorePurchases();

    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink:subscription_tier', 'pro');
    expect(mockStoreState.setSubscriptionTier).toHaveBeenCalledWith('pro');
  });
});

// ─── validateReceipt – server validation + retry logic ───────────────────────

describe('mobilePaymentsService.validateReceipt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs to /api/payments/validate-receipt and returns server result on success', async () => {
    const serverResult = { valid: true, tier: 'pro', expiry: '2027-01-01T00:00:00.000Z' };
    mockApi.post.mockResolvedValueOnce({ data: serverResult });

    const result = await mobilePaymentsService.validateReceipt(MOCK_RECEIPT, 'ios', MOCK_PRODUCT_ID);

    expect(mockApi.post).toHaveBeenCalledWith('/api/payments/validate-receipt', {
      receipt: MOCK_RECEIPT,
      platform: 'ios',
      productId: MOCK_PRODUCT_ID,
    });
    expect(result).toEqual(serverResult);
  });

  it('returns valid: false when server rejects the receipt', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { valid: false, error: 'Receipt already redeemed' } });

    const result = await mobilePaymentsService.validateReceipt(MOCK_RECEIPT, 'android');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Receipt already redeemed');
    expect(mockApi.post).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and succeeds on a later attempt', async () => {
    const serverResult = { valid: true, tier: 'pro' };
    mockApi.post
      .mockRejectedValueOnce(makeNetworkError())
      .mockRejectedValueOnce(makeNetworkError())
      .mockResolvedValueOnce({ data: serverResult });

    jest.useFakeTimers();
    const promise = mobilePaymentsService.validateReceipt(MOCK_RECEIPT, 'ios');
    await jest.runAllTimersAsync();
    const result = await promise;
    jest.useRealTimers();

    expect(mockApi.post).toHaveBeenCalledTimes(3);
    expect(result).toEqual(serverResult);
  });

  it('throws after all 4 attempts on persistent network error', async () => {
    mockApi.post.mockRejectedValue(makeNetworkError());

    jest.useFakeTimers();
    const promise = mobilePaymentsService.validateReceipt(MOCK_RECEIPT, 'ios');
    await jest.runAllTimersAsync();
    jest.useRealTimers();

    await expect(promise).rejects.toThrow('Network Error');
    expect(mockApi.post).toHaveBeenCalledTimes(4);
  });

  it('throws immediately on a server-returned error without retrying', async () => {
    const serverError = Object.assign(new Error('Forbidden'), {
      response: { status: 403, data: { message: 'Forbidden' } },
    });
    mockApi.post.mockRejectedValueOnce(serverError);

    await expect(mobilePaymentsService.validateReceipt(MOCK_RECEIPT, 'ios')).rejects.toThrow(
      'Forbidden'
    );
    expect(mockApi.post).toHaveBeenCalledTimes(1);
  });
});

// ─── purchaseUpdatedListener ──────────────────────────────────────────────────

describe('purchaseUpdatedListener (via initialize)', () => {
  let capturedListener: ((purchase: unknown) => Promise<void>) | null = null;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedListener = null;
    mockStoreState.receiptValidationPending = false;
    mockIAP.initConnection = jest.fn().mockResolvedValue(true);
    mockIAP.purchaseUpdatedListener = jest.fn().mockImplementation(cb => {
      capturedListener = cb;
      return { remove: jest.fn() };
    });
    mockIAP.purchaseErrorListener = jest.fn().mockReturnValue({ remove: jest.fn() });
    mockIAP.finishTransaction = jest.fn().mockResolvedValue(undefined);

    // Reset internal initialized flag so initialize() runs fresh
    (mobilePaymentsService as unknown as { isInitialized: boolean }).isInitialized = false;
    await mobilePaymentsService.initialize();
  });

  const MOCK_IAP_PURCHASE = { transactionReceipt: MOCK_RECEIPT, productId: MOCK_PRODUCT_ID };

  it('sets receiptValidationPending true then false around a successful validation', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { valid: true, tier: 'pro' } });

    await capturedListener!(MOCK_IAP_PURCHASE);

    expect(mockStoreState.setReceiptValidationPending).toHaveBeenNthCalledWith(1, true);
    expect(mockStoreState.setReceiptValidationPending).toHaveBeenNthCalledWith(2, false);
  });

  it('calls finishTransaction and updates store tier when server validates receipt', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { valid: true, tier: 'pro' } });

    await capturedListener!(MOCK_IAP_PURCHASE);

    expect(mockIAP.finishTransaction).toHaveBeenCalledWith({
      purchase: MOCK_IAP_PURCHASE,
      isConsumable: false,
    });
    expect(mockStoreState.setSubscriptionTier).toHaveBeenCalledWith('pro');
  });

  it('does NOT call finishTransaction when server returns valid: false', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { valid: false, error: 'Receipt already redeemed' } });

    await capturedListener!(MOCK_IAP_PURCHASE);

    expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    expect(mockStoreState.setSubscriptionTier).not.toHaveBeenCalled();
  });

  it('does NOT call finishTransaction after network errors exhaust retries', async () => {
    mockApi.post.mockRejectedValue(makeNetworkError());

    jest.useFakeTimers();
    const listenerPromise = capturedListener!(MOCK_IAP_PURCHASE);
    await jest.runAllTimersAsync();
    await listenerPromise;
    jest.useRealTimers();

    expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
    expect(mockStoreState.setReceiptValidationPending).toHaveBeenLastCalledWith(false);
  });

  it('skips validation entirely when receiptValidationPending is already true', async () => {
    mockStoreState.receiptValidationPending = true;

    await capturedListener!(MOCK_IAP_PURCHASE);

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
  });

  it('ignores purchases without a transactionReceipt', async () => {
    await capturedListener!({ productId: MOCK_PRODUCT_ID, transactionReceipt: undefined });

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockStoreState.setReceiptValidationPending).not.toHaveBeenCalled();
  });
});
