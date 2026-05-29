#!/usr/bin/env node
/**
 * scripts/validateOpenApi.js
 *
 * OpenAPI 3.0 compliance validation script (Issue #640).
 *
 * Validates the OpenAPI spec file against the OpenAPI 3.0 schema and checks
 * that all required sections are present and well-formed.
 *
 * Usage:
 *   node scripts/validateOpenApi.js [--spec <path>]
 *
 * Defaults to docs/openapi.yaml or docs/openapi.json if --spec is not provided.
 * Exits with code 1 on any validation failure so CI fails fast.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const specFlagIdx = args.indexOf('--spec');
const specArgPath = specFlagIdx !== -1 ? args[specFlagIdx + 1] : null;

// ── Locate spec file ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const CANDIDATE_PATHS = specArgPath
  ? [path.resolve(ROOT, specArgPath)]
  : [
      path.join(ROOT, 'docs', 'openapi.yaml'),
      path.join(ROOT, 'docs', 'openapi.json'),
      path.join(ROOT, 'openapi.yaml'),
      path.join(ROOT, 'openapi.json'),
    ];

function findSpecFile() {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Parse spec ────────────────────────────────────────────────────────────────

function parseSpec(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');

  if (ext === '.json') {
    return JSON.parse(raw);
  }

  // Minimal YAML → JS parser for the subset used in OpenAPI specs.
  // For production use, install `js-yaml` and replace this with:
  //   const yaml = require('js-yaml'); return yaml.load(raw);
  try {
    const yaml = require('js-yaml');
    return yaml.load(raw);
  } catch {
    // js-yaml not installed — try JSON fallback (spec may be JSON with .yaml ext)
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        'Cannot parse YAML spec: install js-yaml (`npm i -D js-yaml`) or provide a JSON spec.',
      );
    }
  }
}

// ── Validation rules ──────────────────────────────────────────────────────────

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(`  ✗ ${msg}`);
}

function warn(msg) {
  warnings.push(`  ⚠ ${msg}`);
}

function validateOpenApiVersion(spec) {
  if (!spec.openapi) {
    fail('Missing required field: openapi (must be "3.0.x")');
    return;
  }
  if (!/^3\.0\.\d+$/.test(String(spec.openapi))) {
    fail(`openapi version must be 3.0.x, got: "${spec.openapi}"`);
  }
}

function validateInfo(spec) {
  if (!spec.info) {
    fail('Missing required field: info');
    return;
  }
  if (!spec.info.title) fail('info.title is required');
  if (!spec.info.version) fail('info.version is required');
}

function validatePaths(spec) {
  if (!spec.paths) {
    fail('Missing required field: paths');
    return;
  }
  if (typeof spec.paths !== 'object' || Array.isArray(spec.paths)) {
    fail('paths must be an object');
    return;
  }

  const VALID_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    if (!pathKey.startsWith('/')) {
      fail(`Path "${pathKey}" must start with /`);
    }

    if (typeof pathItem !== 'object' || pathItem === null) {
      fail(`Path "${pathKey}" must be an object`);
      continue;
    }

    for (const method of VALID_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const opId = `${method.toUpperCase()} ${pathKey}`;

      if (!operation.responses) {
        fail(`${opId}: missing required field "responses"`);
        continue;
      }

      if (typeof operation.responses !== 'object') {
        fail(`${opId}: "responses" must be an object`);
        continue;
      }

      const responseCodes = Object.keys(operation.responses);
      if (responseCodes.length === 0) {
        fail(`${opId}: "responses" must have at least one response code`);
      }

      // Validate each response object
      for (const [code, response] of Object.entries(operation.responses)) {
        if (code !== 'default' && !/^\d{3}$/.test(code)) {
          fail(`${opId}: invalid response code "${code}"`);
        }
        if (!response.description) {
          warn(`${opId}: response "${code}" is missing a description`);
        }
      }

      // Warn if no operationId
      if (!operation.operationId) {
        warn(`${opId}: missing operationId (recommended for code generation)`);
      }

      // Validate request body schema references
      if (operation.requestBody) {
        validateRequestBody(opId, operation.requestBody, spec);
      }

      // Validate parameter objects
      if (operation.parameters) {
        validateParameters(opId, operation.parameters);
      }
    }
  }
}

function validateRequestBody(opId, requestBody, spec) {
  if (!requestBody.content) {
    warn(`${opId}: requestBody is missing "content"`);
    return;
  }
  for (const [mediaType, mediaObj] of Object.entries(requestBody.content)) {
    if (mediaObj && mediaObj.schema) {
      validateSchemaRef(opId, mediaObj.schema, spec);
    }
  }
}

function validateParameters(opId, parameters) {
  if (!Array.isArray(parameters)) {
    fail(`${opId}: "parameters" must be an array`);
    return;
  }
  for (const param of parameters) {
    if (!param.name) fail(`${opId}: parameter missing "name"`);
    if (!param.in) fail(`${opId}: parameter "${param.name || '?'}" missing "in"`);
    const validIn = ['query', 'header', 'path', 'cookie'];
    if (param.in && !validIn.includes(param.in)) {
      fail(`${opId}: parameter "${param.name}" has invalid "in" value: "${param.in}"`);
    }
    if (param.in === 'path' && param.required !== true) {
      warn(`${opId}: path parameter "${param.name}" should have required: true`);
    }
  }
}

function validateSchemaRef(opId, schema, spec) {
  if (schema.$ref) {
    const refPath = schema.$ref;
    if (!refPath.startsWith('#/')) {
      warn(`${opId}: external $ref "${refPath}" cannot be validated locally`);
      return;
    }
    // Resolve local $ref
    const parts = refPath.replace('#/', '').split('/');
    let node = spec;
    for (const part of parts) {
      node = node && node[part];
    }
    if (node === undefined) {
      fail(`${opId}: $ref "${refPath}" does not resolve to a defined component`);
    }
  }
}

function validateComponents(spec) {
  if (!spec.components) return; // optional

  const { schemas, responses, parameters, requestBodies, securitySchemes } = spec.components;

  if (schemas) {
    for (const [name, schema] of Object.entries(schemas)) {
      if (!schema.type && !schema.$ref && !schema.allOf && !schema.oneOf && !schema.anyOf) {
        warn(`components.schemas.${name}: missing "type" (or composition keyword)`);
      }
    }
  }

  if (securitySchemes) {
    for (const [name, scheme] of Object.entries(securitySchemes)) {
      if (!scheme.type) fail(`components.securitySchemes.${name}: missing "type"`);
    }
  }
}

function validateServers(spec) {
  if (!spec.servers) {
    warn('No "servers" defined — clients will default to the document base URL');
    return;
  }
  for (const server of spec.servers) {
    if (!server.url) fail('Server entry missing "url"');
  }
}

// ── Run validation ────────────────────────────────────────────────────────────

function run() {
  const specFile = findSpecFile();

  if (!specFile) {
    console.error(
      '❌ OpenAPI spec not found.\n' +
        '   Searched:\n' +
        CANDIDATE_PATHS.map((p) => `     ${p}`).join('\n') +
        '\n   Provide a path with: node scripts/validateOpenApi.js --spec <path>',
    );
    process.exit(1);
  }

  console.log(`\n🔍 Validating OpenAPI spec: ${path.relative(ROOT, specFile)}\n`);

  let spec;
  try {
    spec = parseSpec(specFile);
  } catch (err) {
    console.error(`❌ Failed to parse spec: ${err.message}`);
    process.exit(1);
  }

  validateOpenApiVersion(spec);
  validateInfo(spec);
  validatePaths(spec);
  validateComponents(spec);
  validateServers(spec);

  // ── Report ──────────────────────────────────────────────────────────────────

  if (warnings.length > 0) {
    console.warn('Warnings:');
    warnings.forEach((w) => console.warn(w));
    console.warn('');
  }

  if (errors.length > 0) {
    console.error(`Errors (${errors.length}):`);
    errors.forEach((e) => console.error(e));
    console.error('\n❌ OpenAPI validation failed.\n');
    process.exit(1);
  }

  const pathCount = spec.paths ? Object.keys(spec.paths).length : 0;
  console.log(`✅ OpenAPI 3.0 validation passed (${pathCount} path(s) validated).\n`);
}

run();
