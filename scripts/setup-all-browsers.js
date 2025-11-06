#!/usr/bin/env node

/**
 * Setup native messaging for all browsers
 * Automatically detects Chrome extension ID and configures Firefox
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 NovaGet Browser Extension Setup\n');
console.log('='.repeat(50));

// Step 1: Install Chrome native host
console.log('\n📦 Step 1: Installing Chrome native host...');
try {
  execSync('node install-native-host.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✓ Chrome native host installed');
} catch (error) {
  console.error('❌ Failed to install Chrome native host');
}

// Step 2: Try to auto-detect Chrome extension ID
console.log('\n🔍 Step 2: Auto-detecting Chrome extension ID...');
try {
  execSync('node ../extension/auto-update-id.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✓ Chrome extension ID updated');
} catch (error) {
  console.log('⚠ Could not auto-detect Chrome extension ID');
  console.log('  You can update it manually later with:');
  console.log('  node scripts/update-extension-id.js <id>');
}

// Step 3: Install Firefox native host
console.log('\n🦊 Step 3: Installing Firefox native host...');
try {
  execSync('node install-native-host-firefox.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✓ Firefox native host installed');
} catch (error) {
  console.error('❌ Failed to install Firefox native host');
}

// Step 4: Build Firefox extension
console.log('\n🔨 Step 4: Building Firefox extension...');
try {
  execSync('node build-firefox.js', {
    cwd: path.join(__dirname, '../extension'),
    stdio: 'inherit'
  });
  console.log('✓ Firefox extension built');
} catch (error) {
  console.error('❌ Failed to build Firefox extension');
}

console.log('\n' + '='.repeat(50));
console.log('\n✅ Setup complete!\n');

console.log('📋 Next steps:\n');

console.log('Chrome:');
console.log('  1. Open chrome://extensions/');
console.log('  2. Enable Developer mode');
console.log('  3. Click "Load unpacked"');
console.log('  4. Select: extension/ folder');
console.log('  5. If connection fails, run: node extension/auto-update-id.js\n');

console.log('Firefox:');
console.log('  1. Open about:debugging#/runtime/this-firefox');
console.log('  2. Click "Load Temporary Add-on"');
console.log('  3. Select: extension/build-firefox/manifest.json\n');

console.log('Desktop App:');
console.log('  npm run dev\n');

console.log('Test:');
console.log('  Click "Test Connection" in extension popup');
console.log('');
