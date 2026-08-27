import * as Sentry from '@sentry/react-native';
import { z } from 'zod';

import { UserSchema } from '../../types/api/schemas';

// ─── Error class ─────────────────────────────────────────────────────────────

export class ValidationError extends Error {
  constructor(public issues: z.ZodIssue[]) {
    super('API response validation failed');
    this.name = 'ValidationError';
  }
}

// ─── Generic validation helper ───────────────────────────────────────────────

export function validateResponse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: Record<string, unknown> = {}
): z.infer<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  } else {
    Sentry.captureException(new ValidationError(result.error.issues), {
      extra: {
        ...context,
        receivedData: data,
        validationErrors: result.error.flatten(),
      },
    });
    throw new ValidationError(result.error.issues);
  }
}

// ─── Auth schemas ────────────────────────────────────────────────────────────

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string().datetime(),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

export const RefreshResponseSchema = z.object({
  tokens: AuthTokensSchema,
});

// ─── Payment schemas ─────────────────────────────────────────────────────────

export const ReceiptValidationResultSchema = z.object({
  valid: z.boolean(),
  expiry: z.string().datetime().optional(),
  productId: z.string().optional(),
  tier: z.enum(['free', 'pro', 'premium']).optional(),
  error: z.string().optional(),
});

// ─── Sync / Conflict schemas ─────────────────────────────────────────────────

export const ConflictResponseSchema = z.object({
  message: z.string().optional(),
  entityType: z.string(),
  entityId: z.string(),
  serverVersionNumber: z.number().int(),
  serverVersion: z.unknown().optional(),
  localVersion: z.unknown().optional(),
});

// ─── Response validation wrappers for critical endpoints ──────────────────────

export function validateLoginResponse(data: unknown) {
  return validateResponse(LoginResponseSchema, data, { endpoint: '/auth/login' });
}

export function validateRefreshResponse(data: unknown) {
  return validateResponse(RefreshResponseSchema, data, { endpoint: '/auth/refresh' });
}

export function validateReceiptResult(data: unknown) {
  return validateResponse(ReceiptValidationResultSchema, data, {
    endpoint: '/api/payments/validate-receipt',
  });
}

export function validateConflictResponse(data: unknown) {
  return validateResponse(ConflictResponseSchema, data, { endpoint: '409-conflict' });
}
