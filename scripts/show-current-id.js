#!/usr/bin/env node

/**
 * Show current extension ID from native host manifest
 */

const fs = require('fs');
const path = require('path');

const NATIVE_HOST_NAME = 'com.novaget.host';

console.log('Current Native Host Configuration\n');
console.log('='.repeat(50));

// Check Chrome manifest
const chromeManifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}.json`);

if (fs.existsSync(chromeManifestPath)) {
  console.log('\n📄 Chrome Manifest:');
  console.log('   Path:', chromeManifestPath);
  
  try {
    const manifest = JSON.parse(fs.readFileSync(chromeManifestPath, 'utf8'));
    console.log('   Host Path:', manifest.path);
    console.log('   Allowed Origins:', manifest.allowed_origins);
    
    // Extract extension ID
    if (manifest.allowed_origins && manifest.allowed_origins.length > 0) {
      const origin = manifest.allowed_origins[0];
      const match = origin.match(/chrome-extension:\/\/([a-z]{32})\//);
      if (match) {
        console.log('\n   ✓ Extension ID:', match[1]);
      } else {
        console.log('\n   ⚠ Invalid extension ID format!');
      }
    }
  } catch (error) {
    console.log('   ❌ Error reading manifest:', error.message);
  }
} else {
  console.log('\n❌ Chrome manifest not found!');
  console.log('   Expected:', chromeManifestPath);
  console.log('\n   Run: node scripts/install-native-host.js');
}

// Check Firefox manifest
const firefoxManifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}-firefox.json`);

if (fs.existsSync(firefoxManifestPath)) {
  console.log('\n📄 Firefox Manifest:');
  console.log('   Path:', firefoxManifestPath);
  
  try {
    const manifest = JSON.parse(fs.readFileSync(firefoxManifestPath, 'utf8'));
    console.log('   Host Path:', manifest.path);
    console.log('   Allowed Extensions:', manifest.allowed_extensions);
  } catch (error) {
    console.log('   ❌ Error reading manifest:', error.message);
  }
}

console.log('\n' + '='.repeat(50));
console.log('\nTo update extension ID:');
console.log('  node scripts/update-extension-id.js <new-extension-id>');
console.log('\nTo find your extension ID:');
console.log('  1. Open chrome://extensions/');
console.log('  2. Enable Developer mode');
console.log('  3. Find NovaGet extension');
console.log('  4. Copy the ID');
console.log('');
