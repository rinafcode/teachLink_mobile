# Error Boundary Strategy

## Overview

`ErrorBoundary` is the single React class error boundary in the app. It lives at
`src/components/common/ErrorBoundary.tsx` and is exported from `src/components`.

It is the consolidation of three former implementations — `ErrorBoundary`,
`RetryErrorBoundary` and `ScreenErrorBoundary` — into one component whose behaviour
is driven by props:

- **Reporting** — every caught error is reported to Sentry (tagged with the
  boundary name) and to the centralised logger, unconditionally.
- **Fallback** — a consistent fallback UI is shown once an error is surfaced.
- **Auto-retry** (opt-in via `autoRetry`) — silently recovers from **transient
  render errors** before ever showing an error screen.
- **Route-key reset** (opt-in via `resetKeys`) — auto-clears a stale error when a
  reset key (e.g. the route key) changes.

All three are off by default, so a plain `<ErrorBoundary>` behaves exactly like the
original: an error is reported and the fallback is shown immediately.

## Where error handling connects

`crashReportingService.reportError` sends the error and the boundary name to Sentry
via a scope tagged `errorBoundary`. The Sentry scope also carries `boundaryName` and
the React `componentStack` as extras, so every caught error is attributed to the
boundary that caught it.

## Retry strategy (opt-in)

Pass `autoRetry` to enable silent automatic retries with exponential backoff
`delay = baseDelayMs * 2 ^ retryCount`, capped at 10,000 ms. With the default
`baseDelayMs` of 500 ms and `maxRetries` of 3:

| Attempt                             | Delay before retry |
| ----------------------------------- | ------------------ |
| 1st                                 | 500ms              |
| 2nd                                 | 1000ms             |
| 3rd                                 | 2000ms             |
| Fallback UI shown after 3rd failure |

Every caught error is logged through the centralised `appLogger`:

- `appLogger.errorSync('Error boundary caught error', …)` — each caught error.
- `appLogger.infoSync('Error boundary scheduling retry', { retryCount, delayMs })` — before each retry.
- `appLogger.infoSync('Error boundary retry succeeded', { retryCount })` — when a retry recovers.
- `appLogger.warnSync('Max retries reached for error boundary', …)` — when retries are exhausted.

## Props reference

| Prop                  | Type                                                     | Default                    | Description                                                                                           |
| --------------------- | -------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `children`            | `React.ReactNode`                                        | —                          | The child tree guarded by the boundary.                                                               |
| `fallback`            | `React.ReactNode \| ((props) => React.ReactNode)`        | default fallback           | Fallback UI. The render function receives `{ error, errorInfo, resetError }`.                         |
| `boundaryName`        | `string`                                                 | `'ErrorBoundary'`          | Used to identify the boundary in logs and in the Sentry `errorBoundary` tag.                          |
| `onError`             | `(error, errorInfo) => void`                             | —                          | Called on every caught error.                                                                         |
| `onReset`             | `() => void`                                             | —                          | Called when the boundary resets (Retry button or `resetKeys` change).                                 |
| `autoRetry`           | `boolean`                                                | `false`                    | Enables silent automatic retries with exponential backoff.                                            |
| `maxRetries`          | `number`                                                 | `3`                        | Maximum automatic retries before the fallback UI is shown (used when `autoRetry`).                    |
| `baseDelayMs`         | `number`                                                 | `500`                      | Delay (ms) before the first retry; doubles each subsequent attempt.                                   |
| `isTransient`         | `(error: Error) => boolean`                              | retries everything         | Classifies an error as retryable. Returning `false` skips retries and shows the fallback immediately. |
| `onRetrySuccess`      | `(retryCount) => void`                                   | —                          | Called when an automatic retry re-renders the children successfully.                                  |
| `onMaxRetriesReached` | `(error) => void`                                        | —                          | Called when retries are exhausted or the error is non-transient.                                      |
| `resetKeys`           | `ReadonlyArray<unknown>`                                 | —                          | When any value changes while an error is caught, the boundary auto-resets.                            |

## Usage examples

### 1. Basic boundary (default behaviour)

```tsx
import { ErrorBoundary } from '@/components';

<ErrorBoundary boundaryName="ProfileScreen">
  <ProfileScreen />
</ErrorBoundary>;
```

### 2. Automatic retry at the root of the app

The root layout uses a single boundary with both a name and automatic retry
(`app/_layout.tsx`), replacing the former double `ErrorBoundary` +
`RetryErrorBoundary` nesting:

```tsx
<ErrorBoundary boundaryName="RootLayout" autoRetry>
  {/* ... */}
</ErrorBoundary>;
```

### 3. Custom fallback render function

```tsx
<ErrorBoundary
  boundaryName="CourseViewer"
  fallback={({ resetError }) => (
    <View>
      <Text>We couldn't load this screen.</Text>
      <Button title="Retry" onPress={resetError} />
    </View>
  )}
>
  <CourseViewer />
</ErrorBoundary>;
```

### 4. Retry only network-class errors

```tsx
const isNetworkError = (error: Error): boolean =>
  /network|timeout|connection|fetch/i.test(error.message);

<ErrorBoundary boundaryName="CourseList" autoRetry isTransient={isNetworkError}>
  <CourseList />
</ErrorBoundary>;
```

When `isTransient` returns `false`, the boundary skips the backoff/retry cycle entirely,
calls `onMaxRetriesReached`, and renders the fallback UI on the first failure.

### 5. Auto-reset on navigation

Pass the current route key as a `resetKeys` entry so a recovered screen re-mounts
cleanly when navigation changes, instead of staying on the fallback:

```tsx
<ErrorBoundary boundaryName="Details" resetKeys={[routeKey]}>
  <DetailsScreen />
</ErrorBoundary>;
```

## When NOT to use

React error boundaries only catch errors thrown during **render**, in **lifecycle
methods**, and in **child constructors**. They do not help with:

- **Event handler errors** (e.g. `onPress`) — wrap those in `try/catch`.
- **Asynchronous errors** (promises, `setTimeout`, `fetch` callbacks) — handle them where
  the async work happens; they never reach the boundary.
- **Server-side rendering** — boundaries don't catch SSR errors.
- **Non-transient errors** — a genuinely broken component will fail every retry. Use
  `isTransient` to skip pointless retries and fail fast (see above).

## Classifying transient errors

By default every caught error is treated as transient and retried. Pass an `isTransient`
predicate to retry only the errors actually worth retrying — typically network or timeout
errors — and to show the fallback immediately for everything else. The predicate receives
the thrown `Error`, so it can inspect `error.message` or a custom property.
