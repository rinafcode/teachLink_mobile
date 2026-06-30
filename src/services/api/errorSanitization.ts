/**
 * API error message sanitization (Issue #579).
 *
 * User-facing error messages must never contain request URLs or endpoint
 * paths. The full url + method are sent to Sentry request context and
 * structured logs instead — never embedded in the message shown to the UI.
 */

/** Generic, URL-free user-facing messages keyed by HTTP status. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You are not allowed to perform this action.',
  404: 'The requested resource could not be found.',
  408: 'The request timed out. Please try again.',
  422: 'Some information provided was invalid. Please review and retry.',
};

/** Return a safe, URL-free message for a given HTTP status. */
export function getSafeErrorMessage(status?: number): string {
  if (status === undefined || status === 0) {
    return 'Something went wrong. Please try again.';
  }
  if (STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }
  if (status >= 500) {
    return 'Server error. Please try again later.';
  }
  if (status >= 400) {
    return 'The request could not be completed. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

// Matches absolute URLs and multi-segment paths like /api/users/42.
// Non-global so .test() is stateless.
const URL_OR_PATH = /(https?:\/\/[^\s]+)|(\/[\w.~%-]+(?:\/[\w.~%-]+)+)/;

/** True if a string contains a URL or a multi-segment endpoint path. */
export function containsUrlOrPath(message: string): boolean {
  return URL_OR_PATH.test(message);
}

/**
 * Defense-in-depth: if a message contains a URL/path, replace it with a safe
 * generic message; otherwise pass it through unchanged.
 */
export function sanitizeErrorMessage(message: string | undefined, status?: number): string {
  if (!message || containsUrlOrPath(message)) {
    return getSafeErrorMessage(status);
  }
  return message;
}

export interface SanitizedApiError {
  message: string;
  status: number;
  code?: string;
}

/** Build a normalized, URL-free error payload for the UI. */
export function buildSanitizedApiError(status?: number, code?: string): SanitizedApiError {
  return {
    message: getSafeErrorMessage(status),
    status: status ?? 0,
    ...(code ? { code } : {}),
  };
}
