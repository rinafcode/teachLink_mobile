const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Auto code-splitting: route size threshold
// Routes whose synchronous dependency chunk exceeds this value trigger a
// warning and are recorded in .metro-route-sizes.json for CI inspection.
// ---------------------------------------------------------------------------
const ROUTE_SIZE_THRESHOLD = 100 * 1024; // 100 KB

/**
 * Walks the synchronous dependency sub-graph rooted at `entryPath` and
 * returns the total compiled byte size of every non-dynamic module.
 *
 * Metro marks dynamic import() edges with asyncType !== null, so those
 * subtrees (i.e. React.lazy chunks) are correctly excluded from the count.
 *
 * @param {string} entryPath
 * @param {Map<string, import('metro').Module>} allModules
 * @returns {{ bytes: number, moduleCount: number }}
 */
function computeRouteSyncChunkSize(entryPath, allModules) {
  const visited = new Set();
  let bytes = 0;

  function visit(modulePath) {
    if (visited.has(modulePath)) return;
    visited.add(modulePath);

    const mod = allModules.get(modulePath);
    if (!mod) return;

    for (const output of mod.output ?? []) {
      if (output.data?.code) {
        bytes += Buffer.byteLength(output.data.code, 'utf8');
      }
    }

    for (const dep of mod.dependencies?.values() ?? []) {
      // asyncType: null → synchronous import (count it)
      // asyncType: 'async' | 'prefetch' → dynamic import() boundary (skip)
      if (dep.data?.data?.asyncType == null) {
        visit(dep.absolutePath);
      }
    }
  }

  visit(entryPath);
  return { bytes, moduleCount: visited.size };
}

/**
 * Iterates the Metro module graph, identifies Expo Router route files
 * (any .ts/.tsx/.js/.jsx under app/), and logs a warning for every route
 * whose synchronous chunk exceeds ROUTE_SIZE_THRESHOLD.
 *
 * Results are written to .metro-route-sizes.json so CI and bundle auditing
 * tools can consume them without re-parsing console output.
 *
 * @param {import('metro/src/DeltaBundler').ReadOnlyGraph} graph
 */
function analyzeRouteChunkSizes(graph) {
  const projectRoot = __dirname;
  const appPrefix = path.join(projectRoot, 'app') + path.sep;
  const results = [];

  for (const modulePath of graph.dependencies.keys()) {
    if (!modulePath.startsWith(appPrefix)) continue;
    if (modulePath.includes('node_modules')) continue;
    if (!/\.(tsx?|jsx?)$/.test(modulePath)) continue;

    const { bytes, moduleCount } = computeRouteSyncChunkSize(
      modulePath,
      graph.dependencies,
    );

    const route = path.relative(projectRoot, modulePath);
    const exceeds = bytes > ROUTE_SIZE_THRESHOLD;
    results.push({ route, bytes, moduleCount, exceeds });

    if (exceeds) {
      const kb = (bytes / 1024).toFixed(1);
      console.warn(
        `\n⚠️   [auto-split] Route chunk exceeds 100 KB threshold\n` +
          `    Route     : ${route}\n` +
          `    Sync size : ${kb} KB  (${moduleCount} modules)\n` +
          `    Fix       : use React.lazy() for heavy component imports\n`,
      );
    }
  }

  if (results.length === 0) return;

  try {
    fs.writeFileSync(
      path.join(projectRoot, '.metro-route-sizes.json'),
      JSON.stringify(
        {
          threshold: ROUTE_SIZE_THRESHOLD,
          generatedAt: new Date().toISOString(),
          routes: results,
        },
        null,
        2,
      ),
    );
  } catch {
    // Non-fatal: report write failure must not break the build
  }
}

/**
 * Wraps an existing serializer (or Metro's default) with the route-size
 * analysis pass. The analysis is a pure side-effect observer — the bundle
 * output is not modified.
 *
 * @param {Function|undefined} existingSerializer
 * @returns {Function}
 */
function wrapWithRouteSizeAnalyzer(existingSerializer) {
  return async function routeSizeAnalyzerSerializer(
    entryPoint,
    preModules,
    graph,
    options,
  ) {
    try {
      analyzeRouteChunkSizes(graph);
    } catch (err) {
      // Analysis errors must never break the bundle
      console.warn('[auto-split] Route size analysis failed:', err.message);
    }

    // Delegate to the upstream serializer if one exists (e.g. Expo's or NativeWind's).
    if (typeof existingSerializer === 'function') {
      return existingSerializer(entryPoint, preModules, graph, options);
    }

    // No upstream serializer — call Metro's built-in bundler directly.
    // These module paths are stable across Metro 0.76–0.82 (Expo SDK 50–54).
    const { default: baseJSBundle } = require('metro/src/DeltaBundler/Serializers/baseJSBundle');
    const { default: bundleToString } = require('metro/src/DeltaBundler/Serializers/bundleToString');
    const { code } = bundleToString(
      baseJSBundle(entryPoint, preModules, graph, options),
    );
    return code;
  };
}

// ---------------------------------------------------------------------------
// Compose the final Metro config
// ---------------------------------------------------------------------------

const config = getDefaultConfig(__dirname);

// Apply NativeWind first so we capture its serializer (if any) before wrapping.
const nativewindConfig = withNativeWind(config, { input: './global.css' });

// Inject the route size analysis observer into the serializer chain.
nativewindConfig.serializer ??= {};
nativewindConfig.serializer.customSerializer = wrapWithRouteSizeAnalyzer(
  nativewindConfig.serializer.customSerializer,
);

module.exports = nativewindConfig;
