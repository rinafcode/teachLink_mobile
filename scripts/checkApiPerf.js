const axios = require('axios');

const budgetConfig = require('../performance-budget.json');

const API_URL = process.env.API_URL || 'https://jsonplaceholder.typicode.com/posts';
const apiBudget = budgetConfig.apiLatency || {};
const p50Budget = apiBudget.p50_ms || 300;
const p95Budget = apiBudget.p95_ms || 1000;

async function testApiPerformance() {
  const samples = [];
  const SAMPLES = 5;

  console.log('API Performance Report');
  console.log('========================');

  for (let i = 0; i < SAMPLES; i++) {
    try {
      const start = Date.now();
      await axios.get(API_URL);
      const duration = Date.now() - start;
      samples.push(duration);
      console.log(`  Run ${i + 1}/${SAMPLES}: ${duration} ms`);
    } catch (error) {
      console.error(`  Run ${i + 1}/${SAMPLES}: FAILED - ${error.message}`);
      process.exit(1);
    }
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const avg = Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];

  console.log('');
  console.log(`  Average: ${avg} ms`);
  console.log(`  p50:     ${p50} ms  (budget: ${p50Budget} ms)`);
  console.log(`  p95:     ${p95} ms  (budget: ${p95Budget} ms)`);
  console.log('');

  let failed = false;

  if (p50 > p50Budget) {
    console.error(`❌ API p50 (${p50} ms) exceeded budget (${p50Budget} ms)`);
    failed = true;
  }

  if (p95 > p95Budget) {
    console.error(`❌ API p95 (${p95} ms) exceeded budget (${p95Budget} ms)`);
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log('✅ API performance passed');
}

testApiPerformance();
