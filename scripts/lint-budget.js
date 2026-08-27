/**
 * Lint warning budget enforcement.
 *
 * Usage:
 *   node scripts/lint-budget.js check    # fail if over budget or if budget is loose
 *   node scripts/lint-budget.js record   # measure warnings and record them as the new budget
 *
 * Reads and writes lint-budget.json, the single source of truth for the
 * ESLint warning ceiling. The budget can only decrease: `record` refuses to
 * raise it, and `check` fails when the committed budget is looser than the
 * measured count so the ceiling is tightened after every cleanup.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUDGET_FILE = path.resolve(__dirname, '..', 'lint-budget.json');
const mode = process.argv[2] || 'check';

function readBudget() {
  return Number(JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8')).maxWarnings);
}

function writeBudget(count) {
  fs.writeFileSync(BUDGET_FILE, JSON.stringify({ maxWarnings: count }, null, 2) + '\n');
}

function measureWarnings() {
  const result = spawnSync(
    'npx',
    ['eslint', '.', '--format', 'json', '--no-cache', '--max-warnings=-1'],
    { encoding: 'utf8' }
  );

  if (result.status === 2) {
    const detail = result.stderr || result.stdout || (result.error && result.error.message) || '';
    console.error('ESLint could not run (configuration error or fatal failure):');
    console.error(detail);
    process.exit(2);
  }

  let warnings = 0;
  try {
    for (const file of JSON.parse(result.stdout || '[]')) {
      for (const message of file.messages) {
        if (message.severity === 1) warnings += 1;
      }
    }
  } catch (error) {
    console.error('Could not parse ESLint JSON output:', error.message);
    process.exit(2);
  }
  return warnings;
}

if (mode === 'record') {
  const current = readBudget();
  const measured = measureWarnings();
  if (measured >= current) {
    console.error(
      `Warnings (${measured}) are not lower than the current budget (${current}); ` +
        'the budget can only decrease, nothing to record.'
    );
    process.exit(1);
  }
  writeBudget(measured);
  console.log(`Recorded lint budget: ${measured} (was ${current}).`);
  process.exit(0);
}

if (mode === 'check') {
  const budget = readBudget();
  const measured = measureWarnings();

  if (measured > budget) {
    console.error(
      `Lint budget exceeded: ${measured} warnings > budget ${budget}. Fix the new ` +
        'warnings (see eslint output) before this passes.'
    );
    process.exit(1);
  }

  if (measured < budget) {
    console.error(
      `Lint warnings dropped to ${measured}, below the committed budget ${budget}. ` +
        'Tighten the budget with `npm run lint:budget:record` so the ceiling only decreases.'
    );
    process.exit(1);
  }

  console.log(`Lint warnings (${measured}) match the budget (${budget}).`);
  process.exit(0);
}

console.error(`Unknown mode: ${mode}. Use "check" or "record".`);
process.exit(2);
