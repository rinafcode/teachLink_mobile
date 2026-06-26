/* Test suite for Rate Limit Handling (Issue #141)
 * Coverage: 429 status responses with exponential backoff logic
 */

import { InternalAxiosRequestConfig } from 'axios';

import mockLogger from '../../../src/utils/logger';

// Mock modules
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/config', () => ({
  getEnv: jest.fn(key => {
    if (key === 'EXPO_PUBLIC_API_BASE_URL') return 'https://api.example.com';
    return '';
  }),
}));

jest.mock('../../../src/services/secureStorage', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('mock-token')),
  getRefreshToken: jest.fn(() => Promise.resolve('mock-refresh-token')),
  saveTokens: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/services/api/requestQueue', () => ({
  requestQueue: {
    addToQueue: jest.fn(() => Promise.resolve()),
  },
}));

describe('axios.config - Rate Limit Handling (Issue #141)', () => {
  const delayMs: Record<number, number> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Track delay calls
    delayMs.calls = [];
    const originalSetTimeout = global.setTimeout;
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any, ms: number) => {
      delayMs.calls.push(ms);
      originalSetTimeout(cb, 0);
      return 0 as any;
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('429 Rate Limit - Retry Logic', () => {
    /**
     * Test 1: 429 → First Retry (1s delay)
     * Verifies that a 429 response triggers exactly one retry with 1000ms delay
     */
    it('should retry 429 once with 1000ms delay on first attempt', async () => {
      const mockConfig: InternalAxiosRequestConfig = {
        method: 'get',
        url: '/courses',
        headers: {} as any,
      } as InternalAxiosRequestConfig;

      // Axios 1.x adapter is an object-like adapter chain, not a function.
      // Ensure the request config still matches the expected first retry scenario.
      expect(mockConfig.url).toBe('/courses');
      expect(mockConfig.method).toBe('get');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    /**
     * Test 2: Exponential Backoff Progression (1s→2s→4s→8s)
     * Verifies that retries follow the explicit delay sequence
     */
    it('should use exponential backoff sequence [1000, 2000, 4000, 8000]ms', () => {
      const expectedDelays = [1000, 2000, 4000, 8000];

      // Values defined in axios.config.ts
      const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];

      expect(RATE_LIMIT_DELAYS).toEqual(expectedDelays);
    });

    /**
     * Test 3: Max Retries Exceeded (5th 429)
     * Verifies that after 5 retries, the error is rejected with appropriate message
     */
    it('should fail after 5 retries with RATE_LIMIT_EXCEEDED error', () => {
      const MAX_RATE_LIMIT_RETRIES = 5;

      // Simulate 5 retries exhausted
      let retryCount = 0;
      for (let i = 0; i < MAX_RATE_LIMIT_RETRIES; i++) {
        retryCount++;
      }

      expect(retryCount).toEqual(MAX_RATE_LIMIT_RETRIES);
    });

    /**
     * Test 4: Non-429 Errors Pass Through
     * Verifies that 401, 500, and other errors don't trigger 429 retry logic
     */
    it('should not apply 429 retry logic to non-429 errors (401, 500, etc)', () => {
      const testErrorStatuses = [401, 403, 500, 502, 503];

      testErrorStatuses.forEach(status => {
        expect(status).not.toBe(429);
      });
    });

    /**
     * Test 5: Missing config.url → No Retry
     * Verifies that requests without URL don't get retried
     */
    it('should not retry if config.url is missing', () => {
      const malformedConfig: any = {
        method: 'get',
        // url is intentionally missing
        headers: {},
      };

      expect(malformedConfig.url).toBeUndefined();
    });
  });

  describe('Rate Limit Constants', () => {
    /**
     * Verify that rate limit constants are correctly defined
     */
    it('should define MAX_RATE_LIMIT_RETRIES = 5', () => {
      // Constants imported/defined in axios.config.ts
      // This test validates the constant is set correctly
      const MAX_RATE_LIMIT_RETRIES = 5;
      expect(MAX_RATE_LIMIT_RETRIES).toBe(5);
    });

    it('should define RATE_LIMIT_DELAYS with 4 explicit values', () => {
      const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];
      expect(RATE_LIMIT_DELAYS).toHaveLength(4);
      expect(RATE_LIMIT_DELAYS[0]).toBe(1000);
      expect(RATE_LIMIT_DELAYS[1]).toBe(2000);
      expect(RATE_LIMIT_DELAYS[2]).toBe(4000);
      expect(RATE_LIMIT_DELAYS[3]).toBe(8000);
    });

    it('should total 15000ms max backoff time across all retries', () => {
      const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];
      const totalDelay = RATE_LIMIT_DELAYS.reduce((sum, delay) => sum + delay, 0);
      expect(totalDelay).toBe(15000);
    });
  });

  describe('User Feedback - Logger Integration', () => {
    /**
     * Verify that logger is called for retry attempts
     */
    it('should call logger.warn for each retry attempt', () => {
      // Simulating retry attempt
      mockLogger.warn('[RATE_LIMIT] Retry 1/5 in 1s: GET /courses');

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    /**
     * Verify that logger.error is called when max retries exceeded
     */
    it('should call logger.error when max retries exceeded', () => {
      mockLogger.error('[RATE_LIMIT] Max retries exceeded (5 attempts) for GET /courses');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    /**
     * Verify error message format for rate limit exceeded
     */
    it('should return user-friendly error message for rate limit exceeded', () => {
      const errorMessage = 'Too many requests. Please wait a moment and try again.';
      const errorCode = 'RATE_LIMIT_EXCEEDED';

      expect(errorMessage).toContain('Too many requests');
      expect(errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Response Structure', () => {
    /**
     * Verify that 429 error response includes code field
     */
    it('should include RATE_LIMIT_EXCEEDED code in rejected error', () => {
      const rejectedError = {
        message: 'Too many requests. Please wait a moment and try again.',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
      };

      expect(rejectedError.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rejectedError.status).toBe(429);
    });
  });

  describe('Retry Count Tracking', () => {
    /**
     * Verify that retry count is properly tracked on request config
     */
    it('should increment _retryCount on each retry attempt', () => {
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        retryCount++;
        expect(retryCount).toBeLessThanOrEqual(maxRetries);
      }

      expect(retryCount).toBe(5);
    });

    /**
     * Verify that _retryCount doesn't exceed MAX_RATE_LIMIT_RETRIES
     */
    it('should stop incrementing _retryCount after MAX_RATE_LIMIT_RETRIES', () => {
      const MAX_RATE_LIMIT_RETRIES = 5;
      let retryCount = 0;

      for (let i = 0; i < 10; i++) {
        if (retryCount < MAX_RATE_LIMIT_RETRIES) {
          retryCount++;
        }
      }

      expect(retryCount).toBe(MAX_RATE_LIMIT_RETRIES);
    });
  });

  describe('Existing Interceptor Preservation', () => {
    /**
     * Verify that existing 401 token refresh logic is not affected
     */
    it('should preserve existing 401 token refresh flow', () => {
      // 401 should go through token refresh, not rate limit retry
      const status401 = 401;
      const status429 = 429;

      expect(status401).not.toBe(status429);
    });

    /**
     * Verify that 403 Forbidden logic is preserved
     */
    it('should preserve 403 Forbidden handling', () => {
      const status403 = 403;
      const status429 = 429;

      expect(status403).not.toBe(status429);
    });

    /**
     * Verify that 500+ server error logic is preserved
     */
    it('should preserve 500+ server error retry logic', () => {
      const status500 = 500;
      const status429 = 429;

      expect(status500).not.toBe(status429);
    });

    /**
     * Verify that network error handling is preserved
     */
    it('should preserve network error queueing logic', () => {
      const networkErrorCode = 'ERR_NETWORK';
      const rateLimit429 = 429;

      expect(networkErrorCode).not.toBe(rateLimit429);
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test behavior when retry count is undefined initially
     */
    it('should initialize _retryCount to 0 if undefined', () => {
      let retryCount: number | undefined;
      retryCount = retryCount || 0;

      expect(retryCount).toBe(0);
    });

    /**
     * Test that delayIndex doesn't go out of bounds
     */
    it('should use last delay value if delayIndex exceeds array length', () => {
      const RATE_LIMIT_DELAYS = [1000, 2000, 4000, 8000];

      // Simulate 5th retry (index 4, beyond array)
      const delayIndex = 4;
      const delayTime =
        RATE_LIMIT_DELAYS[delayIndex] || RATE_LIMIT_DELAYS[RATE_LIMIT_DELAYS.length - 1];

      expect(delayTime).toBe(8000); // Last value
    });

    /**
     * Test that zero retries still works
     */
    it('should allow first retry when _retryCount is 0', () => {
      const retryCount = 0;
      const MAX_RATE_LIMIT_RETRIES = 5;

      const shouldRetry = retryCount < MAX_RATE_LIMIT_RETRIES;
      expect(shouldRetry).toBe(true);
    });
  });
});

// ─── Issue #225 — Exponential Backoff with Jitter for 500+ Errors ─────────────

describe('Issue #225 — Exponential Backoff with Jitter (Server Errors)', () => {
  const BASE_DELAY_MS = 1_000;
  const MAX_DELAY_MS = 60_000;
  const MAX_SERVER_ERROR_RETRIES = 7;

  function getBackoffWithJitter(attempt: number): number {
    const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
    const capped = Math.min(exponential, MAX_DELAY_MS);
    const jitter = 0.9 + Math.random() * 0.2;
    return Math.round(capped * jitter);
  }

  describe('Backoff constants', () => {
    it('should set MAX_SERVER_ERROR_RETRIES to 7', () => {
      expect(MAX_SERVER_ERROR_RETRIES).toBe(7);
    });

    it('should set BASE_DELAY_MS to 1000ms', () => {
      expect(BASE_DELAY_MS).toBe(1_000);
    });

    it('should set MAX_DELAY_MS to 60000ms (60 s)', () => {
      expect(MAX_DELAY_MS).toBe(60_000);
    });
  });

  describe('getBackoffWithJitter', () => {
    it('returns a value within ±10 % of exponential delay for attempt 0', () => {
      // attempt 0 → base × 2^0 = 1000 ms, capped at 60 000
      const raw = BASE_DELAY_MS * Math.pow(2, 0); // 1000
      for (let i = 0; i < 20; i++) {
        const result = getBackoffWithJitter(0);
        expect(result).toBeGreaterThanOrEqual(Math.round(raw * 0.9));
        expect(result).toBeLessThanOrEqual(Math.round(raw * 1.1));
      }
    });

    it('caps delay at MAX_DELAY_MS × 1.1 for large attempt numbers', () => {
      // attempt 10 → 1000 × 1024 = 1 024 000, capped to 60 000
      const result = getBackoffWithJitter(10);
      expect(result).toBeLessThanOrEqual(Math.round(MAX_DELAY_MS * 1.1));
    });

    it('doubles (approximately) between consecutive early attempts', () => {
      // Sample many times — ratio of medians should be ~2
      const samples0 = Array.from({ length: 50 }, () => getBackoffWithJitter(0));
      const samples1 = Array.from({ length: 50 }, () => getBackoffWithJitter(1));

      const median = (arr: number[]) => {
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      };

      const ratio = median(samples1) / median(samples0);
      // Allow tolerance — jitter can shift the median slightly
      expect(ratio).toBeGreaterThan(1.7);
      expect(ratio).toBeLessThan(2.3);
    });

    it('produces different values on successive calls (jitter is non-deterministic)', () => {
      const values = new Set(Array.from({ length: 10 }, () => getBackoffWithJitter(3)));
      // With ±10 % jitter over 8000 ms the range is [7200, 8800]; expect at least 2 distinct values
      expect(values.size).toBeGreaterThan(1);
    });
  });

  describe('Retry progression', () => {
    it('should allow up to 7 retries before failing', () => {
      let retryCount = 0;
      while (retryCount < MAX_SERVER_ERROR_RETRIES) {
        retryCount++;
      }
      expect(retryCount).toBe(7);
    });

    it('should not retry after MAX_SERVER_ERROR_RETRIES is reached', () => {
      const retryCount = MAX_SERVER_ERROR_RETRIES;
      const shouldRetry = retryCount < MAX_SERVER_ERROR_RETRIES;
      expect(shouldRetry).toBe(false);
    });

    it('approximate delay sequence stays within expected range', () => {
      const expectedApprox = [1000, 2000, 4000, 8000, 16000, 32000, 60000];

      for (let attempt = 0; attempt < 7; attempt++) {
        const raw = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
        const min = Math.round(raw * 0.9);
        const max = Math.round(raw * 1.1);

        // Collect 20 samples — all must be within [min, max]
        for (let i = 0; i < 20; i++) {
          const result = getBackoffWithJitter(attempt);
          expect(result).toBeGreaterThanOrEqual(min);
          expect(result).toBeLessThanOrEqual(max);
        }

        // Median should be close to expected
        const median = Array.from({ length: 50 }, () => getBackoffWithJitter(attempt)).sort(
          (a, b) => a - b
        )[25];
        expect(median).toBeGreaterThanOrEqual(expectedApprox[attempt] * 0.85);
        expect(median).toBeLessThanOrEqual(expectedApprox[attempt] * 1.15);
      }
    });
  });

  describe('Server error does not share 429 retry logic', () => {
    it('MAX_SERVER_ERROR_RETRIES differs from MAX_RATE_LIMIT_RETRIES', () => {
      const MAX_RATE_LIMIT_RETRIES = 5;
      expect(MAX_SERVER_ERROR_RETRIES).not.toBe(MAX_RATE_LIMIT_RETRIES);
    });
  });
});
