const fs = require('fs');
const path = require('path');

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
const totalBudget = budget.bundleSize?.total_bytes || 52428800;

console.log('Bundle size:', actual, 'bytes');
console.log('Budget:', totalBudget, 'bytes');

if (actual > totalBudget) {
  console.error(`❌ Bundle too large: ${actual} > ${totalBudget} bytes`);
  process.exit(1);
}

console.log(`✅ Bundle OK (${((actual / totalBudget) * 100).toFixed(1)}% of budget)`);
