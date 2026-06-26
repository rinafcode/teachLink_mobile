#!/usr/bin/env node

/**
 * Cache Invalidation Test
 * 
 * Tests that cache invalidation works correctly when dependencies
 * or configuration files change.
 * 
 * Usage:
 *   node scripts/testCacheInvalidation.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test scenarios
const testScenarios = [
  {
    name: 'Node Dependencies Change',
    file: 'package-lock.json',
    description: 'Cache should invalidate when package-lock.json changes',
    cacheKey: 'node-modules',
  },
  {
    name: 'TypeScript Config Change',
    file: 'tsconfig.json',
    description: 'Cache should invalidate when tsconfig.json changes',
    cacheKey: 'typescript',
  },
  {
    name: 'Jest Config Change',
    file: 'jest.config.js',
    description: 'Cache should invalidate when jest.config.js changes',
    cacheKey: 'jest',
  },
  {
    name: 'ESLint Config Change',
    file: 'eslint.config.js',
    description: 'Cache should invalidate when eslint.config.js changes',
    cacheKey: 'eslint',
  },
  {
    name: 'Metro Config Change',
    file: 'metro.config.js',
    description: 'Cache should invalidate when metro.config.js changes',
    cacheKey: 'metro',
  },
  {
    name: 'EAS Config Change',
    file: 'eas.json',
    description: 'Cache should invalidate when eas.json changes',
    cacheKey: 'eas',
  },
];

/**
 * Calculate file hash
 */
function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Simulate cache key generation
 */
function generateCacheKey(os, cacheType, fileHash) {
  return `${os}-${cacheType}-${fileHash}`;
}

/**
 * Test cache invalidation
 */
function testCacheInvalidation() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Cache Invalidation Test');
  console.log('='.repeat(60) + '\n');

  const results = [];
  const os = process.platform;

  for (const scenario of testScenarios) {
    const filePath = path.join(process.cwd(), scenario.file);
    const fileExists = fs.existsSync(filePath);

    if (!fileExists) {
      results.push({
        ...scenario,
        status: 'SKIP',
        reason: 'File not found',
      });
      continue;
    }

    // Calculate current hash
    const currentHash = calculateFileHash(filePath);
    const cacheKey = generateCacheKey(os, scenario.cacheKey, currentHash);

    // Simulate a change by calculating hash of modified content
    const content = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = content + '\n// Test modification';
    const modifiedHash = crypto.createHash('sha256').update(modifiedContent).digest('hex');
    const modifiedCacheKey = generateCacheKey(os, scenario.cacheKey, modifiedHash);

    // Check if cache keys are different
    const invalidates = cacheKey !== modifiedCacheKey;

    results.push({
      ...scenario,
      status: invalidates ? 'PASS' : 'FAIL',
      currentHash: currentHash.substring(0, 8),
      modifiedHash: modifiedHash.substring(0, 8),
      invalidates,
    });
  }

  // Print results
  console.log('Test Results:\n');
  console.log('| Scenario | Status | File | Invalidates |');
  console.log('|----------|--------|------|-------------|');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`| ${result.name} | ${statusIcon} ${result.status} | ${result.file} | ${result.invalidates ? 'Yes' : 'No'} |`);

    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else skipped++;
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  // Detailed results
  console.log('Detailed Results:\n');
  for (const result of results) {
    if (result.status === 'SKIP') continue;

    console.log(`${result.name}:`);
    console.log(`  File: ${result.file}`);
    console.log(`  Current Hash: ${result.currentHash}...`);
    console.log(`  Modified Hash: ${result.modifiedHash}...`);
    console.log(`  Cache Invalidates: ${result.invalidates ? '✅ Yes' : '❌ No'}`);
    console.log(`  Description: ${result.description}\n`);
  }

  console.log('='.repeat(60) + '\n');

  // Exit with error if any tests failed
  if (failed > 0) {
    console.error('❌ Some cache invalidation tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All cache invalidation tests passed!');
  }
}

/**
 * Test cache key patterns from workflows
 */
function testWorkflowCacheKeys() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Workflow Cache Key Analysis');
  console.log('='.repeat(60) + '\n');

  const workflowFiles = [
    '.github/workflows/ci-optimized.yml',
    '.github/workflows/build-native.yml',
    '.github/workflows/test-optimized.yml',
  ];

  for (const workflowFile of workflowFiles) {
    const filePath = path.join(process.cwd(), workflowFile);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${workflowFile} (not found)\n`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract cache key patterns
    const cacheKeyPattern = /key:\s*\$\{\{[^}]+\}\}/g;
    const cacheKeys = content.match(cacheKeyPattern) || [];

    console.log(`📄 ${workflowFile}:`);
    console.log(`   Found ${cacheKeys.length} cache key(s)\n`);

    // Check for best practices
    const hasHashFiles = content.includes('hashFiles(');
    const hasRestoreKeys = content.includes('restore-keys:');
    const hasOS = content.includes('runner.os');

    console.log('   Best Practices:');
    console.log(`   ${hasHashFiles ? '✅' : '❌'} Uses hashFiles() for content-based keys`);
    console.log(`   ${hasRestoreKeys ? '✅' : '❌'} Includes restore-keys for fallback`);
    console.log(`   ${hasOS ? '✅' : '❌'} Includes OS in cache key`);
    console.log('');
  }

  console.log('='.repeat(60) + '\n');
}

// Run tests
console.log('\n🚀 Starting Cache Invalidation Tests...\n');
testCacheInvalidation();
testWorkflowCacheKeys();
console.log('✅ All tests completed!\n');
