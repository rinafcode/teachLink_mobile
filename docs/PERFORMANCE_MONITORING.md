# Performance Monitoring

TeachLink Mobile ships with a layered performance monitoring stack that covers component
render timing, Core Web Vitals, crash reporting, and production analytics.

---

## Architecture Overview

```
AnalyticsProvider (root)
├── mobileAnalyticsService   – event ingestion & sampling
├── crashReportingService    – global JS / promise error handlers
└── webVitalsService         – LCP, FID, CLS, FCP, TTFB (web target)

useReactProfiler (hook)
└── Profiler (React built-in)
    └── ProfiledScreen (wrapper component)
```

---

## Metrics Definitions

### Image Delivery Metrics

| Metric | Key | Description |
|---|---|---|
| Image load time | `image_load_time` | End-to-end image render time from request start to display |
| Image fallback rate | `used_fallback` | Indicates when PNG fallback was required instead of WebP |
| Device density | `dpr` | Captured 1x/2x/3x to validate adaptive image variants |
| Optimization pipeline | `optimization` | Labels progressive image pipeline (`lqip_webp_progressive`) |

Image metrics are emitted from the shared `CachedImage` component so all user-facing
surfaces that use it contribute to the same monitoring stream.

### React Profiler Metrics

| Metric | Definition | Unit |
|---|---|---|
| `render_duration` | `actualDuration` reported by React's `Profiler` — wall-clock time spent rendering the committed subtree | ms |
| Slow render | Any render where `actualDuration > slowRenderThresholdMs` (default 16 ms / 1 frame at 60 fps) | — |
| `averageRenderDurationMs` | Rolling mean of the last `maxSamples` (default 100) render durations | ms |

### Core Web Vitals (web target)

| Metric | Good | Needs Improvement | Poor | Description |
|---|---|---|---|---|
| LCP | ≤ 2500 ms | ≤ 4000 ms | > 4000 ms | Largest Contentful Paint |
| FID | ≤ 100 ms | ≤ 300 ms | > 300 ms | First Input Delay |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 | Cumulative Layout Shift |
| FCP | ≤ 1800 ms | ≤ 3000 ms | > 3000 ms | First Contentful Paint |
| TTFB | ≤ 800 ms | ≤ 1800 ms | > 1800 ms | Time to First Byte |

Thresholds are sourced from Google's Core Web Vitals recommendations and defined in
`src/services/webVitals.ts`.

### Navigation & Infrastructure

| Metric | Key | Description |
|---|---|---|
| Navigation latency | `navigation_latency` | Time between user tap and screen mount |
| App load time | `app_load_time` | Cold-start JS bundle load |
| Screen transition time | `screen_transition_time` | Animated navigation transition |
| API response time | `api_response_time` | Round-trip HTTP call |
| Time to interactive | `time_to_interactive` | App ready for full interaction |

---

## Usage

### Wrap a screen with `ProfiledScreen`

```tsx
import { ProfiledScreen } from '@/components/mobile/ProfiledScreen';

export default function HomeScreen() {
  return (
    <ProfiledScreen name="HomeScreen">
      <HomeContent />
    </ProfiledScreen>
  );
}
```

Every render is forwarded to `mobileAnalyticsService.trackPerformance`. Renders slower
than 16 ms also emit a `PERFORMANCE_METRIC` event with `is_slow: true` and a console
warning (visible in Metro logs).

### Use `useReactProfiler` directly

Use this when you need access to the live `metrics` object (e.g. a dev-only overlay):

```tsx
import { Profiler } from 'react';
import { useReactProfiler } from '@/hooks/useReactProfiler';

function MyComponent() {
  const { onRender, metrics } = useReactProfiler('MyComponent', {
    slowRenderThresholdMs: 32,  // 2 frames
    maxSamples: 50,
  });

  return (
    <Profiler id="MyComponent" onRender={onRender}>
      {/* your subtree */}
    </Profiler>
  );
}
```

### Initialise web vitals (automatic)

`webVitalsService.init()` is called inside `AnalyticsProvider` on app mount. No extra
setup is required. On React Native / non-browser environments the `web-vitals` functions
are no-ops, so the call is safe everywhere.

---

## Performance Baselines

Baselines are committed to `performance-baseline.json`. Update them after intentional
performance changes:

```bash
npm run perf:update-baseline
git add performance-baseline.json
git commit -m "perf: update baseline after <reason>"
```

CI regresses on any metric that worsens by > 5% vs the stored baseline (see
`docs/PERFORMANCE_THRESHOLDS.md`).

---

## Alerts & Regression Detection

### Slow-render alert

Logged to Metro console and sent as a `PERFORMANCE_METRIC` analytics event whenever a
single render exceeds `slowRenderThresholdMs`.

### Web Vitals regression

`webVitalsService` stores the first reading of each metric as a baseline. Subsequent
readings > 20% above baseline emit a `WEB_VITALS_REGRESSION` analytics event.

### Production crash threshold

`crashReportingService` counts unhandled JS errors. When the count reaches
`MAX_ERRORS_THRESHOLD` (5) it calls `alertProductionIssue`, which logs a `PRODUCTION
ALERT` warning. In a real deployment this would fan out to a Slack channel or PagerDuty.

---

## Related Documents

- [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) — component-level perf test guide
- [PERFORMANCE_THRESHOLDS.md](./PERFORMANCE_THRESHOLDS.md) — CI budget & regression gate
