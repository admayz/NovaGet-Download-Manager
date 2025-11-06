#!/usr/bin/env node

/**
 * Update Extension ID in Native Host Manifest
 * 
 * Usage: node update-extension-id.js <extension-id>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NATIVE_HOST_NAME = 'com.novaget.host';

function updateExtensionId(extensionId) {
  if (!extensionId) {
    console.error('❌ Extension ID is required!');
    console.log('\nUsage: node update-extension-id.js <extension-id>');
    console.log('\nTo find your extension ID:');
    console.log('1. Open chrome://extensions/');
    console.log('2. Enable "Developer mode"');
    console.log('3. Find NovaGet extension');
    console.log('4. Copy the ID (e.g., abcdefghijklmnopqrstuvwxyz123456)');
    process.exit(1);
  }

  // Validate extension ID format (32 lowercase letters)
  if (!/^[a-z]{32}$/.test(extensionId)) {
    console.error('❌ Invalid extension ID format!');
    console.log('Extension ID should be 32 lowercase letters');
    console.log('Example: abcdefghijklmnopqrstuvwxyz123456');
    process.exit(1);
  }

  console.log('Updating extension ID to:', extensionId);
  console.log('');

  // Update Chrome manifest
  const chromeManifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}.json`);
  
  if (fs.existsSync(chromeManifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(chromeManifestPath, 'utf8'));
    manifest.allowed_origins = [`chrome-extension://${extensionId}/`];
    fs.writeFileSync(chromeManifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ Updated Chrome manifest:', chromeManifestPath);
  } else {
    console.warn('⚠ Chrome manifest not found:', chromeManifestPath);
  }

  // Update Firefox manifest
  const firefoxManifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}-firefox.json`);
  
  if (fs.existsSync(firefoxManifestPath)) {
    // Firefox uses extension ID from manifest.json, not from here
    console.log('ℹ Firefox manifest uses ID from extension manifest.json');
  }

  // Update install script
  const installScriptPath = path.resolve(__dirname, 'install-native-host.js');
  
  if (fs.existsSync(installScriptPath)) {
    let scriptContent = fs.readFileSync(installScriptPath, 'utf8');
    scriptContent = scriptContent.replace(
      /const EXTENSION_ID = ['"][^'"]*['"]/,
      `const EXTENSION_ID = '${extensionId}'`
    );
    fs.writeFileSync(installScriptPath, scriptContent);
    console.log('✓ Updated install script:', installScriptPath);
  }

  console.log('\n✓ Extension ID updated successfully!');
  console.log('\nNext steps:');
  console.log('1. Make sure Desktop app is running (npm run dev)');
  console.log('2. Restart Chrome completely');
  console.log('3. Reload the extension (chrome://extensions/)');
  console.log('4. Click "Test Connection" in the extension popup');
}

// Get extension ID from command line argument
const extensionId = process.argv[2];
updateExtensionId(extensionId);
