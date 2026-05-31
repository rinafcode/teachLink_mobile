# Performance Thresholds & Regression Testing

TeachLink CI automatically detects performance regressions on every push and pull request.
Any metric that worsens by **more than 5%** vs the stored baseline will fail the build.

---

## Thresholds

| Metric                | Budget   | Regression Gate          |
| --------------------- | -------- | ------------------------ |
| Bundle size (Android) | 2.5 MB   | >5% increase vs baseline |
| Bundle size (iOS)     | 2.5 MB   | >5% increase vs baseline |
| Bundle size (total)   | 5 MB     | >5% increase vs baseline |
| Startup time p95      | 2 000 ms | >5% increase vs baseline |
| API latency p95       | 1 000 ms | >5% increase vs baseline |
| API latency p99       | 2 000 ms | >5% increase vs baseline |
| API error rate        | < 1%     | absolute (k6 threshold)  |

Absolute budgets are defined in [`performance-budget.json`](../performance-budget.json).
The regression baseline is stored in [`performance-baseline.json`](../performance-baseline.json).

---

## CI Workflow

The workflow (`.github/workflows/performance-regression.yml`) runs four jobs:

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
- 3-stage load: ramp 0→5 VUs (10s), hold 10 VUs (20s), ramp down (10s)
- k6 built-in thresholds: `p(95)<1000ms`, `p(99)<2000ms`, `error_rate<1%`
- Compares p95 against the cached baseline
- Fails if p95 API latency grew by >5%

### 4. `regression-gate`

- Downloads all three reports
- Runs `scripts/checkPerfRegression.js` for a consolidated view
- Posts a summary table as a PR comment (updates existing comment on re-runs)
- Fails the gate if any metric regressed by >5%

---

## Baseline Management

Baselines are stored in two places:

| Store                                         | Purpose                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| `performance-baseline.json` (committed)       | Human-readable reference; used by `checkPerfRegression.js` |
| GitHub Actions cache (`perf-*-baseline-main`) | Per-job comparison; updated on every `main` push           |

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
npm run perf:startup

# API latency (requires k6 installed: https://k6.io/docs/get-started/installation/)
k6 run scripts/k6-api-benchmark.js

# Consolidated regression check (reads reports/ directory)
npm run perf:regression

# Update baseline from latest reports
npm run perf:update-baseline
```

---

## Tuning the Threshold

The regression threshold defaults to **5%**. To change it:

- **CI**: set the `REGRESSION_THRESHOLD` env var in the workflow step
- **Local**: `REGRESSION_THRESHOLD=10 npm run perf:regression`

---

## Related Issues

- #31 — Bundle size tracking
- #32 — Startup time benchmark
- #34 — API latency regression detection
