const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const appDir = path.join(__dirname, '..', 'app');

function walkDir(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath, filter));
    } else if (filter(filePath)) {
      results.push(filePath);
    }
  });
  return results;
}

const files = [
  ...walkDir(srcDir, f => /\.(tsx|ts|jsx|js)$/.test(f)),
  ...walkDir(appDir, f => /\.(tsx|ts|jsx|js)$/.test(f))
];

let totalStyleSheetCalls = 0;
let totalStyleRules = 0;
let totalClassNames = 0;
let stylesheetDetails = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(path.join(__dirname, '..'), file);

  // Match StyleSheet.create(...)
  if (content.includes('StyleSheet.create')) {
    totalStyleSheetCalls++;
    // Simple estimation of number of rules inside StyleSheet.create
    const ssMatch = content.match(/StyleSheet\.create\(\s*\{([\s\S]*?)\}\s*\)/g);
    if (ssMatch) {
      ssMatch.forEach(match => {
        // Count top-level properties inside the object
        const innerContent = match.replace(/StyleSheet\.create\(\s*\{/, '').replace(/\}\s*\)/, '');
        // Match properties like name: { ... } or "name": { ... }
        // We can approximate by counting blocks of braces or keys
        const keys = innerContent.match(/^\s*[\w"']+\s*:/gm) || [];
        totalStyleRules += keys.length;
        stylesheetDetails.push({ file: relPath, rules: keys.length });
      });
    }
  }

  // Match className="..." or className={`...`}
  const classNameMatches = content.match(/className\s*=\s*(?:['"]([^'"]+)['"]|\{[\s\S]*?\})/g) || [];
  totalClassNames += classNameMatches.length;
});

console.log('\n📊  STYLING AUDIT REPORT  📊');
console.log('============================');
console.log(`Total Files Audited: ${files.length}`);
console.log(`StyleSheet.create() Calls: ${totalStyleSheetCalls}`);
console.log(`Estimated CSS-in-JS Style Rules: ${totalStyleRules}`);
console.log(`NativeWind className Attributes: ${totalClassNames}`);
console.log('\nTop CSS-in-JS Stylesheets (by number of rules):');
stylesheetDetails
  .sort((a, b) => b.rules - a.rules)
  .slice(0, 15)
  .forEach(item => {
    console.log(`- ${item.file}: ${item.rules} rules`);
  });
console.log('============================\n');
