# Location Data Strategy

This document describes how TeachLink Mobile fetches and reuses device
location to keep location-based features fast while protecting battery life.

## Goals

- 📍 Faster location-based features
- 🔋 Reduced GPS usage
- ⚡ Better battery life

## Building blocks

| Concern    | Where                       |
| ---------- | --------------------------- |
| Geo math   | `src/utils/geoUtils.ts`     |
| Service    | `src/services/location.ts`  |
| React hook | `src/hooks/useLocation.ts`  |

The actual hardware read is delegated to a `PositionReader`, backed by Expo
Location by default and lazily required so the module loads even where
`expo-location` is unavailable. This also makes the service easy to drive with
an injected reader.

## 1. Caching

`LocationService` keeps the most recent fix in memory and persists it to
AsyncStorage (`last_location_v1`), hydrated on mount via `useLocation`. A
subsequent `getCurrentPosition` call reuses that fix instead of waking the GPS
chip when it is younger than `maxAgeMs` (default **60s**).

Concurrent callers are coalesced onto a single in-flight hardware read, so a
screen that mounts several location-aware widgets triggers at most one GPS read.

Pass `forceFresh: true` to bypass the cache when a guaranteed-current fix is
required.

## 2. Precision tiers (100m vs 1m)

Callers declare the accuracy they actually need rather than always asking for
the most precise (and most expensive) reading:

| Tier     | Accuracy | Expo accuracy        | Power | Grid decimals |
| -------- | -------- | -------------------- | ----- | ------------- |
| `coarse` | ~100m    | `Accuracy.Balanced`  | low   | 3             |
| `fine`   | ~1m      | `Accuracy.Highest`   | high  | 5             |

`coarse` is the **default**. Returned coordinates are snapped to the tier's grid
so that physically-close requests produce identical values, which is what makes
caching and batching effective. Reserve `fine` for flows that genuinely need
metre-level accuracy (e.g. exact check-in).

## 3. Batching nearby queries

Location-keyed backend calls (e.g. "courses near me") go through
`batchNearbyQuery`. Requests are bucketed by their **precision cell** and
flushed together after a short window (`BATCH_WINDOW_MS`, 50ms). Every request
that lands in the same cell runs the underlying query **once** and the result is
fanned out to all callers, eliminating duplicate round-trips for nearby users or
for several components asking at the same moment.

## Usage

```tsx
import useLocation from '../hooks/useLocation';

function NearbyCourses() {
  const { refresh, queryNearby } = useLocation({ precision: 'coarse' });

  useEffect(() => {
    refresh().then((pos) => {
      if (!pos) return;
      queryNearby(pos.coords, (c) => api.getCoursesNear(c)).then(setCourses);
    });
  }, []);
}
```

For an exact-accuracy flow:

```ts
const pos = await locationService.getCurrentPosition({
  precision: 'fine',
  forceFresh: true,
});
```

## Battery & accuracy notes

- Default `coarse` reads map to `Accuracy.Balanced`, which avoids the GPS chip
  on most platforms — the single largest battery win.
- The 60s cache TTL plus in-flight coalescing means rapid re-renders or several
  widgets cost at most one hardware read per minute; the persisted fix also lets
  the first read after launch often skip the GPS entirely.
- Batching collapses bursts of nearby queries into one network call.
- When verifying accuracy, compare snapped coordinates against the tier radius
  in `PRECISION_RADIUS_METERS` (5m for `fine`, 100m for `coarse`); positions
  within that radius are treated as equivalent by design.
```
