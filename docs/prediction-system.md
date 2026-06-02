# Predictive Resource Preloading

This document describes how TeachLink Mobile anticipates the user's next action
and preloads the resources behind it, so navigation feels instantaneous.

## Goals

- ⚡ Faster perceived interactions
- 🎯 Anticipatory UX — resources loaded **before** the user navigates

## Building blocks

| Concern              | Where                                 |
| -------------------- | ------------------------------------- |
| Prediction + preload | `src/services/preloadService.ts`      |
| React hook           | `src/hooks/usePredictivePreload.ts`   |

## 1. Analyzing interaction patterns

Navigation is the primary interaction signal. Each route transition is reported
to `preloadService.recordTransition(from, to)` (the `usePredictivePreload` hook
exposes this). Paths are normalized first (`normalizePath`) so dynamic segments
and query strings (e.g. `/profile/123?tab=x`) collapse to a stable key
(`/profile/[userId]`) and don't bloat the model.

Transitions are accumulated into a first-order **Markov transition matrix**:
`from-screen -> { next-screen -> count }`, persisted to offline storage
(`@teachlink_nav_matrix`) and restored on `init()`, so predictions improve
across sessions.

## 2. Predicting the next action

`getPredictiveDestinations(currentScreen, limit)` ranks the next screens by
observed frequency and merges in `STATIC_DEFAULTS` (sensible fallbacks for cold
starts), returning the top `limit` candidates.

## 3. Preloading before the action

`preload(currentScreen, router)` runs multi-tier, fire-and-forget preloading for
the predicted destinations, guarded so it never harms the user:

- **Guards** — skipped when prefetch is paused (memory pressure), when Data
  Saver is on, when offline, or when "WiFi only" is set and on cellular.
- **Tier A — route chunks**: `router.prefetch(destination)` warms the JS bundle.
- **Tier B — data & assets**: per-destination, the relevant API calls and media
  are warmed (e.g. course list/detail + thumbnail for `/course-viewer`, user
  profile for `/profile/[userId]`, quiz progress for `/quiz`).

Preload latency is reported via `mobileAnalyticsService.trackPerformance(
'predictive_preload_latency', ...)`.

## 4. Measuring prediction accuracy

Accuracy is measured **online** and model-only (independent of whether a preload
actually ran). On every real `recordTransition(from, to)`, before the matrix is
updated, the service computes what it *would* have predicted for `from` and
checks whether the actual `to` was among those predictions:

- a match counts as a **hit**,
- accuracy = `hits / evaluated`.

`preloadService.getPredictionAccuracy()` (also surfaced by the hook) returns
`{ evaluated, hits, accuracy }`. `resetPredictionAccuracy()` clears the counters
between measurement windows. Wire the metric into an analytics dashboard to
monitor prediction quality across users and tune `STATIC_DEFAULTS` / the limit.

## Usage

```tsx
import usePredictivePreload from '../hooks/usePredictivePreload';

function Screen({ pathname, previousPathname }) {
  const { preload, recordTransition, getPredictionAccuracy } =
    usePredictivePreload();

  useEffect(() => {
    // Learn the transition + evaluate the prediction that preceded it.
    recordTransition(previousPathname, pathname);
    // Warm resources for the likely next screens.
    void preload(pathname);
  }, [pathname]);

  // getPredictionAccuracy() -> { evaluated, hits, accuracy }
}
```

## Tuning & testing

- **Various users**: `getPredictionAccuracy()` can be emitted as an analytics
  event so accuracy can be compared across user cohorts; the per-user model is
  persisted, so accuracy rises as each user's history accumulates.
- **`STATIC_DEFAULTS`**: cold-start fallbacks — adjust per the most common
  first-session flows.
- **`limit`** (default 2): higher preloads more aggressively (more hits, more
  bandwidth); lower is leaner. Combine with the Data Saver / WiFi-only guards to
  bound battery and data cost.
```
