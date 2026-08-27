/**
 * Production dependency license audit.
 *
 * Scans the *transitive production* dependency tree (same scope as
 * `npm install --production`) and fails on any package whose license is not
 * on the allowlist defined in `license-allowlist.json`, unless that package is
 * explicitly listed in `license-exceptions.json` with an approved reason.
 *
 * Policy files:
 *   - license-allowlist.json   : the only licenses that may appear in the tree
 *   - license-exceptions.json  : per-package exceptions (pkg -> approval reason)
 *
 * The allowlist and exception process are the single source of truth for
 * dependency licensing. See the "License policy" section in scripts/README.md.
 *
 * Usage:
 *   node scripts/license-audit.js                # validate, exit non-zero on violation
 *   node scripts/license-audit.js --generate-attribution assets/THIRD_PARTY_NOTICES.json
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadJson(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

const ALLOWLIST = new Set(loadJson('license-allowlist.json'));
const EXCEPTIONS = loadJson('license-exceptions.json');

function normalizeLicense(raw) {
  if (!raw) return 'UNKNOWN';
  return String(raw).trim();
}

/**
 * A package is allowed if the whole package is under an approved exception, or
 * if every license reported for it is on the allowlist. An unknown/missing
 * license is never allowed (per spec: "failing on anything outside it").
 */
function isAllowed(pkgName, rawLicenses) {
  if (EXCEPTIONS[pkgName]) return true;
  if (!rawLicenses) return false;

  const fragments = normalizeLicense(rawLicenses)
    .split(/\s+(?:and|or)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (fragments.length === 0) return false;
  return fragments.every((f) => ALLOWLIST.has(f));
}

function collectProductionTree() {
  // --production limits the scan to the production (non-dev) dependency tree.
  const stdout = execFileSync(
    path.join(ROOT, 'node_modules', '.bin', 'license-checker'),
    ['--production', '--json'],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, encoding: 'utf-8' }
  );
  return JSON.parse(stdout);
}

function main() {
  const args = process.argv.slice(2);
  const genIdx = args.indexOf('--generate-attribution');
  const genOut = genIdx !== -1 ? args[genIdx + 1] : null;

  let tree;
  try {
    tree = collectProductionTree();
  } catch (err) {
    console.error('Failed to resolve the production dependency tree:', err.message);
    process.exit(1);
  }

  const violations = [];
  const attributions = [];

  for (const key of Object.keys(tree).sort()) {
    const entry = tree[key];
    const pkgName = key.split('@').slice(0, -1).join('@') || key;

    if (genOut) {
      attributions.push({
        name: pkgName,
        version: entry.version || '',
        license: normalizeLicense(entry.licenses),
        publisher: entry.publisher || undefined,
      });
    }

    if (!isAllowed(pkgName, entry.licenses)) {
      violations.push({
        packageName: pkgName,
        license: normalizeLicense(entry.licenses),
        reason: EXCEPTIONS[pkgName]
          ? `unknown license not on allowlist: ${entry.licenses}`
          : `license not on allowlist (${licenseAllowlistLabel()}): ${entry.licenses}`,
      });
    }
  }

  if (genOut) {
    const outFile = path.join(ROOT, genOut);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          packages: attributions,
        },
        null,
        2
      ) + '\n'
    );
    console.log(`Wrote ${attributions.length} production packages to ${genOut}`);
  }

  if (violations.length > 0) {
    console.error('❌ LICENSE CHECK FAILED');
    console.error('The following production dependencies are not on the allowlist:');
    for (const v of violations) {
      console.error(`  - ${v.packageName} (${v.license}): ${v.reason}`);
    }
    console.error('\nReview license-allowlist.json and license-exceptions.json (see scripts/README.md).');
    process.exit(1);
  }

  console.log(`✅ LICENSE CHECK PASSED (${Object.keys(tree).length} production packages)`);
  process.exit(0);
}

function licenseAllowlistLabel() {
  return `allowlist has ${ALLOWLIST.size} license(s)`;
}

main();
