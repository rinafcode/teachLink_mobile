# TypeScript Strict Mode

`tsconfig.json` sets `"strict": true`. The codebase must type-check with
`npx tsc --noEmit` exiting with code `0`, and CI enforces this via the
`Typecheck` step in `.github/workflows/ci.yml`.

## What `strict: true` enables

| Flag                              | Catches                                                       |
|-----------------------------------|---------------------------------------------------------------|
| `strictNullChecks`                | Implicit `null` / `undefined` access on values that may be missing |
| `noImplicitAny`                   | Parameters / variables without explicit or inferable types    |
| `strictFunctionTypes`             | Function-parameter variance mismatches at assignment sites    |
| `strictBindCallApply`             | Wrong argument types on `.bind` / `.call` / `.apply`          |
| `strictPropertyInitialization`    | Class fields declared but not definitely assigned             |
| `noImplicitThis`                  | Implicit `any` on `this` inside standalone functions          |
| `alwaysStrict`                    | Emits `"use strict"` and parses files in strict mode          |
| `useUnknownInCatchVariables`      | Forces `catch (error)` bindings to be typed as `unknown`      |

## Rules for contributors

- [ ] Never use `any` to silence a type error — use `unknown` and a type guard.
- [ ] Never use `// @ts-ignore` or `// @ts-expect-error`; fix the underlying type instead.
- [ ] Always treat `catch (error)` as `unknown` and narrow with
      `error instanceof Error` before reading `.message` / `.stack`.
- [ ] Initialise class properties in the constructor, or use the `!` definite-assignment
      operator only when the field is genuinely set elsewhere — add a comment with the
      reason when you do.
- [ ] Prefer optional chaining (`?.`) and nullish coalescing (`??`) over non-null
      assertions (`!`) for nullable values.
- [ ] When a third-party value's type is unknown to you, type it as `unknown` and
      narrow it with a type guard rather than reaching for `any`.

### Idiomatic patterns

**Catch clauses** (matches the codebase convention, e.g.
`src/services/mobilePayments.ts`):

```ts
try {
  await doWork();
} catch (error) {
  appLogger.errorSync(
    '[Module] doWork failed',
    error instanceof Error ? error : new Error(String(error)),
  );
}
```

**Nullable chains** (e.g. `src/config/env.ts`):

```ts
const value = process.env.SOME_KEY;
if (!value) {
  throw new Error(`SOME_KEY is not set`);
}
return value;
```

**Discriminated unions over `as any` casts**: prefer narrowing through a
checked field rather than casting:

```ts
function isError(x: unknown): x is Error {
  return x instanceof Error;
}
```

## Verifying locally

```bash
npx tsc --noEmit        # must exit with code 0
npm test                # must pass; new tests should also pass
```

## CI enforcement

`.github/workflows/ci.yml` runs `npx tsc --noEmit` on every push and PR via the
`Typecheck` job, followed by `npm test`. A PR that introduces a strict-mode
violation will fail CI before it can be merged.
