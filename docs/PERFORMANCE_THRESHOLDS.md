# Performance Thresholds & Regression Testing

TeachLink CI automatically detects performance regressions on every push and pull request.
Any metric that worsens by **more than 5%** vs the stored baseline will fail the build.

---

## Absolute Budgets

Absolute budgets are defined in [`performance-budget.json`](../performance-budget.json).
Every gated metric must have a documented budget below.

### Bundle Size

| Metric | Budget | Rationale |
|---|---|---|
| Android bundle | 2.5 MB | Keeps install size under Play Store's "large app" warning threshold (50 MB download). Covers JS + assets for a mid-complexity educational app. |
| iOS bundle | 2.5 MB | Mirrors Android for parity. iOS has higher memory overhead, so the bundle should be conservative. |
| Total (all platforms) | 5 MB | Aggregate cap across Android + iOS ensures neither platform silently grows while the other stays flat. |

### Startup Time

| Metric | Budget | Rationale |
|---|---|---|
| p50 | 1 000 ms | Median user should see the splash screen dismissed within 1 s. |
| p95 | 2 000 ms | Worst-case 95th-percentile budget based on Google's "Time to Interactive" guidance for mobile web. |

### Frame Rate

| Metric | Budget | Rationale |
|---|---|---|
| Min FPS | ≥ 55 fps | Targeting smooth 60 fps with a small margin. Drops below 55 fps cause visible jank. |
| Max dropped frames / session | ≤ 5 | More than 5 dropped frames per session is perceptible and correlates with poor App Store reviews. |

### API Latency

| Metric | Budget | Rationale |
|---|---|---|
| p50 | 300 ms | Median response should be near-instant; users perceive > 300 ms as sluggish. |
| p95 | 1 000 ms | The 95th percentile covers regional CDN variations and cold-start penalties. |
| p99 | 2 000 ms | Upper bound — the slowest 1 % of requests should still complete within 2 s. |

### Memory

| Metric | Budget | Rationale |
|---|---|---|
| Max heap | 128 MB | Exceeding 128 MB heap triggers GC pauses > 50 ms on mid-range Android devices. |
| Max native | 80 MB | Native memory (images, fonts, video) should stay under 80 MB to avoid OOM kills on low-RAM devices. |

### Lighthouse

| Metric | Budget | Rationale |
|---|---|---|
| Performance score | ≥ 50 | Minimum passing score for CI. Higher scores require further optimisation work. |
| FCP | ≤ 3 000 ms | First Contentful Paint — users see initial content within 3 s. |
| LCP | ≤ 4 000 ms | Largest Contentful Paint — main content is visible within 4 s. |
| CLS | ≤ 0.25 | Cumulative Layout Shift — below the "needs improvement" threshold. |
| TBT | ≤ 3 000 ms | Total Blocking Time — main thread is responsive. |
| Speed Index | ≤ 4 000 ms | Visual completeness within 4 s. |
| TTI | ≤ 5 000 ms | Time to Interactive — app is fully interactive within 5 s. |

---

## Regression Gate

The CI workflow (`.github/workflows/performance-regression.yml`) runs four jobs and a
consolidated regression gate:

### 1. `bundle-size`

- Builds Android and iOS bundles with `expo export`
- Measures total bytes
- Compares against the cached baseline from the last `main` push
- Fails if total bundle size grew by >5%

### 2. `startup-time`

- Runs `scripts/measureStartupTime.js` (10 iterations, Node.js proxy measurement)
- Reports p50 / p95 / min / max
- Compares p95 against the cached baseline
- Fails if p95 startup time grew by >5%

### 3. `api-latency`

- Installs [k6](https://k6.io) and runs `scripts/k6-api-benchmark.js`
- 3-stage load: ramp 0→5 VUs (10 s), hold 10 VUs (20 s), ramp down (10 s)
- k6 built-in thresholds: `p(95)<1000 ms`, `p(99)<2000 ms`, `error_rate<1%`
- Compares p95 against the cached baseline
- Fails if p95 API latency grew by >5%

### 4. `regression-gate`

- Downloads all three reports
- Runs `scripts/checkPerfRegression.js` for a consolidated view
- **Missing metrics fail the check** — a null baseline or null current value
  is treated as a regression, not silently skipped
- Posts a summary table as a PR comment (updates existing comment on re-runs)
- Fails the gate if any metric regressed by >5% or is missing

---

## Baseline Management

Baselines are stored in two places:

| Store | Purpose |
|---|---|
| `performance-baseline.json` (committed) | Human-readable reference; used by `checkPerfRegression.js` |
| GitHub Actions cache (`perf-*-baseline-main`) | Per-job comparison; updated on every `main` push |

### Baseline regeneration guard

`npm run perf:update-baseline` will **refuse to run** if the current baseline
contains fabricated data (`"fabricated": true`). The audit analyzers that use
`Math.random()` to generate fake metrics must be replaced with real measurements
before the baseline chain is trusted:

- `src/audit/analyzers/MemoryAnalyzer.ts` — fabricated `avgRenderTime`, `renders`, `droppedFrames`
- `src/audit/analyzers/RuntimeAnalyzer.ts` — fabricated event loop lag
- `src/audit/analyzers/NetworkAnalyzer.ts` — fabricated `avgLatency`, `errorRate`, `requests`, `dataSize`

### Updating the baseline

After an intentional performance change (e.g. adding a new screen, upgrading a library):

```bash
# 1. Run benchmarks locally
node scripts/measureStartupTime.js
node scripts/checkApiPerf.js

# 2. Write results to reports/
mkdir -p reports
# (or let CI generate them)

# 3. Update the committed baseline
npm run perf:update-baseline

# 4. Commit
git add performance-baseline.json
git commit -m "perf: update baseline after <reason>"
```

The GitHub Actions cache baselines update automatically on every successful `main` push.

---

## Running Locally

```bash
# Startup time benchmark (10 iterations)
node scripts/measureStartupTime.js

# API latency (requires k6 installed: https://k6.io/docs/get-started/installation/)
k6 run scripts/k6-api-benchmark.js

# Consolidated regression check (reads reports/ directory)
node scripts/checkPerfRegression.js

# Update baseline from latest reports
npm run perf:update-baseline
```

---

## Tuning the Threshold

The regression threshold defaults to **5%**. To change it:

- **CI**: set the `REGRESSION_THRESHOLD` env var in the workflow step
- **Local**: `REGRESSION_THRESHOLD=10 node scripts/checkPerfRegression.js`

---

## Related Issues

- #31 — Bundle size tracking
- #32 — Startup time benchmark
- #34 — API latency regression detection
