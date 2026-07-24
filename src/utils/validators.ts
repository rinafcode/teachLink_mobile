/**
 * Shared, framework-agnostic input validators. (#846)
 *
 * Centralising these rules gives every form one source of truth and a single
 * regression test suite, so updating a rule can't silently break another form.
 * Each validator is a pure function returning a boolean.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164-ish: optional leading +, then 7–15 digits.
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;

/** True when `value` is a syntactically valid email within the length limit. */
export function isValidEmail(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX_LENGTH) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * True when `value` is a strong password: at least PASSWORD_MIN_LENGTH chars
 * and containing an uppercase letter, a lowercase letter, and a digit.
 */
export function isStrongPassword(value: string): boolean {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH) return false;
  return /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
}

/** True when `value` is a plausible phone number (E.164-style, digits only). */
export function isValidPhone(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Allow spaces, dashes and parentheses in input; validate the digits only.
  const normalized = value.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(normalized);
}
