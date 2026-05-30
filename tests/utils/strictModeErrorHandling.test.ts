/**
 * Edge-case tests for the strict-mode `unknown` catch-variable contract.
 *
 * When `useUnknownInCatchVariables` is enabled, every `catch (error)` binding
 * is typed as `unknown`, so the codebase now follows the pattern:
 *
 *   try { ... } catch (error) {
 *     const err = error instanceof Error ? error : new Error(String(error));
 *     log(err);
 *   }
 *
 * These tests exercise both branches (Error and non-Error throws) so that
 * future regressions in error-narrowing logic are caught.
 */

function toErrorLike(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

describe('strict-mode error narrowing', () => {
  it('returns the original Error instance when one is thrown', () => {
    const original = new Error('boom');

    let caught: unknown;
    try {
      throw original;
    } catch (error) {
      caught = error;
    }

    const normalized = toErrorLike(caught);
    expect(normalized).toBe(original);
    expect(normalized.message).toBe('boom');
  });

  it('wraps non-Error string throws into an Error', () => {
    let caught: unknown;
    try {
      throw 'plain string failure';
    } catch (error) {
      caught = error;
    }

    const normalized = toErrorLike(caught);
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toBe('plain string failure');
  });

  it('wraps non-Error object throws into an Error using String coercion', () => {
    let caught: unknown;
    try {
      throw { code: 42, reason: 'object-thrown' };
    } catch (error) {
      caught = error;
    }

    const normalized = toErrorLike(caught);
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toBe('[object Object]');
  });

  it('handles null/undefined throws without crashing', () => {
    let nullCaught: unknown;
    try {
      throw null;
    } catch (error) {
      nullCaught = error;
    }
    expect(toErrorLike(nullCaught)).toBeInstanceOf(Error);
    expect(toErrorLike(nullCaught).message).toBe('null');

    let undefinedCaught: unknown;
    try {
      throw undefined;
    } catch (error) {
      undefinedCaught = error;
    }
    expect(toErrorLike(undefinedCaught)).toBeInstanceOf(Error);
    expect(toErrorLike(undefinedCaught).message).toBe('undefined');
  });
});

describe('nullish coalescing fallbacks (strictNullChecks)', () => {
  function pickName(user: { profile?: { name?: string } } | null): string {
    return user?.profile?.name ?? 'anonymous';
  }

  it('returns the deeply nested name when present', () => {
    expect(pickName({ profile: { name: 'Ada' } })).toBe('Ada');
  });

  it('falls back when name is missing', () => {
    expect(pickName({ profile: {} })).toBe('anonymous');
  });

  it('falls back when profile is missing', () => {
    expect(pickName({})).toBe('anonymous');
  });

  it('falls back when user is null', () => {
    expect(pickName(null)).toBe('anonymous');
  });
});
