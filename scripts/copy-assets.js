/**
 * Copy assets to dist folder after build
 */
const fs = require('fs');
const path = require('path');

// Copy assets
const assetsSourceDir = path.join(__dirname, '../electron/assets');
const assetsTargetDir = path.join(__dirname, '../dist/assets');

// Create target directory if it doesn't exist
if (!fs.existsSync(assetsTargetDir)) {
  fs.mkdirSync(assetsTargetDir, { recursive: true });
}

// Copy all files from source to target
fs.cpSync(assetsSourceDir, assetsTargetDir, { recursive: true });

console.log('✓ Assets copied to dist/assets');

// Copy locales
const localesSourceDir = path.join(__dirname, '../locales');
const localesTargetDir = path.join(__dirname, '../dist/locales');

// Create target directory if it doesn't exist
if (!fs.existsSync(localesTargetDir)) {
  fs.mkdirSync(localesTargetDir, { recursive: true });
}

// Copy all locale files
if (fs.existsSync(localesSourceDir)) {
  fs.cpSync(localesSourceDir, localesTargetDir, { recursive: true });
  console.log('✓ Locales copied to dist/locales');
} else {
  console.warn('⚠ Locales directory not found at', localesSourceDir);
}
