# Contributing to TeachLink Mobile

Thank you for contributing to TeachLink Mobile!

## Pull Request Guidelines

When submitting a Pull Request, you must fill out the provided PR template.  
The template ensures that all necessary considerations are accounted for before merge.

Please review the `.github/pull_request_template.md` which includes:
- **Summary & Type of Change**: Describe what the PR does.
- **Testing Done**: List the tests performed.
- **Security Considerations**: Address concerns like secure data storage, token handling, input validation, and deep link handling.
- **Performance Considerations**: Address concerns like hook optimization (`useCallback`, `useMemo`), `FlatList` optimization, and asynchronous patterns.
- **Checklist**: General checks, including checking whether an Architectural Decision Record (ADR) is needed.

## Fast-Fail Syntax Gate

We have a dedicated **Syntax Gate** workflow (`.github/workflows/syntax.yml`) that runs on every pull request `opened` or `synchronize` event.

- Checks TypeScript compiler errors (`tsc --noEmit`) and ESLint (`eslint --max-warnings=0`)
- Optimized to complete in **under 90 seconds** using caching
- Required for branch protection — PRs cannot be merged if it fails
- Run checks locally before pushing to avoid CI failures

## Structured Logging

**Never use `console.*` in `src/`.** The ESLint `no-console` rule is set to `error`, and CI will fail if any `console.*` call is introduced. Use `src/utils/logger` instead.

### Why structured logging?

`console.log` output is unstructured, always-on, and leaks information in production builds. `logger` gives you:
- Log level filtering (only `error` and `warn` in production)
- Consistent metadata (timestamp, component context)
- A single place to redirect logs to remote monitoring (e.g. Sentry, Datadog)

### Log level guide

| Level | Method | When to use |
|---|---|---|
| **error** | `logger.error(msg, err?)` | Unexpected failures that need immediate attention. Always include the `Error` object as the second argument. |
| **warn** | `logger.warn(msg, ctx?)` | Recoverable issues or deprecated code paths that should be investigated. |
| **info** | `logger.info(msg, ctx?)` | Key lifecycle events: component mount/unmount, navigation, background sync. Keep them meaningful, not noisy. |
| **debug** | `logger.debug(msg, ctx?)` | Verbose detail useful during development only. Stripped from production builds. |
| **component** | `logger.component(name, event, ctx?)` | Convenience wrapper for component lifecycle events — equivalent to `info` with a standardised format. |

### Examples

```ts
// ✅ Correct
import { logger } from '../../utils/logger';

logger.component('MyScreen', 'Mounted', { userId });
logger.info('Resuming lesson from position:', position);
logger.warn('Quiz data missing for section:', sectionId);
logger.error('Failed to sync progress:', error);

// ❌ Incorrect — will fail CI
console.log('user mounted', userId);
console.error('sync failed', error);
```

### Audit

CI runs a console violation scan on every push. To run it locally:

```bash
grep -rn "console\." src/ --include='*.ts' --include='*.tsx'
```

Zero matches is the expected output.

## Local Quality Checks

You can run the checks locally:

```bash
# Run ESLint linting
npm run lint

# Check formatting
npm run format:check

# Run TypeScript type check
npx tsc --noEmit
```
