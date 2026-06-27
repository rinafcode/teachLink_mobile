import { act, renderHook } from '@testing-library/react-native';

import { useFormValidation } from '../../hooks/useFormValidation';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validation';

jest.useFakeTimers();

const fields = {
  email: { validator: validateEmail },
  password: { validator: (v: string) => validateRequired(v, 'Password') },
};

describe('useFormValidation', () => {
  describe('initial state', () => {
    it('starts with no errors', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      expect(result.current.errors).toEqual({});
    });
  });

  describe('onBlur (fast-path)', () => {
    it('sets error immediately on blur with invalid value', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onBlur('email', 'not-an-email');
      });
      expect(result.current.errors.email).toBe('Enter a valid email address.');
    });

    it('clears error on blur with valid value', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onBlur('email', 'not-an-email');
      });
      act(() => {
        result.current.onBlur('email', 'user@example.com');
      });
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('onChangeText (debounced)', () => {
    it('does not validate before the field is touched', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onChangeText('email', 'bad');
        jest.advanceTimersByTime(300);
      });
      expect(result.current.errors.email).toBeUndefined();
    });

    it('clears error immediately on change after touch', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      // Touch the field first
      act(() => {
        result.current.onBlur('email', 'bad@');
      });
      expect(result.current.errors.email).toBeDefined();

      // Start typing — error should clear immediately
      act(() => {
        result.current.onChangeText('email', 'user@');
      });
      expect(result.current.errors.email).toBeUndefined();
    });

    it('sets error after 300ms debounce with invalid value', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onBlur('email', 'bad');
      });
      act(() => {
        result.current.onChangeText('email', 'still-bad');
      });
      // Before debounce fires — no error yet
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current.errors.email).toBeUndefined();

      // After debounce fires — error appears
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.errors.email).toBe('Enter a valid email address.');
    });

    it('resets the debounce timer on rapid keystrokes', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onBlur('email', 'x');
      });
      act(() => {
        result.current.onChangeText('email', 'a');
        jest.advanceTimersByTime(200);
        result.current.onChangeText('email', 'ab');
        jest.advanceTimersByTime(200);
        result.current.onChangeText('email', 'abc');
      });
      // 200ms since last keystroke — still no error
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current.errors.email).toBeUndefined();

      // 300ms after last keystroke — error fires
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.errors.email).toBeDefined();
    });

    it('clears error after debounce when value becomes valid', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.onBlur('email', 'bad');
      });
      act(() => {
        result.current.onChangeText('email', 'user@example.com');
        jest.advanceTimersByTime(300);
      });
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('validateAll', () => {
    it('returns false and sets all errors when all fields invalid', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      let valid: boolean;
      act(() => {
        valid = result.current.validateAll({ email: '', password: '' });
      });
      expect(valid!).toBe(false);
      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.password).toBeDefined();
    });

    it('returns true and clears errors when all fields valid', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      // Set some errors first
      act(() => {
        result.current.onBlur('email', 'bad');
      });
      let valid: boolean;
      act(() => {
        valid = result.current.validateAll({ email: 'user@example.com', password: 'secret' });
      });
      expect(valid!).toBe(true);
      expect(result.current.errors.email).toBeUndefined();
      expect(result.current.errors.password).toBeUndefined();
    });

    it('returns false with only some fields invalid', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      let valid: boolean;
      act(() => {
        valid = result.current.validateAll({ email: 'user@example.com', password: '' });
      });
      expect(valid!).toBe(false);
      expect(result.current.errors.email).toBeUndefined();
      expect(result.current.errors.password).toBeDefined();
    });
  });

  describe('validate (single field)', () => {
    it('validates a single field immediately', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      let valid: boolean;
      act(() => {
        valid = result.current.validate('email', 'not-valid');
      });
      expect(valid!).toBe(false);
      expect(result.current.errors.email).toBeDefined();
    });
  });

  describe('clearErrors', () => {
    it('clears all errors', () => {
      const { result } = renderHook(() => useFormValidation(fields));
      act(() => {
        result.current.validateAll({ email: '', password: '' });
      });
      act(() => {
        result.current.clearErrors();
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe('password validation', () => {
    const passwordFields = {
      password: { validator: validatePassword },
    };

    it('validates password strength requirements', () => {
      const { result } = renderHook(() => useFormValidation(passwordFields));
      act(() => {
        result.current.validateAll({ password: 'weak' });
      });
      expect(result.current.errors.password).toBeDefined();
    });

    it('accepts a strong password', () => {
      const { result } = renderHook(() => useFormValidation(passwordFields));
      let valid: boolean;
      act(() => {
        valid = result.current.validateAll({ password: 'StrongPass1' });
      });
      expect(valid!).toBe(true);
    });
  });
});
