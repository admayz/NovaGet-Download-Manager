#!/usr/bin/env node

/**
 * NovaGet Native Host Uninstallation Script
 * 
 * This script removes the native messaging host for the NovaGet browser extension.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const NATIVE_HOST_NAME = 'com.novaget.host';

/**
 * Uninstall for Windows
 */
function uninstallWindows() {
  console.log('Uninstalling native host for Windows...');

  // Remove Chrome registry entry
  const chromeRegistryKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
  try {
    execSync(`reg delete "${chromeRegistryKey}" /f`, { stdio: 'inherit' });
    console.log('✓ Chrome registry entry removed');
  } catch (error) {
    console.warn('⚠ Chrome registry entry not found or could not be removed');
  }

  // Remove Edge registry entry
  const edgeRegistryKey = `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`;
  try {
    execSync(`reg delete "${edgeRegistryKey}" /f`, { stdio: 'inherit' });
    console.log('✓ Edge registry entry removed');
  } catch (error) {
    console.warn('⚠ Edge registry entry not found or could not be removed');
  }

  // Remove manifest file
  const manifestPath = path.resolve(__dirname, '../native-host', `${NATIVE_HOST_NAME}.json`);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
    console.log('✓ Manifest file removed');
  }

  console.log('\n✓ Uninstallation complete!');
}

/**
 * Uninstall for macOS
 */
function uninstallMacOS() {
  console.log('Uninstalling native host for macOS...');

  const locations = [
    path.join(os.homedir(), 'Library/Application Support/Google/Chrome/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`),
    path.join(os.homedir(), 'Library/Application Support/Chromium/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`),
    path.join(os.homedir(), 'Library/Application Support/Microsoft Edge/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`)
  ];

  let removed = 0;
  locations.forEach(location => {
    if (fs.existsSync(location)) {
      fs.unlinkSync(location);
      console.log(`✓ Removed: ${location}`);
      removed++;
    }
  });

  if (removed === 0) {
    console.log('⚠ No manifest files found');
  }

  console.log('\n✓ Uninstallation complete!');
}

/**
 * Uninstall for Linux
 */
function uninstallLinux() {
  console.log('Uninstalling native host for Linux...');

  const locations = [
    path.join(os.homedir(), '.config/google-chrome/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`),
    path.join(os.homedir(), '.config/chromium/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`),
    path.join(os.homedir(), '.config/microsoft-edge/NativeMessagingHosts', `${NATIVE_HOST_NAME}.json`)
  ];

  let removed = 0;
  locations.forEach(location => {
    if (fs.existsSync(location)) {
      fs.unlinkSync(location);
      console.log(`✓ Removed: ${location}`);
      removed++;
    }
  });

  if (removed === 0) {
    console.log('⚠ No manifest files found');
  }

  console.log('\n✓ Uninstallation complete!');
}

/**
 * Main uninstallation function
 */
function uninstall() {
  console.log('NovaGet Native Host Uninstaller\n');

  try {
    switch (process.platform) {
      case 'win32':
        uninstallWindows();
        break;
      case 'darwin':
        uninstallMacOS();
        break;
      case 'linux':
        uninstallLinux();
        break;
      default:
        console.error(`Unsupported platform: ${process.platform}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Uninstallation failed:', error.message);
    process.exit(1);
  }
}

// Run uninstallation
uninstall();
