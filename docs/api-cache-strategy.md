# API Cache Strategy

## Overview

API reads use a three-tier stale-while-revalidate cache:

1. **Memory:** fastest tier for the active app session.
2. **AsyncStorage:** persistent tier used after cold start or memory pressure.
3. **Network:** source of truth when both local tiers miss or data is outside the stale window.

`fetchWithSWR()` always checks memory first, then AsyncStorage, then the network. Fresh cached data returns immediately. Stale-but-valid data also returns immediately while a background network request refreshes both local tiers.

## Data Types

| Data type         | Cache key pattern       | Tags                     | Fresh TTL      | Stale window   | Warmed on startup       | Invalidation                            |
| ----------------- | ----------------------- | ------------------------ | -------------- | -------------- | ----------------------- | --------------------------------------- |
| Course list       | `courses:list`          | `courses`                | 2 minutes      | 10 minutes     | Yes                     | Any successful course mutation          |
| Course pages      | `courses:cursor-page:*` | `courses`                | 2 minutes      | 10 minutes     | First read path         | Any successful course mutation          |
| Course detail     | `courses:{id}`          | `courses`, `course:{id}` | 2 minutes      | 10 minutes     | On demand               | Course mutation for list or matching id |
| User profile      | `users:{id}`            | `users`, `user:{id}`     | 5 minutes      | 15 minutes     | Yes, when authenticated | User mutation for list or matching id   |
| Generic resources | Caller-defined          | Caller-defined           | Caller-defined | Caller-defined | Caller-defined          | Matching mutation resource tag          |

## Mutation Invalidation

Successful `POST`, `PUT`, `PATCH`, and `DELETE` responses trigger targeted invalidation through the Axios response interceptor. Direct mutations invalidate by URL resource:

- `/courses` invalidates all entries tagged `courses`.
- `/courses/{id}` invalidates `courses` and `course:{id}`.
- `/users` invalidates all entries tagged `users`.
- `/users/{id}` invalidates `users` and `user:{id}`.

The API batch endpoint is handled separately. Since batched reads are sent through `POST /api/batch`, the interceptor parses the batched payload and only invalidates entries for actual mutation operations inside the batch.

## Startup Warming

`warmCriticalCaches()` runs during splash-screen initialization before first render. It warms:

- the course list for the home feed
- the authenticated user's profile when a user id is already available

Warming is best effort and never blocks startup on failures. Failed warm requests are swallowed so screens can still render from cached or loading states.

## Metrics

`getCacheStats()` exposes:

- hit rate
- memory hits
- AsyncStorage hits
- network fetch count
- background revalidations
- invalidation count
- estimated network reduction rate

The cache reports `PERFORMANCE_METRIC` analytics events under `api_cache_hit_rate` at a throttled cadence. The app also surfaces a lightweight revalidation banner during background refreshes so testers can see when stale data is being updated in the background and how long the cached payload has been waiting for a refresh.
