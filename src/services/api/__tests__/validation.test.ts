import { z } from 'zod';

import {
  validateResponse,
  validateLoginResponse,
  validateRefreshResponse,
  validateReceiptResult,
  validateConflictResponse,
  ValidationError,
  AuthTokensSchema,
} from '../validation';

const TestSchema = z.object({
  id: z.string(),
  value: z.number(),
});

const now = new Date().toISOString();

// ─── Basic validateResponse tests ────────────────────────────────────────────

describe('validateResponse', () => {
  it('should return data if validation passes', () => {
    const data = { id: '1', value: 123 };
    const result = validateResponse(TestSchema, data);
    expect(result).toEqual(data);
  });

  it('should throw ValidationError if validation fails', () => {
    const data = { id: '1', value: 'wrong-type' };
    expect(() => validateResponse(TestSchema, data)).toThrow(ValidationError);
  });

  it('should throw ValidationError for missing fields', () => {
    const data = { id: '1' };
    expect(() => validateResponse(TestSchema, data)).toThrow(ValidationError);
  });
});

// ─── Contract fixtures ───────────────────────────────────────────────────────

describe('Auth response contracts', () => {
  const validLoginResponse = {
    user: {
      id: 'u1',
      createdAt: now,
      updatedAt: now,
      name: 'Test User',
      email: 'test@example.com',
      enrolledCourses: [],
      notifications: [],
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: now,
    },
  };

  it('valid login response passes validation', () => {
    const result = validateLoginResponse(validLoginResponse);
    expect(result.user.name).toBe('Test User');
    expect(result.tokens.accessToken).toBe('access-token');
  });

  it('login response missing user throws ValidationError', () => {
    expect(() => validateLoginResponse({ tokens: validLoginResponse.tokens })).toThrow(
      ValidationError
    );
  });

  it('login response missing tokens throws ValidationError', () => {
    expect(() => validateLoginResponse({ user: validLoginResponse.user })).toThrow(ValidationError);
  });

  it('login response with invalid email throws ValidationError', () => {
    const data = {
      ...validLoginResponse,
      user: { ...validLoginResponse.user, email: 'not-an-email' },
    };
    expect(() => validateLoginResponse(data)).toThrow(ValidationError);
  });

  const validRefreshResponse = {
    tokens: {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresAt: now,
    },
  };

  it('valid refresh response passes validation', () => {
    const result = validateRefreshResponse(validRefreshResponse);
    expect(result.tokens.accessToken).toBe('new-access');
  });

  it('refresh response missing tokens throws ValidationError', () => {
    expect(() => validateRefreshResponse({})).toThrow(ValidationError);
  });

  it('refresh response with missing expiresAt throws ValidationError', () => {
    const data = {
      tokens: { accessToken: 'a', refreshToken: 'r' },
    };
    expect(() => validateRefreshResponse(data)).toThrow(ValidationError);
  });
});

describe('Payment response contracts', () => {
  const validReceipt = {
    valid: true,
    expiry: now,
    productId: 'com.teachlink.subscription.pro.monthly',
    tier: 'pro' as const,
  };

  it('valid receipt passes validation', () => {
    const result = validateReceiptResult(validReceipt);
    expect(result.valid).toBe(true);
    expect(result.tier).toBe('pro');
  });

  it('invalid receipt with error passes validation (error is optional)', () => {
    const data = { valid: false, error: 'Expired receipt' };
    const result = validateReceiptResult(data);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Expired receipt');
  });

  it('receipt with invalid tier throws ValidationError', () => {
    const data = { ...validReceipt, tier: 'enterprise' };
    expect(() => validateReceiptResult(data)).toThrow(ValidationError);
  });

  it('receipt missing valid field throws ValidationError', () => {
    const data = { expiry: now, tier: 'pro' };
    expect(() => validateReceiptResult(data)).toThrow(ValidationError);
  });
});

describe('Conflict response contracts', () => {
  const validConflict = {
    entityType: 'note',
    entityId: 'n123',
    serverVersionNumber: 5,
    message: 'Version conflict',
  };

  it('valid conflict passes validation', () => {
    const result = validateConflictResponse(validConflict);
    expect(result.entityType).toBe('note');
    expect(result.serverVersionNumber).toBe(5);
  });

  it('conflict missing entityType throws ValidationError', () => {
    const data = { entityId: 'n123', serverVersionNumber: 5 };
    expect(() => validateConflictResponse(data)).toThrow(ValidationError);
  });

  it('conflict missing serverVersionNumber throws ValidationError', () => {
    const data = { entityType: 'note', entityId: 'n123' };
    expect(() => validateConflictResponse(data)).toThrow(ValidationError);
  });

  it('conflict with serverVersion and localVersion passes validation', () => {
    const data = {
      ...validConflict,
      serverVersion: { title: 'Server version' },
      localVersion: { title: 'Local version' },
    };
    const result = validateConflictResponse(data);
    expect(result.serverVersion).toEqual({ title: 'Server version' });
  });
});

// ─── Individual schema contract tests ────────────────────────────────────────

describe('AuthTokensSchema contract', () => {
  it('valid tokens pass validation', () => {
    const data = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: now,
    };
    expect(AuthTokensSchema.safeParse(data).success).toBe(true);
  });

  it('tokens missing accessToken fail validation', () => {
    const data = { refreshToken: 'refresh', expiresAt: now };
    expect(AuthTokensSchema.safeParse(data).success).toBe(false);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('validateResponse edge cases', () => {
  it('handles null data gracefully', () => {
    expect(() => validateResponse(TestSchema, null)).toThrow(ValidationError);
  });

  it('handles undefined data gracefully', () => {
    expect(() => validateResponse(TestSchema, undefined)).toThrow(ValidationError);
  });

  it('handles empty object gracefully', () => {
    expect(() => validateResponse(TestSchema, {})).toThrow(ValidationError);
  });

  it('handles nested object validation', () => {
    const nestedSchema = z.object({
      outer: z.object({
        inner: z.string(),
      }),
    });
    const data = { outer: { inner: 123 } };
    expect(() => validateResponse(nestedSchema, data)).toThrow(ValidationError);
  });

  it('passes context to Sentry on failure', () => {
    const context = { endpoint: '/test', method: 'GET' };
    expect(() => validateResponse(TestSchema, {}, context)).toThrow(ValidationError);
  });
});
