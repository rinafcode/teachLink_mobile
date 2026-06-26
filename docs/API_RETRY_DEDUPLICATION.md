# API Retry & Deduplication Strategy

This document describes the retry (Issue #225) and request-deduplication (Issue #224) strategies implemented in the TeachLink Mobile API client.

---

## Issue #225 — Exponential Backoff with Jitter for Failed Requests

### Problem

Failed API requests were retried with a flat 2-retry strategy capped at 10 s. This creates thundering-herd load on a recovering server and gives up too early.

### Solution

All `5xx` server-error responses are now retried with **full jitter exponential backoff**:

```
delay = min(1000 ms × 2^attempt, 60 000 ms) × jitter(±10 %)
```

| Attempt | Base delay | Jitter range  |
| ------- | ---------- | ------------- |
| 1       | 1 s        | 0.9 – 1.1 s   |
| 2       | 2 s        | 1.8 – 2.2 s   |
| 3       | 4 s        | 3.6 – 4.4 s   |
| 4       | 8 s        | 7.2 – 8.8 s   |
| 5       | 16 s       | 14.4 – 17.6 s |
| 6       | 32 s       | 28.8 – 35.2 s |
| 7       | 60 s (cap) | 54 – 66 s     |

**Max retries**: 7  
**Max single delay**: 60 s (±10 %)  
**No infinite loops**: hard limit enforced, final rejection after 7 retries

#### Separate 429 handling

`429 Too Many Requests` retries are handled by a separate path with explicit delays `[1, 2, 4, 8]` s and a 5-retry limit. The jitter backoff only applies to `5xx` errors.

### Implementation

- **File**: `src/services/api/axios.config.ts`
- `getBackoffWithJitter(attempt)` — pure function, testable in isolation
- `MAX_SERVER_ERROR_RETRIES = 7`
- `BASE_DELAY_MS = 1_000`, `MAX_DELAY_MS = 60_000`

### Tests

```
tests/services/api/axios.config.test.ts
  describe('Issue #225 — Exponential Backoff with Jitter (Server Errors)')
```

---

## Issue #224 — Request Deduplication for Concurrent API Calls

### Problem

Rapid navigation or repeated user actions trigger multiple identical `GET` requests concurrently, each firing its own network call and increasing server load by 40–60 %.

### Solution

`RequestDeduplicator` wraps an in-flight `Promise` in a `Map` keyed by `METHOD:URL:params`. Concurrent callers with the same key share one network request; they all await the same `Promise`.

```ts
// Before: 3 concurrent GET /courses?page=1 → 3 network requests
// After:  3 concurrent GET /courses?page=1 → 1 network request, 3 callers resolved

const data = await apiService.get('/courses', { page: 1 });
```

#### Key features

| Feature                  | Detail                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Key**                  | `METHOD:URL:JSON.stringify(params)`                                                 |
| **Deduplication window** | Active until the first request resolves/rejects                                     |
| **AbortController**      | Every entry has its own controller                                                  |
| **Subscriber timeout**   | If all subscribers leave before the request finishes, it is cancelled after **5 s** |
| **Error propagation**    | All subscribers receive the same rejection                                          |
| **cancelAll()**          | Cancels everything — call on logout or when the API layer is torn down              |

### Implementation

- **New file**: `src/services/api/requestDeduplicator.ts` — `RequestDeduplicator` class + `requestDeduplicator` singleton
- **Modified**: `src/services/api/index.ts` — `apiService.get()` wraps `fetchWithSWR` with `requestDeduplicator.deduplicate()`

### Using the deduplicator directly

```ts
import { requestDeduplicator } from '@/services/api';

const result = await requestDeduplicator.deduplicate(
  { method: 'GET', url: '/courses', params: { page: 1 } },
  signal => fetch('/courses?page=1', { signal }).then(r => r.json())
);
```

### Tests

```
tests/services/api/requestDeduplicator.test.ts
```

---

## Related issues

- [#225](https://github.com/rinafcode/teachLink_mobile/issues/225) Implement exponential backoff for failed API requests
- [#224](https://github.com/rinafcode/teachLink_mobile/issues/224) Implement request deduplication for concurrent API calls
