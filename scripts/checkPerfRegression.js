#!/usr/bin/env node
/**
 * Performance Regression Check
 *
 * Compares current benchmark results against the stored baseline.
 * Fails (exit 1) if any metric regressed by more than REGRESSION_THRESHOLD (default 5%).
 *
 * Usage:
 *   node scripts/checkPerfRegression.js
 *   REGRESSION_THRESHOLD=10 node scripts/checkPerfRegression.js
 *
 * Reads:
 *   performance-baseline.json          — baseline values
 *   reports/startup-benchmark.json     — current startup results
 *   reports/k6-summary.json            — current API latency results
 *   reports/bundle-sizes.json          — current bundle sizes (written by CI)
 *
 * Writes:
 *   reports/regression-report.json     — full comparison report
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const THRESHOLD = parseFloat(process.env.REGRESSION_THRESHOLD || '5');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function regressionPct(baseline, current) {
  if (!baseline || baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

function check(label, baselineVal, currentVal, threshold) {
  if (baselineVal == null || currentVal == null) {
    return { label, status: 'skip', reason: 'missing data' };
  }
  const pct = regressionPct(baselineVal, currentVal);
  const regressed = pct > threshold;
  return {
    label,
    baseline: baselineVal,
    current: currentVal,
    change_pct: parseFloat(pct.toFixed(2)),
    threshold_pct: threshold,
    status: regressed ? 'fail' : 'pass',
  };
}

function main() {
  const baseline = readJSON(path.join(ROOT, 'performance-baseline.json'));
  if (!baseline) {
    console.warn('⚠️  No performance-baseline.json found — skipping regression check');
    process.exit(0);
  }

  const startup = readJSON(path.join(REPORTS, 'startup-benchmark.json'));
  const k6 = readJSON(path.join(REPORTS, 'k6-summary.json'));
  const bundle = readJSON(path.join(REPORTS, 'bundle-sizes.json'));

  const checks = [];

  // Bundle size checks
  if (bundle) {
    checks.push(
      check(
        'bundle.android_bytes',
        baseline.bundleSize?.android_bytes,
        bundle.android_bytes,
        THRESHOLD
      )
    );
    checks.push(
      check('bundle.ios_bytes', baseline.bundleSize?.ios_bytes, bundle.ios_bytes, THRESHOLD)
    );
    checks.push(
      check('bundle.total_bytes', baseline.bundleSize?.total_bytes, bundle.total_bytes, THRESHOLD)
    );
  }

  // Startup time checks
  if (startup?.metrics) {
    checks.push(
      check('startup.p95_ms', baseline.startupTime?.p95_ms, startup.metrics.p95, THRESHOLD)
    );
    checks.push(
      check('startup.p50_ms', baseline.startupTime?.p50_ms, startup.metrics.p50, THRESHOLD)
    );
  }

  // API latency checks
  if (k6?.metrics) {
    checks.push(check('api.p95_ms', baseline.apiLatency?.p95_ms, k6.metrics.p95, THRESHOLD));
    checks.push(check('api.p50_ms', baseline.apiLatency?.p50_ms, k6.metrics.p50, THRESHOLD));
    checks.push(check('api.p99_ms', baseline.apiLatency?.p99_ms, k6.metrics.p99, THRESHOLD));
  }

  const failures = checks.filter(c => c.status === 'fail');
  const passes = checks.filter(c => c.status === 'pass');
  const skipped = checks.filter(c => c.status === 'skip');

  const report = {
    timestamp: new Date().toISOString(),
    threshold_pct: THRESHOLD,
    summary: {
      total: checks.length,
      passed: passes.length,
      failed: failures.length,
      skipped: skipped.length,
    },
    checks,
  };

  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, 'regression-report.json'), JSON.stringify(report, null, 2));

  // Print table
  console.log(`\n📊 Performance Regression Report (threshold: ${THRESHOLD}%)\n`);
  console.log(
    `${'Metric'.padEnd(30)} ${'Baseline'.padStart(12)} ${'Current'.padStart(12)} ${'Change'.padStart(10)} ${'Status'.padStart(8)}`
  );
  console.log('─'.repeat(78));

  for (const c of checks) {
    if (c.status === 'skip') {
      console.log(
        `${c.label.padEnd(30)} ${'—'.padStart(12)} ${'—'.padStart(12)} ${'—'.padStart(10)} ${'SKIP'.padStart(8)}`
      );
      continue;
    }
    const changeStr = `${c.change_pct > 0 ? '+' : ''}${c.change_pct}%`;
    const statusStr = c.status === 'pass' ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${c.label.padEnd(30)} ${String(c.baseline).padStart(12)} ${String(c.current).padStart(12)} ${changeStr.padStart(10)} ${statusStr.padStart(8)}`
    );
  }

  console.log('─'.repeat(78));
  console.log(
    `\n  Passed: ${passes.length}  Failed: ${failures.length}  Skipped: ${skipped.length}\n`
  );

  if (failures.length > 0) {
    console.error(
      `❌ ${failures.length} performance regression(s) detected (>${THRESHOLD}% worse than baseline):`
    );
    for (const f of failures) {
      console.error(`   • ${f.label}: ${f.baseline} → ${f.current} (+${f.change_pct}%)`);
    }
    console.error('\nTo update the baseline after an intentional change:');
    console.error('  npm run perf:update-baseline\n');
    process.exit(1);
  }

  console.log('✅ No performance regressions detected');
}

main();
