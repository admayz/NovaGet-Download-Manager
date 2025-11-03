/**
 * Simple test script to verify DatabaseService functionality
 * Run with: node -r ts-node/register electron/services/database/test-db.ts
 */

import { DatabaseService } from './DatabaseService';
import path from 'path';
import fs from 'fs';

// Use a temporary test database
const testDbPath = path.join(__dirname, 'test-novaget.db');

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('🧪 Testing DatabaseService...\n');

try {
  // Initialize database
  console.log('1. Initializing database...');
  const db = new DatabaseService(testDbPath);
  console.log('✅ Database initialized\n');

  // Test download operations
  console.log('2. Testing download operations...');
  const downloadId = db.createDownload({
    url: 'https://example.com/file.zip',
    filename: 'file.zip',
    directory: '/downloads',
    total_bytes: 1024000,
    downloaded_bytes: 0,
    status: 'queued',
    created_at: Date.now(),
  });
  console.log(`✅ Created download with ID: ${downloadId}`);

  const download = db.getDownload(downloadId);
  console.log(`✅ Retrieved download: ${download?.filename}`);

  db.updateDownload(downloadId, {
    status: 'downloading',
    downloaded_bytes: 512000,
  });
  console.log('✅ Updated download status\n');

  // Test segment operations
  console.log('3. Testing segment operations...');
  db.saveSegmentProgress(downloadId, [
    {
      download_id: downloadId,
      segment_number: 0,
      start_byte: 0,
      end_byte: 256000,
      downloaded_bytes: 256000,
      status: 'completed',
    },
    {
      download_id: downloadId,
      segment_number: 1,
      start_byte: 256000,
      end_byte: 512000,
      downloaded_bytes: 128000,
      status: 'downloading',
    },
  ]);
  console.log('✅ Saved segment progress');

  const segments = db.getSegmentProgress(downloadId);
  console.log(`✅ Retrieved ${segments.length} segments\n`);

  // Test settings operations
  console.log('4. Testing settings operations...');
  db.setSetting('max_concurrent_downloads', '5');
  db.setSetting('default_directory', '/downloads');
  console.log('✅ Set settings');

  const maxDownloads = db.getSetting('max_concurrent_downloads');
  console.log(`✅ Retrieved setting: max_concurrent_downloads = ${maxDownloads}`);

  const allSettings = db.getAllSettings();
  console.log(`✅ Retrieved all settings: ${Object.keys(allSettings).length} settings\n`);

  // Test speed history
  console.log('5. Testing speed history...');
  db.addSpeedHistory(downloadId, 1024000);
  db.addSpeedHistory(downloadId, 2048000);
  console.log('✅ Added speed history entries');

  const speedHistory = db.getSpeedHistory(downloadId, 10);
  console.log(`✅ Retrieved ${speedHistory.length} speed history entries\n`);

  // Test statistics
  console.log('6. Testing statistics...');
  const stats = db.getStatistics();
  console.log(`✅ Total downloads: ${stats.totalDownloads}`);
  console.log(`✅ Total bytes: ${stats.totalBytes}`);
  console.log(`✅ Completed: ${stats.completedDownloads}`);
  console.log(`✅ Failed: ${stats.failedDownloads}\n`);

  // Test query operations
  console.log('7. Testing query operations...');
  const allDownloads = db.getAllDownloads();
  console.log(`✅ Retrieved ${allDownloads.length} downloads`);

  const queuedDownloads = db.getDownloadsByStatus('queued');
  console.log(`✅ Retrieved ${queuedDownloads.length} queued downloads\n`);

  // Clean up
  console.log('8. Cleaning up...');
  db.close();
  fs.unlinkSync(testDbPath);
  console.log('✅ Test database cleaned up\n');

  console.log('🎉 All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error);
  
  // Clean up on error
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  process.exit(1);
}
