/**
 * k6 API Latency Benchmark
 *
 * Usage:
 *   k6 run scripts/k6-api-benchmark.js
 *   k6 run --env API_BASE_URL=https://api.example.com scripts/k6-api-benchmark.js
 *
 * Thresholds: p95 < 1000ms, p99 < 2000ms, error rate < 1%
 * Fails CI if >5% regression vs baseline (checked by checkPerfRegression.js)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const apiLatency = new Trend('api_latency_ms', true);
const errorRate = new Rate('error_rate');

const BASE_URL = __ENV.API_BASE_URL || 'https://jsonplaceholder.typicode.com';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // p95 must be under 1000ms (matches performance-budget.json apiResponse)
    api_latency_ms: ['p(95)<1000', 'p(99)<2000'],
    // Error rate must be under 1%
    error_rate: ['rate<0.01'],
    // Overall http_req_duration p95 < 1000ms
    http_req_duration: ['p(95)<1000'],
  },
};

const ENDPOINTS = [
  { path: '/posts', method: 'GET', name: 'list-posts' },
  { path: '/posts/1', method: 'GET', name: 'get-post' },
  { path: '/users/1', method: 'GET', name: 'get-user' },
];

export default function () {
  for (const endpoint of ENDPOINTS) {
    const start = Date.now();
    const res = http.get(`${BASE_URL}${endpoint.path}`, {
      tags: { endpoint: endpoint.name },
    });
    const duration = Date.now() - start;

    apiLatency.add(duration, { endpoint: endpoint.name });

    const ok = check(res, {
      'status is 2xx': r => r.status >= 200 && r.status < 300,
      'response time < 1000ms': () => duration < 1000,
    });

    errorRate.add(!ok);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      p50: data.metrics.api_latency_ms?.values?.['p(50)'] ?? null,
      p95: data.metrics.api_latency_ms?.values?.['p(95)'] ?? null,
      p99: data.metrics.api_latency_ms?.values?.['p(99)'] ?? null,
      avg: data.metrics.api_latency_ms?.values?.avg ?? null,
      errorRate: data.metrics.error_rate?.values?.rate ?? null,
    },
    thresholdsPassed: !Object.values(data.metrics).some(
      m => m.thresholds && Object.values(m.thresholds).some(t => !t.ok)
    ),
  };

  return {
    'reports/k6-summary.json': JSON.stringify(summary, null, 2),
    stdout: `\nAPI Benchmark: p95=${summary.metrics.p95?.toFixed(0)}ms p99=${summary.metrics.p99?.toFixed(0)}ms errors=${((summary.metrics.errorRate ?? 0) * 100).toFixed(2)}%\n`,
  };
}
