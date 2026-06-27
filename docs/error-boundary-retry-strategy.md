# Error Boundary Retry Strategy

## Overview

`RetryErrorBoundary` is a React class error boundary that automatically recovers from
**transient render errors** before ever showing an error screen to the user. When a child
component throws during render, the boundary catches the error, waits for a short backoff
delay, and then re-renders the child tree. Many failures — a momentary missing value, a
race during data hydration, a transient native-module hiccup — succeed on the second or
third attempt. By retrying silently (with a subtle loading indicator) instead of
immediately rendering a "Something went wrong" screen, the app feels noticeably more
resilient. Only after the configured number of retries is exhausted (or when an error is
explicitly classified as non-transient) does the fallback UI appear.

## Retry strategy

Retries use exponential backoff: `delay = baseDelayMs * 2 ^ retryCount`, capped at
10,000 ms. With the default `baseDelayMs` of 500 ms and `maxRetries` of 3:

| Attempt                             | Delay before retry |
| ----------------------------------- | ------------------ |
| 1st                                 | 500ms              |
| 2nd                                 | 1000ms             |
| 3rd                                 | 2000ms             |
| Fallback UI shown after 3rd failure |

Every retry is logged through the centralised `appLogger`:

- `appLogger.errorSync('Error boundary caught error', …)` — each caught error.
- `appLogger.infoSync('Error boundary scheduling retry', { retryCount, delayMs })` — before each retry.
- `appLogger.infoSync('Error boundary retry succeeded', { retryCount })` — when a retry recovers.
- `appLogger.warnSync('Max retries reached for error boundary', …)` — when retries are exhausted.

## Props reference

| Prop                  | Type                                                     | Default                    | Description                                                                                           |
| --------------------- | -------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `children`            | `React.ReactNode`                                        | —                          | The child tree guarded by the boundary.                                                               |
| `maxRetries`          | `number`                                                 | `3`                        | Maximum automatic retries before the fallback UI is shown.                                            |
| `baseDelayMs`         | `number`                                                 | `500`                      | Delay (ms) before the first retry; doubles each subsequent attempt.                                   |
| `onError`             | `(error, errorInfo, retryCount) => void`                 | —                          | Called on every caught error, with the current retry count.                                           |
| `onRetrySuccess`      | `(retryCount) => void`                                   | —                          | Called when a retry re-renders the children successfully.                                             |
| `onMaxRetriesReached` | `(error) => void`                                        | —                          | Called when retries are exhausted or the error is non-transient.                                      |
| `fallback`            | `React.ReactNode \| ((error, retry) => React.ReactNode)` | `<DefaultErrorFallback />` | Fallback UI. A node, or a render function receiving the error and a manual retry handler.             |
| `isTransient`         | `(error) => boolean`                                     | retries everything         | Classifies an error as retryable. Returning `false` skips retries and shows the fallback immediately. |

## Usage examples

### 1. Basic usage (defaults)

```tsx
// from app/_layout.tsx the boundary lives in the top-level components/ directory
import { RetryErrorBoundary } from '../components/ErrorBoundary/RetryErrorBoundary';

<RetryErrorBoundary>
  <MyScreen />
</RetryErrorBoundary>;
```

### 2. Custom fallback render function

```tsx
<RetryErrorBoundary
  maxRetries={5}
  baseDelayMs={250}
  fallback={(error, retry) => (
    <View>
      <Text>We couldn't load this screen.</Text>
      <Button title="Retry" onPress={retry} />
    </View>
  )}
>
  <MyScreen />
</RetryErrorBoundary>
```

### 3. With metrics tracking via `useErrorBoundaryMetrics`

```tsx
import { useErrorBoundaryMetrics } from '../hooks/useErrorBoundaryMetrics';

function GuardedScreen({ children }: { children: React.ReactNode }) {
  const { metrics, recordError, recordRetrySuccess, recordRetryFailure } =
    useErrorBoundaryMetrics();

  return (
    <RetryErrorBoundary
      onError={() => recordError()}
      onRetrySuccess={() => recordRetrySuccess()}
      onMaxRetriesReached={() => recordRetryFailure()}
    >
      {children}
    </RetryErrorBoundary>
  );
}
```

`metrics.successRate` is derived as `successfulRetries / totalRetries` (0 when there have
been no retries) and can be surfaced on a diagnostics screen or forwarded to analytics.

## When NOT to use

React error boundaries only catch errors thrown during **render**, in **lifecycle
methods**, and in **child constructors**. They do not help with:

- **Event handler errors** (e.g. `onPress`) — wrap those in `try/catch`.
- **Asynchronous errors** (promises, `setTimeout`, `fetch` callbacks) — handle them where
  the async work happens; they never reach the boundary.
- **Server-side rendering** — boundaries don't catch SSR errors.
- **Non-transient errors** — a genuinely broken component will fail every retry. Use
  `isTransient` to skip pointless retries and fail fast (see below).

## Classifying transient errors

By default every caught error is treated as transient and retried. Pass an `isTransient`
predicate to retry only the errors that are actually worth retrying — typically network or
timeout errors — and to show the fallback immediately for everything else:

```tsx
const isNetworkError = (error: Error): boolean =>
  /network|timeout|connection|fetch/i.test(error.message);

<RetryErrorBoundary isTransient={isNetworkError}>
  <CourseList />
</RetryErrorBoundary>;
```

When `isTransient` returns `false`, the boundary skips the backoff/retry cycle entirely,
calls `onMaxRetriesReached`, and renders the fallback UI on the first failure.
