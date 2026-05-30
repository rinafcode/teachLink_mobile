#!/usr/bin/env node

/**
 * Font Analysis Script
 * 
 * This script analyzes font usage in the project to determine which characters
 * are actually needed, helping optimize font subsetting.
 * 
 * Usage: node scripts/analyze-fonts.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  sourceDir: path.join(__dirname, '../src'),
  excludeDirs: ['node_modules', '.expo', 'dist', 'build'],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  outputDir: path.join(__dirname, '../assets/fonts/analysis'),
};

// Character frequency map
let characterFrequency = new Map();

// Recursively find all relevant files
function findFiles(dir, excludeDirs) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        files.push(...findFiles(fullPath, excludeDirs));
      }
    } else if (CONFIG.fileExtensions.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract text content from files
function extractTextFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract string literals
    const stringRegex = /(["'`])(?:(?!\1|\\).|\\.)*\1/g;
    const matches = content.match(stringRegex) || [];
    
    // Extract JSX text content
    const jsxTextRegex = />([^<]+)</g;
    const jsxMatches = content.match(jsxTextRegex) || [];
    
    // Combine all text
    const allText = [...matches, ...jsxMatches].join('');
    
    // Remove quotes and clean
    return allText.replace(/["'`<>]/g, '');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return '';
  }
}

// Analyze character usage
function analyzeCharacterUsage(text) {
  for (const char of text) {
    const code = char.codePointAt(0);
    characterFrequency.set(char, (characterFrequency.get(char) || 0) + 1);
  }
}

// Categorize characters
function categorizeCharacters() {
  const categories = {
    latin: new Set(),
    latinExtended: new Set(),
    cyrillic: new Set(),
    greek: new Set(),
    symbols: new Set(),
    numbers: new Set(),
    punctuation: new Set(),
    other: new Set(),
  };

  characterFrequency.forEach((_, char) => {
    const code = char.codePointAt(0);
    
    // Latin (A-Z, a-z)
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      categories.latin.add(char);
    }
    // Numbers (0-9)
    else if (code >= 48 && code <= 57) {
      categories.numbers.add(char);
    }
    // Latin Extended
    else if (code >= 192 && code <= 255) {
      categories.latinExtended.add(char);
    }
    // Cyrillic
    else if (code >= 1024 && code <= 1279) {
      categories.cyrillic.add(char);
    }
    // Greek
    else if (code >= 880 && code <= 1023) {
      categories.greek.add(char);
    }
    // Symbols and punctuation
    else if (code >= 33 && code <= 47 || 
             code >= 58 && code <= 64 ||
             code >= 91 && code <= 96 ||
             code >= 123 && code <= 126) {
      categories.punctuation.add(char);
    }
    // Common symbols
    else if ([169, 174, 8482, 8364, 163, 165].includes(code)) {
      categories.symbols.add(char);
    }
    else {
      categories.other.add(char);
    }
  });

  return categories;
}

// Generate character set for subsetting
function generateCharacterSet(categories) {
  const sets = [];
  
  if (categories.latin.size > 0) sets.push('latin');
  if (categories.latinExtended.size > 0) sets.push('latinExtended');
  if (categories.cyrillic.size > 0) sets.push('cyrillic');
  if (categories.greek.size > 0) sets.push('greek');
  if (categories.symbols.size > 0) sets.push('symbols');
  
  return sets;
}

// Generate analysis report
function generateReport(categories, totalCharacters) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCharacters: totalCharacters,
      uniqueCharacters: characterFrequency.size,
      categories: {},
    },
    categories: {},
    recommendedSubsets: generateCharacterSet(categories),
    topCharacters: Array.from(characterFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
  };

  // Add category statistics
  Object.keys(categories).forEach(key => {
    const chars = Array.from(categories[key]).join('');
    report.categories[key] = {
      count: categories[key].size,
      characters: chars,
      frequency: chars.split('').map(char => ({
        char,
        count: characterFrequency.get(char) || 0,
      })),
    };
    report.summary.categories[key] = categories[key].size;
  });

  return report;
}

// Main execution
function main() {
  console.log('🔍 Font Usage Analysis');
  console.log('=======================\n');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Find all source files
  console.log('📂 Scanning source files...');
  const files = findFiles(CONFIG.sourceDir, CONFIG.excludeDirs);
  console.log(`   Found ${files.length} files\n`);

  // Analyze each file
  console.log('📊 Analyzing character usage...');
  let totalCharacters = 0;
  
  files.forEach((file, index) => {
    const text = extractTextFromFile(file);
    analyzeCharacterUsage(text);
    totalCharacters += text.length;
    
    if ((index + 1) % 100 === 0) {
      console.log(`   Processed ${index + 1}/${files.length} files...`);
    }
  });

  console.log(`   Total characters analyzed: ${totalCharacters}`);
  console.log(`   Unique characters found: ${characterFrequency.size}\n`);

  // Categorize characters
  console.log('📋 Categorizing characters...');
  const categories = categorizeCharacters();

  // Generate report
  console.log('📝 Generating report...');
  const report = generateReport(categories, totalCharacters);

  // Save report
  const reportPath = path.join(CONFIG.outputDir, 'font-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`   Report saved to: ${reportPath}\n`);

  // Print summary
  console.log('📊 Analysis Summary:');
  console.log('===================');
  console.log(`Total Characters: ${report.summary.totalCharacters}`);
  console.log(`Unique Characters: ${report.summary.uniqueCharacters}`);
  console.log('\nCharacter Categories:');
  Object.entries(report.summary.categories).forEach(([name, count]) => {
    if (count > 0) {
      console.log(`  ${name}: ${count} characters`);
    }
  });
  console.log('\nRecommended Subsets:', report.recommendedSubsets.join(', '));
  console.log('\nTop 20 Most Used Characters:');
  report.topCharacters.forEach(([char, count], index) => {
    console.log(`  ${index + 1}. '${char}' (${count} occurrences)`);
  });

  console.log('\n✨ Analysis complete!');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { CONFIG, analyzeCharacterUsage, categorizeCharacters };
