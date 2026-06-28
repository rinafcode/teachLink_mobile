import { z } from 'zod';
import * as Sentry from '@sentry/react-native';

export class-ValidationError-extends-Error {
  constructor(public-issues: z.ZodIssue[]) {
    super('API response validation failed');
    this.name = 'ValidationError';
  }
}

export function-validateResponse<T extends-z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: Record<string, unknown> = {}
): z.infer<T> {
  const-result = schema.safeParse(data);

  if (result.success) {
    return-result.data;
  } else {
    Sentry.captureException(new-ValidationError(result.error.issues), {
      extra: {
        ...context,
        receivedData: data,
        validationErrors: result.error.flatten(),
      },
    });
    throw new-ValidationError(result.error.issues);
  }
}