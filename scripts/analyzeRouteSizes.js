#!/usr/bin/env node
/**
 * Route Size Analyzer
 *
 * Statically walks the import graph starting from every Expo Router route file
 * under app/ and measures the transitive *synchronous* source size of each route.
 * Routes whose sync chunk exceeds the 100 KB threshold must use React.lazy() to
 * split heavy component imports dynamically, or the script exits non-zero.
 *
 * Usage:
 *   node scripts/analyzeRouteSizes.js          # analyse + enforce
 *   node scripts/analyzeRouteSizes.js --report  # analyse only, never exits 1
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const THRESHOLD_BYTES = 100 * 1024; // 100 KB

const REPORT_ONLY = process.argv.includes('--report');

// Module resolution – mirrors Metro/babel-preset-expo conventions.
// Metro (via babel-preset-expo) maps `@` to the project root, so:
//   @/src/components/... → ./src/components/...
//   @/components/...     → ./components/...
// This differs from tsconfig paths (./src/*) which only affect the TS checker.
const ALIAS_MAP = {
  '@': PROJECT_ROOT,
};

// Component directories that map to the root (expo uses bare component/ at root)
const ROOT_DIRS = ['components', 'constants', 'hooks', 'assets'];

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

/** @returns {string|null} absolute resolved file path, or null */
function resolveModule(specifier, fromFile) {
  // Skip node_modules and built-ins
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    // Check aliases
    let mapped = null;
    for (const [alias, target] of Object.entries(ALIAS_MAP)) {
      if (alias.endsWith('/')) {
        if (specifier.startsWith(alias)) {
          mapped = path.join(target, specifier.slice(alias.length));
          break;
        }
      } else {
        if (specifier === alias || specifier.startsWith(alias + '/')) {
          mapped = path.join(target, specifier.slice(alias.length).replace(/^\//, ''));
          break;
        }
      }
    }

    if (!mapped) {
      // Check if it's a root-level directory alias (components/, constants/, etc.)
      const firstSegment = specifier.split('/')[0];
      if (ROOT_DIRS.includes(firstSegment)) {
        mapped = path.join(PROJECT_ROOT, specifier);
      }
    }

    if (!mapped) return null; // external package
    specifier = mapped;
  } else {
    specifier = path.resolve(path.dirname(fromFile), specifier);
  }

  return tryResolveFile(specifier);
}

function tryResolveFile(base) {
  // Exact path with extension
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;

  // Try adding extensions
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }

  // Try as a directory index
  for (const ext of EXTENSIONS) {
    const candidate = path.join(base, 'index' + ext);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Import parsing
// ---------------------------------------------------------------------------

/**
 * Returns { staticImports: string[], dynamicImports: string[] } for a file.
 * staticImports  → counted in the synchronous chunk
 * dynamicImports → lazy-loaded; excluded from the sync chunk
 */
function parseImports(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { staticImports: [], dynamicImports: [] };
  }

  const staticImports = new Set();
  const dynamicImports = new Set();

  // 1. Named / default / namespace / side-effect static imports
  //    import X from '...'  |  import { X } from '...'  |  import '...'
  const staticImportRe =
    /^\s*import\s+(?:(?:[\w$*{},\s]+)\s+from\s+)?['"]([^'"]+)['"]/gm;
  let m;
  while ((m = staticImportRe.exec(content)) !== null) {
    staticImports.add(m[1]);
  }

  // 2. CommonJS require (non-dynamic context)
  //    const X = require('...')   — only if not inside an arrow/function literal
  const requireRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(content)) !== null) {
    staticImports.add(m[1]);
  }

  // 3. Dynamic import() — these mark a lazy boundary
  //    import('...')  |  React.lazy(() => import('...'))
  const dynamicImportRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicImportRe.exec(content)) !== null) {
    dynamicImports.add(m[1]);
    // Remove from static if wrongly captured above (rare edge-case with multiline)
    staticImports.delete(m[1]);
  }

  // 4. require.resolveWeak (Metro async boundary)
  const resolveWeakRe = /require\.resolveWeak\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = resolveWeakRe.exec(content)) !== null) {
    dynamicImports.add(m[1]);
    staticImports.delete(m[1]);
  }

  return {
    staticImports: [...staticImports],
    dynamicImports: [...dynamicImports],
  };
}

// ---------------------------------------------------------------------------
// Transitive sync-chunk analysis
// ---------------------------------------------------------------------------

/**
 * @returns {{ bytes: number, fileCount: number, dynamicBoundaries: Set<string> }}
 */
function computeChunkSize(entryPath) {
  const visited = new Set();
  const dynamicBoundaries = new Set();
  let totalBytes = 0;

  function traverse(filePath) {
    if (visited.has(filePath)) return;
    if (filePath.includes('node_modules')) return;
    visited.add(filePath);

    try {
      totalBytes += fs.statSync(filePath).size;
    } catch {
      // Skip unreadable files
    }

    const { staticImports, dynamicImports } = parseImports(filePath);

    for (const spec of dynamicImports) {
      const resolved = resolveModule(spec, filePath);
      if (resolved) dynamicBoundaries.add(resolved);
    }

    for (const spec of staticImports) {
      const resolved = resolveModule(spec, filePath);
      if (resolved && !dynamicBoundaries.has(resolved)) {
        traverse(resolved);
      }
    }
  }

  traverse(entryPath);
  return { bytes: totalBytes, fileCount: visited.size, dynamicBoundaries };
}

// ---------------------------------------------------------------------------
// Route discovery
// ---------------------------------------------------------------------------

function findRouteFiles(dir) {
  const routes = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return routes;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...findRouteFiles(fullPath));
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      routes.push(fullPath);
    }
  }
  return routes;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const routeFiles = findRouteFiles(APP_DIR);
let violations = 0;
const results = [];

console.log('\n\u{1F4E6}  Route Size Analysis  (threshold: 100 KB)\n');
console.log('─'.repeat(64));

for (const routeFile of routeFiles) {
  const rel = path.relative(PROJECT_ROOT, routeFile);
  const { bytes, fileCount, dynamicBoundaries } = computeChunkSize(routeFile);
  const sizeKB = (bytes / 1024).toFixed(1);
  const exceeds = bytes > THRESHOLD_BYTES;

  results.push({ route: rel, bytes, fileCount, dynamicBoundaries: dynamicBoundaries.size, exceeds });

  if (exceeds) {
    violations++;
    console.log(`\n❌  ${rel}`);
    console.log(`     Sync chunk : ${sizeKB} KB  (${fileCount} files, ${dynamicBoundaries.size} lazy boundaries)`);
    console.log(`     Fix        : wrap heavy imports with React.lazy(() => import('...'))`);
  } else {
    const lazy = dynamicBoundaries.size > 0 ? `  ✔ ${dynamicBoundaries.size} lazy` : '';
    console.log(`✅  ${rel}  —  ${sizeKB} KB  (${fileCount} files${lazy})`);
  }
}

console.log('\n' + '─'.repeat(64));
console.log(
  `\nRoutes: ${routeFiles.length}   Violations: ${violations}   ` +
    `Threshold: ${(THRESHOLD_BYTES / 1024).toFixed(0)} KB\n`,
);

// Write JSON report regardless of exit status
const reportPath = path.join(PROJECT_ROOT, '.route-size-report.json');
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      threshold: THRESHOLD_BYTES,
      generatedAt: new Date().toISOString(),
      summary: { total: routeFiles.length, violations },
      routes: results,
    },
    null,
    2,
  ),
);
console.log(`Report → ${path.relative(PROJECT_ROOT, reportPath)}\n`);

if (!REPORT_ONLY && violations > 0) {
  console.error(
    `\u{1F6A8}  ${violations} route(s) exceed 100 KB. ` +
      `Apply React.lazy() splitting or run with --report to suppress exit code.\n`,
  );
  process.exit(1);
}

if (violations === 0) {
  console.log('✨  All routes are within the 100 KB threshold.\n');
}
