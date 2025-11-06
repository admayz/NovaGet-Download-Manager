#!/usr/bin/env node

/**
 * Build script for browser extensions
 * Usage: node build.js [chrome|firefox|all]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const target = args[0] || 'all';

const validTargets = ['chrome', 'firefox', 'safari', 'all'];
if (!validTargets.includes(target)) {
  console.error(`Invalid target: ${target}`);
  console.log('Valid targets:', validTargets.join(', '));
  process.exit(1);
}

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');

function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

function copyDirectory(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

function buildChrome() {
  console.log('\n🌐 Building Chrome extension...');
  
  const chromeDir = path.join(baseDir, 'chrome');
  const commonDir = path.join(baseDir, 'common');
  const chromeDist = path.join(distDir, 'chrome');
  
  // First, update Chrome source with latest common files
  const commonFiles = ['popup.html', 'popup.js', 'options.html', 'options.js'];
  commonFiles.forEach(file => {
    const source = path.join(commonDir, file);
    const dest = path.join(chromeDir, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
    }
  });
  
  // Copy icons directory
  const commonIconsDir = path.join(commonDir, 'icons');
  const chromeIconsDir = path.join(chromeDir, 'icons');
  if (fs.existsSync(commonIconsDir)) {
    copyDirectory(commonIconsDir, chromeIconsDir);
  }
  
  // Copy all Chrome files to dist
  copyDirectory(chromeDir, chromeDist);
  
  console.log(`✓ Chrome extension built at: ${chromeDist}`);
  console.log('\nTo install:');
  console.log('1. Open chrome://extensions/');
  console.log('2. Enable Developer mode');
  console.log('3. Click "Load unpacked"');
  console.log(`4. Select: ${chromeDist}`);
}

function buildFirefox() {
  console.log('\n🦊 Building Firefox extension...');
  
  const firefoxDir = path.join(baseDir, 'firefox');
  const commonDir = path.join(baseDir, 'common');
  const firefoxDist = path.join(distDir, 'firefox');
  
  // First, update Firefox source with latest common files
  const commonFiles = ['popup.html', 'popup.js', 'options.html', 'options.js'];
  commonFiles.forEach(file => {
    const source = path.join(commonDir, file);
    const dest = path.join(firefoxDir, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
    }
  });
  
  // Copy icons directory
  const commonIconsDir = path.join(commonDir, 'icons');
  const firefoxIconsDir = path.join(firefoxDir, 'icons');
  if (fs.existsSync(commonIconsDir)) {
    copyDirectory(commonIconsDir, firefoxIconsDir);
  }
  
  // Copy all Firefox files to dist
  copyDirectory(firefoxDir, firefoxDist);
  
  console.log(`✓ Firefox extension built at: ${firefoxDist}`);
  console.log('\nTo install:');
  console.log('1. Open about:debugging#/runtime/this-firefox');
  console.log('2. Click "Load Temporary Add-on"');
  console.log(`3. Select: ${path.join(firefoxDist, 'manifest.json')}`);
}

function buildSafari() {
  console.log('\n🧭 Building Safari extension...');
  
  const safariDir = path.join(baseDir, 'safari');
  const commonDir = path.join(baseDir, 'common');
  const safariDist = path.join(distDir, 'safari');
  
  // Update Safari source with latest common files
  const commonFiles = ['popup.html', 'popup.js', 'options.html', 'options.js'];
  commonFiles.forEach(file => {
    const source = path.join(commonDir, file);
    const dest = path.join(safariDir, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
    }
  });
  
  // Copy icons directory
  const commonIconsDir = path.join(commonDir, 'icons');
  const safariIconsDir = path.join(safariDir, 'icons');
  if (fs.existsSync(commonIconsDir)) {
    copyDirectory(commonIconsDir, safariIconsDir);
  }
  
  // Copy all Safari files to dist
  copyDirectory(safariDir, safariDist);
  
  console.log(`✓ Safari extension built at: ${safariDist}`);
  console.log('\nTo convert for Safari:');
  console.log('1. Open Terminal on macOS');
  console.log('2. Run: xcrun safari-web-extension-converter <path-to-dist/safari>');
  console.log('3. Open the generated Xcode project');
  console.log('4. Build and run in Xcode');
  console.log('\nNote: Safari extension requires macOS and Xcode');
}

// Main
console.log('🔨 NovaGet Extension Builder\n');
console.log('='.repeat(50));

cleanDist();

if (target === 'chrome' || target === 'all') {
  buildChrome();
}

if (target === 'firefox' || target === 'all') {
  buildFirefox();
}

if (target === 'safari' || target === 'all') {
  buildSafari();
}

console.log('\n' + '='.repeat(50));
console.log('\n✅ Build complete!');

if (target === 'all') {
  console.log('\nBuilt extensions:');
  console.log('- Chrome: dist/chrome/');
  console.log('- Firefox: dist/firefox/');
  console.log('- Safari: dist/safari/');
}
