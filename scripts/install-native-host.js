#!/usr/bin/env node

/**
 * NovaGet Native Host Installation Script
 * 
 * This script installs the native messaging host for the NovaGet browser extension.
 * It handles platform-specific installation for Windows, macOS, and Linux.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const NATIVE_HOST_NAME = 'com.novaget.host';
const EXTENSION_ID = 'EXTENSION_ID_PLACEHOLDER'; // Will be replaced after extension is published

/**
 * Get the absolute path to the native host script
 */
function getHostScriptPath() {
  const scriptPath = path.resolve(__dirname, '../native-host/host.js');
  
  // Make sure the script exists
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Native host script not found at: ${scriptPath}`);
  }

  // Make script executable on Unix
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      console.warn('Warning: Could not make host script executable:', error.message);
    }
  }

  return scriptPath;
}

/**
 * Create the native host manifest file
 */
function createManifest(hostPath) {
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'NovaGet Download Manager Native Messaging Host',
    path: hostPath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${EXTENSION_ID}/`
    ]
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Install for Windows
 */
function installWindows() {
  console.log('Installing native host for Windows...');

  const hostPath = getHostScriptPath();
  const manifestContent = createManifest(hostPath);

  // Create manifest file in native-host directory
  const manifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, manifestContent);

  console.log(`Manifest created at: ${manifestPath}`);

  // Create registry entry
  const registryKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
  const registryCommand = `reg add "${registryKey}" /ve /t REG_SZ /d "${manifestPath}" /f`;

  try {
    execSync(registryCommand, { stdio: 'inherit' });
    console.log('✓ Chrome registry entry created');
  } catch (error) {
    console.error('✗ Failed to create Chrome registry entry:', error.message);
    console.log('\nManual installation:');
    console.log(`1. Open Registry Editor (regedit)`);
    console.log(`2. Navigate to: ${registryKey}`);
    console.log(`3. Set default value to: ${manifestPath}`);
  }

  // Also try Edge
  const edgeRegistryKey = `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
  const edgeRegistryCommand = `reg add "${edgeRegistryKey}" /ve /t REG_SZ /d "${manifestPath}" /f`;

  try {
    execSync(edgeRegistryCommand, { stdio: 'inherit' });
    console.log('✓ Edge registry entry created');
  } catch (error) {
    console.warn('⚠ Could not create Edge registry entry (Edge may not be installed)');
  }

  console.log('\n✓ Installation complete!');
  console.log('\nNext steps:');
  console.log('1. Load the extension in Chrome/Edge');
  console.log('2. Update the EXTENSION_ID in the manifest');
  console.log('3. Run this script again to update the registry');
}

/**
 * Install for macOS
 */
function installMacOS() {
  console.log('Installing native host for macOS...');

  const hostPath = getHostScriptPath();
  const manifestContent = createManifest(hostPath);

  // Chrome manifest directory
  const chromeDir = path.join(
    os.homedir(),
    'Library/Application Support/Google/Chrome/NativeMessagingHosts'
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(chromeDir)) {
    fs.mkdirSync(chromeDir, { recursive: true });
  }

  // Write manifest
  const chromeManifestPath = path.join(chromeDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(chromeManifestPath, manifestContent);
  console.log(`✓ Chrome manifest installed at: ${chromeManifestPath}`);

  // Also try Chromium
  const chromiumDir = path.join(
    os.homedir(),
    'Library/Application Support/Chromium/NativeMessagingHosts'
  );

  if (fs.existsSync(path.dirname(chromiumDir))) {
    if (!fs.existsSync(chromiumDir)) {
      fs.mkdirSync(chromiumDir, { recursive: true });
    }
    const chromiumManifestPath = path.join(chromiumDir, `${NATIVE_HOST_NAME}.json`);
    fs.writeFileSync(chromiumManifestPath, manifestContent);
    console.log(`✓ Chromium manifest installed at: ${chromiumManifestPath}`);
  }

  // Also try Edge
  const edgeDir = path.join(
    os.homedir(),
    'Library/Application Support/Microsoft Edge/NativeMessagingHosts'
  );

  if (fs.existsSync(path.dirname(edgeDir))) {
    if (!fs.existsSync(edgeDir)) {
      fs.mkdirSync(edgeDir, { recursive: true });
    }
    const edgeManifestPath = path.join(edgeDir, `${NATIVE_HOST_NAME}.json`);
    fs.writeFileSync(edgeManifestPath, manifestContent);
    console.log(`✓ Edge manifest installed at: ${edgeManifestPath}`);
  }

  console.log('\n✓ Installation complete!');
  console.log('\nNext steps:');
  console.log('1. Load the extension in Chrome/Edge');
  console.log('2. Update the EXTENSION_ID in this script');
  console.log('3. Run this script again to update the manifests');
}

/**
 * Install for Linux
 */
function installLinux() {
  console.log('Installing native host for Linux...');

  const hostPath = getHostScriptPath();
  const manifestContent = createManifest(hostPath);

  // Chrome manifest directory
  const chromeDir = path.join(
    os.homedir(),
    '.config/google-chrome/NativeMessagingHosts'
  );

  // Create directory if it doesn't exist
  if (!fs.existsSync(chromeDir)) {
    fs.mkdirSync(chromeDir, { recursive: true });
  }

  // Write manifest
  const chromeManifestPath = path.join(chromeDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(chromeManifestPath, manifestContent);
  console.log(`✓ Chrome manifest installed at: ${chromeManifestPath}`);

  // Also try Chromium
  const chromiumDir = path.join(
    os.homedir(),
    '.config/chromium/NativeMessagingHosts'
  );

  if (fs.existsSync(path.dirname(chromiumDir))) {
    if (!fs.existsSync(chromiumDir)) {
      fs.mkdirSync(chromiumDir, { recursive: true });
    }
    const chromiumManifestPath = path.join(chromiumDir, `${NATIVE_HOST_NAME}.json`);
    fs.writeFileSync(chromiumManifestPath, manifestContent);
    console.log(`✓ Chromium manifest installed at: ${chromiumManifestPath}`);
  }

  // Also try Edge
  const edgeDir = path.join(
    os.homedir(),
    '.config/microsoft-edge/NativeMessagingHosts'
  );

  if (fs.existsSync(path.dirname(edgeDir))) {
    if (!fs.existsSync(edgeDir)) {
      fs.mkdirSync(edgeDir, { recursive: true });
    }
    const edgeManifestPath = path.join(edgeDir, `${NATIVE_HOST_NAME}.json`);
    fs.writeFileSync(edgeManifestPath, manifestContent);
    console.log(`✓ Edge manifest installed at: ${edgeManifestPath}`);
  }

  console.log('\n✓ Installation complete!');
  console.log('\nNext steps:');
  console.log('1. Load the extension in Chrome/Edge');
  console.log('2. Update the EXTENSION_ID in this script');
  console.log('3. Run this script again to update the manifests');
}

/**
 * Main installation function
 */
function install() {
  console.log('NovaGet Native Host Installer\n');

  // Check if extension ID needs to be updated
  if (EXTENSION_ID === 'EXTENSION_ID_PLACEHOLDER') {
    console.warn('⚠ Warning: Extension ID is not set!');
    console.warn('The native host will be installed, but you need to update the extension ID.');
    console.warn('After loading the extension, update EXTENSION_ID in this script and run again.\n');
  }

  try {
    switch (process.platform) {
      case 'win32':
        installWindows();
        break;
      case 'darwin':
        installMacOS();
        break;
      case 'linux':
        installLinux();
        break;
      default:
        console.error(`Unsupported platform: ${process.platform}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Installation failed:', error.message);
    process.exit(1);
  }
}

// Run installation
install();
