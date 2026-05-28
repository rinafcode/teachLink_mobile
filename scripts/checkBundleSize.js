const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const budget = require('../performance-budget.json');

const possibleBuilds = ['dist', 'build', '.next'];

let buildPath = null;

for (const folder of possibleBuilds) {
  const fullPath = path.join(__dirname, '..', folder);
  if (fs.existsSync(fullPath)) {
    buildPath = fullPath;
    break;
  }
}

if (!buildPath) {
  console.error('No build folder found. Run build first.');
  process.exit(1);
}

function getSize(dir) {
  let total = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      total += getSize(filePath);
    } else {
      total += stat.size;
    }
  }

  return total;
}

const actual = getSize(buildPath);

console.log('Bundle size:', actual);
console.log('Budget:', budget.bundleSize);

if (actual > budget.bundleSize) {
  console.error('❌ Bundle too large');
  process.exit(1);
}

console.log('✅ Bundle OK');
