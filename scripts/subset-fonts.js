#!/usr/bin/env node

/**
 * Font Subsetting Pipeline
 * 
 * This script subsets font files to include only the characters needed for the application,
 * significantly reducing font file sizes and improving load times.
 * 
 * Usage: node scripts/subset-fonts.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  sourceFontsDir: path.join(__dirname, '../assets/fonts/source'),
  outputFontsDir: path.join(__dirname, '../assets/fonts/subset'),
  characterSets: {
    // Latin basic characters (English)
    latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ ',
    // Latin extended (European languages)
    latinExtended: 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ',
    // Cyrillic (Russian, etc.)
    cyrillic: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя',
    // Greek
    greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
    // Common symbols and punctuation
    symbols: '©®™€£¥₩₽₹₺₸₼₿₾₱₲₴₵₶₷₸₹₺₻₼₽₾₿',
  },
  fonts: [
    {
      name: 'Inter',
      source: 'Inter-Regular.ttf',
      subsets: ['latin', 'latinExtended', 'symbols'],
      weights: [400, 500, 600, 700]
    },
    {
      name: 'Inter',
      source: 'Inter-Bold.ttf',
      subsets: ['latin', 'latinExtended', 'symbols'],
      weights: [700]
    }
  ]
};

// Ensure directories exist
function ensureDirectories() {
  const dirs = [CONFIG.sourceFontsDir, CONFIG.outputFontsDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Get character set for subsets
function getCharacterSet(subsets) {
  return subsets.map(subset => CONFIG.characterSets[subset] || '').join('');
}

// Check if fonttools is installed
function checkFontTools() {
  try {
    execSync('pyftsubset --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('❌ fonttools (pyftsubset) is not installed.');
    console.log('Install it with: pip install fonttools');
    return false;
  }
}

// Subset a single font file
function subsetFont(fontConfig) {
  const { name, source, subsets, weights } = fontConfig;
  const sourcePath = path.join(CONFIG.sourceFontsDir, source);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Source font not found: ${sourcePath}`);
    return;
  }

  const characterSet = getCharacterSet(subsets);
  const outputName = `${name}-${subsets.join('-')}.ttf`;
  const outputPath = path.join(CONFIG.outputFontsDir, outputName);

  console.log(`\n🔄 Subsetting ${name} (${subsets.join(', ')})...`);

  try {
    // Use pyftsubset to create subset
    const command = [
      'pyftsubset',
      sourcePath,
      `--output-file=${outputPath}`,
      `--text=${characterSet}`,
      '--layout-features=*',
      '--flavor=woff2',
      '--with-zopfli'
    ].join(' ');

    execSync(command, { stdio: 'inherit' });
    
    // Get file sizes
    const originalSize = fs.statSync(sourcePath).size;
    const subsetSize = fs.statSync(outputPath).size;
    const reduction = ((1 - subsetSize / originalSize) * 100).toFixed(1);

    console.log(`✅ Created: ${outputName}`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Subset: ${(subsetSize / 1024).toFixed(2)} KB`);
    console.log(`   Reduction: ${reduction}%`);

  } catch (error) {
    console.error(`❌ Error subsetting ${name}:`, error.message);
  }
}

// Generate character set analysis
function analyzeCharacterUsage() {
  console.log('\n📊 Character Set Analysis:');
  console.log('Latin:', CONFIG.characterSets.latin.length, 'characters');
  console.log('Latin Extended:', CONFIG.characterSets.latinExtended.length, 'characters');
  console.log('Cyrillic:', CONFIG.characterSets.cyrillic.length, 'characters');
  console.log('Greek:', CONFIG.characterSets.greek.length, 'characters');
  console.log('Symbols:', CONFIG.characterSets.symbols.length, 'characters');
}

// Main execution
function main() {
  console.log('🎨 Font Subsetting Pipeline');
  console.log('=========================\n');

  ensureDirectories();
  analyzeCharacterUsage();

  if (!checkFontTools()) {
    process.exit(1);
  }

  console.log('\n🚀 Starting font subsetting...\n');

  CONFIG.fonts.forEach(font => {
    subsetFont(font);
  });

  console.log('\n✨ Font subsetting complete!');
  console.log(`📁 Subset fonts saved to: ${CONFIG.outputFontsDir}`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { CONFIG, subsetFont, getCharacterSet };
