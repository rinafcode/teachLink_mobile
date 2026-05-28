export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: false, message: 'Email is required.' };
  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, message: 'Enter a valid email address.' };
  return { valid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) return { valid: false, message: `${fieldName} is required.` };
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, message: 'Password is required.' };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

export function validateConfirmPassword(password: string, confirm: string): ValidationResult {
  if (!confirm) return { valid: false, message: 'Please confirm your password.' };
  if (password !== confirm) return { valid: false, message: 'Passwords do not match.' };
  return { valid: true };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Weak', color: '#ef4444' };

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 0, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 1, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 2, label: 'Strong', color: '#22c55e' };
  return { score: 3, label: 'Very Strong', color: '#16a34a' };
}

export function validateSearchQuery(query: string): ValidationResult {
  const trimmed = query.trim();
  if (!trimmed) return { valid: false, message: 'Please enter a search term.' };
  if (trimmed.length < SEARCH_MIN_LENGTH) {
    return { valid: false, message: `Search must be at least ${SEARCH_MIN_LENGTH} characters.` };
  }
  if (trimmed.length > SEARCH_MAX_LENGTH) {
    return { valid: false, message: `Search must be under ${SEARCH_MAX_LENGTH} characters.` };
  }
  return { valid: true };
}

export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, message: 'Name is required.' };
  if (trimmed.length < 2) return { valid: false, message: 'Name must be at least 2 characters.' };
  if (trimmed.length > 50) return { valid: false, message: 'Name must be under 50 characters.' };
  return { valid: true };
}
