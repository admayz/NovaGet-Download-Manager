#!/usr/bin/env node

/**
 * Test script for native messaging host
 * Simulates browser sending messages to the native host
 */

const { spawn } = require('child_process');
const path = require('path');

const hostPath = path.join(__dirname, 'native-host', 'host.js');

console.log('Testing native messaging host...\n');
console.log('Host path:', hostPath);
console.log('---\n');

// Start the native host
const host = spawn('node', [hostPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = Buffer.alloc(0);

// Listen for responses
host.stdout.on('data', (data) => {
  responseBuffer = Buffer.concat([responseBuffer, data]);
  
  // Try to parse response
  while (responseBuffer.length >= 4) {
    const messageLength = responseBuffer.readUInt32LE(0);
    
    if (responseBuffer.length < 4 + messageLength) {
      break;
    }
    
    const messageBytes = responseBuffer.slice(4, 4 + messageLength);
    const message = messageBytes.toString('utf8');
    
    console.log('Response:', JSON.parse(message));
    
    responseBuffer = responseBuffer.slice(4 + messageLength);
  }
});

host.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

host.on('close', (code) => {
  console.log(`\nHost exited with code ${code}`);
});

// Send a ping message
function sendMessage(message) {
  const messageStr = JSON.stringify(message);
  const messageBytes = Buffer.from(messageStr, 'utf8');
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32LE(messageBytes.length, 0);
  
  host.stdin.write(lengthBytes);
  host.stdin.write(messageBytes);
}

// Test 1: Ping
console.log('Test 1: Sending ping...');
sendMessage({ type: 'ping' });

// Test 2: Download (after 2 seconds)
setTimeout(() => {
  console.log('\nTest 2: Sending download request...');
  sendMessage({
    type: 'download',
    data: {
      url: 'https://example.com/test.zip',
      filename: 'test.zip',
      referrer: 'https://example.com',
      mime: 'application/zip',
      fileSize: 1024000
    }
  });
  
  // Close after 3 seconds
  setTimeout(() => {
    host.stdin.end();
  }, 3000);
}, 2000);
