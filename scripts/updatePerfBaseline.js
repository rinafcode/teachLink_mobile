#!/usr/bin/env node
/**
 * Update Performance Baseline
 *
 * Reads the latest benchmark reports and writes them as the new baseline.
 * Run this after intentional performance changes to accept the new numbers.
 *
 * Usage:
 *   npm run perf:update-baseline
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const startup = readJSON(path.join(REPORTS, 'startup-benchmark.json'));
  const k6 = readJSON(path.join(REPORTS, 'k6-summary.json'));
  const bundle = readJSON(path.join(REPORTS, 'bundle-sizes.json'));

  const existing = readJSON(path.join(ROOT, 'performance-baseline.json')) || {};

  const baseline = {
    _comment: 'Performance baseline. Update with: npm run perf:update-baseline',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    bundleSize: bundle
      ? {
          android_bytes: bundle.android_bytes ?? existing.bundleSize?.android_bytes,
          ios_bytes: bundle.ios_bytes ?? existing.bundleSize?.ios_bytes,
          total_bytes: bundle.total_bytes ?? existing.bundleSize?.total_bytes,
        }
      : existing.bundleSize,
    startupTime: startup?.metrics
      ? {
          p50_ms: startup.metrics.p50,
          p95_ms: startup.metrics.p95,
        }
      : existing.startupTime,
    apiLatency:
      k6?.metrics?.p95 != null
        ? {
            p50_ms: k6.metrics.p50,
            p95_ms: k6.metrics.p95,
            p99_ms: k6.metrics.p99,
          }
        : existing.apiLatency,
  };

  fs.writeFileSync(
    path.join(ROOT, 'performance-baseline.json'),
    JSON.stringify(baseline, null, 2) + '\n'
  );

  console.log('✅ performance-baseline.json updated:');
  console.log(JSON.stringify(baseline, null, 2));
}

main();
