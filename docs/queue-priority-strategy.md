# Request Queue Priority Strategy

## Overview

The `RequestQueue` service (`src/services/api/requestQueue.ts`) manages offline requests that fail due to network errors. It persists requests to AsyncStorage, supports priority levels, and batches similar requests during sync.

## Priority Levels

| Priority | Value | Use Case |
|----------|-------|----------|
| critical | 0 | Auth tokens, payments, enrollments |
| high     | 1 | Course progress, quiz submissions |
| normal   | 2 | Profile updates, content likes |
| low      | 3 | Analytics events, read-ahead fetches |

The queue is sorted by priority then FIFO within each priority level.

## Persistence

- All queued requests are stored in AsyncStorage under `@teachlink_request_queue`
- Queue metrics are persisted under `@teachlink_queue_metrics`
- On app restart, `resume()` restores pending requests from storage

## Batch Processing

During sync, requests with the same method + endpoint are grouped:

- **PUT/PATCH**: Payloads are merged into a single request
- **GET**: Executed in parallel via `Promise.allSettled`
- **POST/DELETE**: Processed individually within the batch

## Analytics

Queue events are tracked via `mobileAnalyticsService.trackEvent()`:
- `request_queued` — when a request enters the queue
- `request_dequeued` — when a request succeeds
- `queue_batch_synced` — when a batch merge succeeds
- `queue_resumed` — on app restart with pending requests

## Usage

```ts
import { requestQueue } from '../services/api/requestQueue';

// Add with priority
await requestQueue.addToQueue(config, 'high');

// Check status
const status = await requestQueue.getQueueStatus();

// Monitor from hook
import { usePendingRequests } from '../hooks/usePendingRequests';
const count = usePendingRequests();
const { pendingCount, byPriority } = usePendingRequests('critical');
```
