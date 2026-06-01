#!/usr/bin/env node

/**
 * CI Build Time Monitor
 * 
 * Monitors and reports CI/CD build times to track the effectiveness
 * of caching strategies and identify performance regressions.
 * 
 * Usage:
 *   node scripts/monitorCIBuildTimes.js
 *   node scripts/monitorCIBuildTimes.js --workflow=ci-optimized --days=7
 *   node scripts/monitorCIBuildTimes.js --report
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'rinacode';
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'teachLink_mobile';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  workflow: args.find(arg => arg.startsWith('--workflow='))?.split('=')[1] || 'ci-optimized',
  days: parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30'),
  report: args.includes('--report'),
  json: args.includes('--json'),
};

/**
 * Make GitHub API request
 */
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${GITHUB_API}${endpoint}`;
    const headers = {
      'User-Agent': 'CI-Build-Monitor',
      'Accept': 'application/vnd.github.v3+json',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get workflow runs
 */
async function getWorkflowRuns(workflowName, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const data = await githubRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=100&created=>${sinceISO}`
    );

    return data.workflow_runs.filter(run => 
      run.name.includes(workflowName) && run.status === 'completed'
    );
  } catch (error) {
    console.error('Error fetching workflow runs:', error.message);
    return [];
  }
}

/**
 * Calculate build statistics
 */
function calculateStats(runs) {
  if (runs.length === 0) {
    return null;
  }

  const durations = runs.map(run => {
    const start = new Date(run.created_at);
    const end = new Date(run.updated_at);
    return (end - start) / 1000 / 60; // Convert to minutes
  });

  const successful = runs.filter(run => run.conclusion === 'success');
  const failed = runs.filter(run => run.conclusion === 'failure');

  durations.sort((a, b) => a - b);

  return {
    totalRuns: runs.length,
    successful: successful.length,
    failed: failed.length,
    successRate: ((successful.length / runs.length) * 100).toFixed(1),
    avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
    minDuration: durations[0].toFixed(2),
    maxDuration: durations[durations.length - 1].toFixed(2),
    medianDuration: durations[Math.floor(durations.length / 2)].toFixed(2),
    p95Duration: durations[Math.floor(durations.length * 0.95)].toFixed(2),
  };
}

/**
 * Detect cache effectiveness
 */
function analyzeCacheEffectiveness(runs) {
  // Estimate cache hits based on build duration
  // Builds < 4 minutes likely had cache hits
  // Builds > 8 minutes likely had cache misses
  
  const fastBuilds = runs.filter(run => {
    const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60;
    return duration < 4;
  });

  const slowBuilds = runs.filter(run => {
    const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000 / 60;
    return duration > 8;
  });

  return {
    estimatedCacheHits: fastBuilds.length,
    estimatedCacheMisses: slowBuilds.length,
    cacheHitRate: ((fastBuilds.length / runs.length) * 100).toFixed(1),
  };
}

/**
 * Generate performance report
 */
function generateReport(stats, cacheStats, workflowName, days) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 CI Build Time Report - ${workflowName}`);
  console.log('='.repeat(60));
  console.log(`\nPeriod: Last ${days} days`);
  console.log(`Total Runs: ${stats.totalRuns}`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log('\n' + '-'.repeat(60));
  console.log('⏱️  Build Duration Statistics');
  console.log('-'.repeat(60));
  console.log(`Average:    ${stats.avgDuration} minutes`);
  console.log(`Median:     ${stats.medianDuration} minutes`);
  console.log(`Min:        ${stats.minDuration} minutes`);
  console.log(`Max:        ${stats.maxDuration} minutes`);
  console.log(`95th %ile:  ${stats.p95Duration} minutes`);
  
  console.log('\n' + '-'.repeat(60));
  console.log('💾 Cache Effectiveness (Estimated)');
  console.log('-'.repeat(60));
  console.log(`Cache Hit Rate:   ${cacheStats.cacheHitRate}%`);
  console.log(`Fast Builds (<4m): ${cacheStats.estimatedCacheHits}`);
  console.log(`Slow Builds (>8m): ${cacheStats.estimatedCacheMisses}`);

  // Performance assessment
  console.log('\n' + '-'.repeat(60));
  console.log('🎯 Performance Assessment');
  console.log('-'.repeat(60));
  
  const avgDuration = parseFloat(stats.avgDuration);
  const cacheHitRate = parseFloat(cacheStats.cacheHitRate);

  if (avgDuration <= 3 && cacheHitRate >= 80) {
    console.log('✅ EXCELLENT: Meeting performance targets!');
    console.log('   - Average build time ≤ 3 minutes');
    console.log('   - Cache hit rate ≥ 80%');
  } else if (avgDuration <= 5 && cacheHitRate >= 60) {
    console.log('⚠️  GOOD: Close to targets, room for improvement');
    console.log('   - Target: Average build time ≤ 3 minutes');
    console.log('   - Target: Cache hit rate ≥ 80%');
  } else {
    console.log('❌ NEEDS IMPROVEMENT: Below performance targets');
    console.log('   - Target: Average build time ≤ 3 minutes');
    console.log('   - Target: Cache hit rate ≥ 80%');
    console.log('\n   Recommendations:');
    if (avgDuration > 5) {
      console.log('   • Review cache configuration');
      console.log('   • Check for cache invalidation issues');
      console.log('   • Optimize build steps');
    }
    if (cacheHitRate < 60) {
      console.log('   • Investigate frequent cache misses');
      console.log('   • Review cache key strategies');
      console.log('   • Check dependency update frequency');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Save metrics to file
 */
function saveMetrics(stats, cacheStats, workflowName) {
  const metricsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = path.join(metricsDir, `ci-metrics-${workflowName}-${timestamp}.json`);

  const metrics = {
    workflow: workflowName,
    timestamp: new Date().toISOString(),
    stats,
    cacheStats,
  };

  fs.writeFileSync(filename, JSON.stringify(metrics, null, 2));
  console.log(`\n📁 Metrics saved to: ${filename}`);
}

/**
 * Main function
 */
async function main() {
  console.log(`\n🔍 Fetching workflow runs for: ${options.workflow}`);
  console.log(`   Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`   Period: Last ${options.days} days\n`);

  if (!GITHUB_TOKEN) {
    console.warn('⚠️  Warning: GITHUB_TOKEN not set. API rate limits may apply.\n');
  }

  const runs = await getWorkflowRuns(options.workflow, options.days);

  if (runs.length === 0) {
    console.log('❌ No workflow runs found for the specified period.');
    console.log('   Try increasing the --days parameter or check the workflow name.');
    process.exit(1);
  }

  const stats = calculateStats(runs);
  const cacheStats = analyzeCacheEffectiveness(runs);

  if (options.json) {
    console.log(JSON.stringify({ stats, cacheStats }, null, 2));
  } else {
    generateReport(stats, cacheStats, options.workflow, options.days);
  }

  if (options.report) {
    saveMetrics(stats, cacheStats, options.workflow);
  }

  // Exit with error if performance targets not met
  const avgDuration = parseFloat(stats.avgDuration);
  if (avgDuration > 5) {
    console.error('❌ Performance target not met: Average build time > 5 minutes');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
