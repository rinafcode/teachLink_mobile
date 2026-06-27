/**
 * Tests for #615: restorePurchases validates server-side before updating state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IAP from 'react-native-iap';

import { apiService } from '../../services/api';
import { mobilePaymentsService, PRODUCT_IDS } from '../../services/mobilePayments';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-iap');
jest.mock('../../services/api', () => ({
  apiService: { post: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({
  appLogger: { errorSync: jest.fn(), infoSync: jest.fn(), debugSync: jest.fn() },
}));
jest.mock('../../store/deviceStore', () => ({
  useDeviceStore: { getState: () => ({ isDeviceCompromised: false }) },
}));

const mockIAP = IAP as jest.Mocked<typeof IAP>;
const mockApi = apiService as jest.Mocked<typeof apiService>;
const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const makePurchase = (productId: string, receipt: string) => ({
  productId,
  transactionId: `txn_${productId}`,
  transactionReceipt: receipt,
  transactionDate: new Date().toISOString(),
  priceAmountMicros: 9_990_000,
  priceCurrencyCode: 'USD',
});

describe('mobilePaymentsService.restorePurchases (#615)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockIAP.finishTransaction = jest.fn().mockResolvedValue(undefined);
  });

  it('only returns purchases with validated: true from server', async () => {
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
    const p1 = makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'bad-1');
    const p2 = makePurchase(PRODUCT_IDS.PRO_ANNUAL, 'bad-2');

    mockIAP.getAvailablePurchases = jest.fn().mockResolvedValue([p1, p2]);
    mockApi.post.mockResolvedValue({ data: { valid: false } });

    const result = await mobilePaymentsService.restorePurchases();

    // Falls back to local history (empty), so final result is []
    expect(result).toHaveLength(0);
    expect(mockIAP.finishTransaction).not.toHaveBeenCalled();
  });

  it('updates subscription tier for the valid restored subscription', async () => {
    const validPurchase = makePurchase(PRODUCT_IDS.PRO_MONTHLY, 'valid-receipt');
    mockIAP.getAvailablePurchases = jest.fn().mockResolvedValue([validPurchase]);
    mockApi.post.mockResolvedValue({ data: { valid: true, tier: 'pro' } });

    await mobilePaymentsService.restorePurchases();

    expect(mockStorage.setItem).toHaveBeenCalledWith('@teachlink:subscription_tier', 'pro');
  });
});
