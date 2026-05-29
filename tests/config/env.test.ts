import {
  getEnv,
  validateEnvVariables,
  type EnvConfig,
  type ValidationResult,
} from '../../src/config/env';

/**
 * Note on env-var inlining:
 * babel-preset-expo inlines `process.env.EXPO_PUBLIC_*` references at
 * compile time, so we cannot vary their values per-test. These tests
 * therefore exercise the typed return shapes and the missing-value
 * branches that work regardless of how the variables were bound.
 */
describe('env (strict-mode type-safety edge cases)', () => {
  describe('validateEnvVariables', () => {
    it('returns a fully typed ValidationResult', () => {
      const result: ValidationResult = validateEnvVariables();

      // Shape contract — every field is typed under strict mode.
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      result.missing.forEach((variable) => {
        expect(typeof variable).toBe('string');
      });
      result.errors.forEach((message) => {
        expect(typeof message).toBe('string');
      });
    });

    it('keeps valid and missing/errors consistent', () => {
      const result = validateEnvVariables();

      // Invariant: valid === true iff both arrays are empty.
      if (result.valid) {
        expect(result.missing).toEqual([]);
        expect(result.errors).toEqual([]);
      } else {
        expect(result.missing.length + result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getEnv', () => {
    it('throws a typed Error mentioning the variable when it is unset', () => {
      const result = validateEnvVariables();
      const missingKey = result.missing[0] as keyof EnvConfig | undefined;

      if (!missingKey) {
        // If everything is set in this environment, getEnv must succeed
        // and return a string for every known key.
        const value: string = getEnv('EXPO_PUBLIC_API_BASE_URL');
        expect(typeof value).toBe('string');
        return;
      }

      let caught: unknown;
      try {
        getEnv(missingKey);
      } catch (error) {
        caught = error;
      }

      // Mirrors the strict-mode `unknown` catch pattern that the codebase
      // now follows after enabling useUnknownInCatchVariables.
      expect(caught).toBeInstanceOf(Error);
      if (caught instanceof Error) {
        expect(caught.message).toContain(missingKey);
      }
    });
  });
});
