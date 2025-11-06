#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const NATIVE_HOST_NAME = 'com.novaget.host';
const EXTENSION_ID = 'novaget@example.com'; // Firefox extension ID

function installFirefoxWindows() {
  console.log('Installing native host for Firefox on Windows...\n');

  // Windows needs .bat wrapper
  const hostPath = path.resolve(__dirname, '../native-host/host.bat');
  
  // Create .bat file if it doesn't exist
  const batContent = '@echo off\nnode "%~dp0host.js" %*';
  const batPath = path.resolve(__dirname, '../native-host/host.bat');
  if (!fs.existsSync(batPath)) {
    fs.writeFileSync(batPath, batContent);
    console.log('✓ Created host.bat wrapper');
  }
  
  // Create manifest
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'NovaGet Download Manager Native Messaging Host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID]
  };

  // Firefox native messaging directory
  const firefoxDir = path.join(process.env.APPDATA, 'Mozilla', 'NativeMessagingHosts');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(firefoxDir)) {
    fs.mkdirSync(firefoxDir, { recursive: true });
    console.log(`✓ Created directory: ${firefoxDir}`);
  }

  // Write manifest
  const manifestPath = path.join(firefoxDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✓ Manifest installed at: ${manifestPath}`);
  console.log('\n✓ Installation complete!');
  console.log('\nNext steps:');
  console.log('1. Make sure NovaGet desktop app is running');
  console.log('2. Load the extension in Firefox');
  console.log('3. Click "Test Connection" in the extension popup');
}

function installFirefoxMac() {
  console.log('Installing native host for Firefox on macOS...\n');

  const hostPath = path.resolve(__dirname, '../native-host/host.js');
  
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'NovaGet Download Manager Native Messaging Host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID]
  };

  const firefoxDir = path.join(os.homedir(), 'Library/Application Support/Mozilla/NativeMessagingHosts');
  
  if (!fs.existsSync(firefoxDir)) {
    fs.mkdirSync(firefoxDir, { recursive: true });
    console.log(`✓ Created directory: ${firefoxDir}`);
  }

  const manifestPath = path.join(firefoxDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✓ Manifest installed at: ${manifestPath}`);
  console.log('\n✓ Installation complete!');
}

function installFirefoxLinux() {
  console.log('Installing native host for Firefox on Linux...\n');

  const hostPath = path.resolve(__dirname, '../native-host/host.js');
  
  const manifest = {
    name: NATIVE_HOST_NAME,
    description: 'NovaGet Download Manager Native Messaging Host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID]
  };

  const firefoxDir = path.join(os.homedir(), '.mozilla/native-messaging-hosts');
  
  if (!fs.existsSync(firefoxDir)) {
    fs.mkdirSync(firefoxDir, { recursive: true });
    console.log(`✓ Created directory: ${firefoxDir}`);
  }

  const manifestPath = path.join(firefoxDir, `${NATIVE_HOST_NAME}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✓ Manifest installed at: ${manifestPath}`);
  console.log('\n✓ Installation complete!');
}

// Main
console.log('NovaGet Native Host Installer for Firefox\n');

try {
  switch (process.platform) {
    case 'win32':
      installFirefoxWindows();
      break;
    case 'darwin':
      installFirefoxMac();
      break;
    case 'linux':
      installFirefoxLinux();
      break;
    default:
      console.error(`Unsupported platform: ${process.platform}`);
      process.exit(1);
  }
} catch (error) {
  console.error('\n✗ Installation failed:', error.message);
  process.exit(1);
}
