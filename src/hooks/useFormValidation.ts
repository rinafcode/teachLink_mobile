import { useCallback, useEffect, useRef, useState } from 'react';

import { ValidationResult } from '../utils/validation';

type ValidatorFn = (value: string) => ValidationResult;

interface FieldConfig {
  validator: ValidatorFn;
  /** Validate immediately on first blur, then debounce on subsequent changes */
  validateOnBlur?: boolean;
}

type FieldErrors<K extends string> = Partial<Record<K, string>>;

const DEBOUNCE_MS = 300;

/**
 * Manages per-field validation with 300ms debounce on keystroke.
 * Errors appear immediately on blur (fast-path) and are cleared/updated
 * with debounce while the user is typing.
 *
 * @example
 * const { errors, validate, onChangeText, onBlur, validateAll } = useFormValidation({
 *   email: { validator: validateEmail },
 *   password: { validator: validatePassword },
 * });
 */
export function useFormValidation<K extends string>(fields: Record<K, FieldConfig>) {
  const [errors, setErrors] = useState<FieldErrors<K>>({});
  const timers = useRef<Partial<Record<K, ReturnType<typeof setTimeout>>>>({});
  const touchedRef = useRef<Partial<Record<K, boolean>>>({});

  // Clean up all timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      (Object.values(t) as ReturnType<typeof setTimeout>[]).forEach(clearTimeout);
    };
  }, []);

  const setFieldError = useCallback((field: K, message: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  /** Validate a single field immediately (no debounce). */
  const validate = useCallback(
    (field: K, value: string): boolean => {
      const result = fields[field].validator(value);
      setFieldError(field, result.valid ? undefined : result.message);
      return result.valid;
    },
    [fields, setFieldError]
  );

  /**
   * Returns an onChangeText handler for a field.
   * Debounces validation by 300ms; clears the error immediately so the
   * input doesn't stay red while the user is actively correcting it.
   */
  const onChangeText = useCallback(
    (field: K, value: string) => {
      // Only debounce-validate fields the user has already touched
      if (!touchedRef.current[field]) return;

      if (timers.current[field]) clearTimeout(timers.current[field]);
      // Fast-path: clear error immediately so UI feels responsive
      setFieldError(field, undefined);

      timers.current[field] = setTimeout(() => {
        const result = fields[field].validator(value);
        setFieldError(field, result.valid ? undefined : result.message);
      }, DEBOUNCE_MS);
    },
    [fields, setFieldError]
  );

  /** Returns an onBlur handler that validates immediately (fast-path). */
  const onBlur = useCallback(
    (field: K, value: string) => {
      touchedRef.current[field] = true;
      if (timers.current[field]) clearTimeout(timers.current[field]);
      validate(field, value);
    },
    [validate]
  );

  /** Validate all fields at once (e.g. on form submit). Returns true if all valid. */
  const validateAll = useCallback(
    (values: Record<K, string>): boolean => {
      let allValid = true;
      const next: FieldErrors<K> = {};
      for (const key of Object.keys(fields) as K[]) {
        const result = fields[key].validator(values[key]);
        if (!result.valid) {
          next[key] = result.message;
          allValid = false;
        }
      }
      setErrors(next);
      return allValid;
    },
    [fields]
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, validate, onChangeText, onBlur, validateAll, clearErrors };
}
