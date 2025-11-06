// NovaGet Browser Extension - Background Script for Firefox
// Firefox uses 'browser' API instead of 'chrome'

const NATIVE_HOST_NAME = 'com.novaget.host';

// Use browser API for Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Store extension settings
let settings = {
  enabled: true,
  autoIntercept: true,
  minFileSize: 1024 * 1024, // 1MB
  interceptTypes: ['application', 'video', 'audio', 'archive']
};

// Load settings from storage
if (browserAPI.storage && browserAPI.storage.sync) {
  browserAPI.storage.sync.get(['settings']).then((result) => {
    if (result && result.settings) {
      settings = { ...settings, ...result.settings };
    }
  }).catch(err => {
    console.warn('Could not load settings:', err);
  });

  // Listen for settings changes
  browserAPI.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
    }
  });
}

/**
 * Check if a download should be intercepted
 */
function shouldInterceptDownload(downloadItem) {
  if (!settings.enabled || !settings.autoIntercept) {
    return false;
  }

  if (downloadItem.fileSize && downloadItem.fileSize < settings.minFileSize) {
    return false;
  }

  if (downloadItem.mime) {
    const shouldIntercept = settings.interceptTypes.some(type => 
      downloadItem.mime.startsWith(type)
    );
    if (!shouldIntercept) {
      return false;
    }
  }

  return true;
}

/**
 * Send download to NovaGet via native messaging
 */
function sendToNovaGet(downloadInfo) {
  return new Promise((resolve, reject) => {
    console.log('Connecting to native host:', NATIVE_HOST_NAME);
    
    let port;
    try {
      port = browserAPI.runtime.connectNative(NATIVE_HOST_NAME);
    } catch (error) {
      console.error('Failed to connect to native host:', error);
      reject(new Error('Could not connect to native host: ' + error.message));
      return;
    }
    
    let responseReceived = false;

    port.onMessage.addListener((response) => {
      console.log('Received response from native host:', response);
      responseReceived = true;
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
    });

    port.onDisconnect.addListener(() => {
      if (!responseReceived) {
        const error = browserAPI.runtime.lastError;
        console.error('Native host disconnected:', error);
        reject(new Error(error ? error.message : 'Native host disconnected'));
      }
    });

    // Send the download message
    console.log('Sending message to native host:', downloadInfo);
    port.postMessage({
      type: 'download',
      data: downloadInfo
    });
  });
}

/**
 * Handle download interception
 */
browserAPI.downloads.onCreated.addListener(async (downloadItem) => {
  console.log('Download created:', downloadItem);
  
  if (!shouldInterceptDownload(downloadItem)) {
    console.log('Download not intercepted (settings)');
    return;
  }

  try {
    // Cancel the browser download
    await browserAPI.downloads.cancel(downloadItem.id);
    await browserAPI.downloads.erase({ id: downloadItem.id });

    // Prepare download info
    const downloadInfo = {
      url: downloadItem.url,
      filename: downloadItem.filename,
      referrer: downloadItem.referrer || '',
      mime: downloadItem.mime || '',
      fileSize: downloadItem.fileSize || 0,
      timestamp: Date.now()
    };

    console.log('Sending to NovaGet:', downloadInfo);

    // Send to NovaGet
    const response = await sendToNovaGet(downloadInfo);

    // Show success notification
    browserAPI.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128x128.png',
      title: 'NovaGet Download Manager',
      message: `Download added: ${downloadItem.filename}`,
      priority: 1
    });

  } catch (error) {
    console.error('Failed to send download to NovaGet:', error);

    // Show error notification
    browserAPI.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128x128.png',
      title: 'NovaGet Error',
      message: `Failed to add download: ${error.message}`,
      priority: 2
    });

    // Resume the browser download as fallback
    try {
      await browserAPI.downloads.resume(downloadItem.id);
    } catch (resumeError) {
      console.error('Failed to resume download:', resumeError);
    }
  }
});

/**
 * Create context menu when extension is installed
 */
browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.contextMenus.create({
    id: 'novaget-download',
    title: 'Download with NovaGet',
    contexts: ['link']
  });
  console.log('NovaGet context menu created');
});

/**
 * Handle context menu clicks
 */
browserAPI.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'novaget-download' && info.linkUrl) {
    try {
      const downloadInfo = {
        url: info.linkUrl,
        filename: info.linkUrl.split('/').pop() || 'download',
        referrer: tab.url || '',
        mime: '',
        fileSize: 0,
        timestamp: Date.now()
      };

      await sendToNovaGet(downloadInfo);

      browserAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128x128.png',
        title: 'NovaGet Download Manager',
        message: 'Download added to NovaGet',
        priority: 1
      });

    } catch (error) {
      console.error('Failed to send download to NovaGet:', error);

      browserAPI.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128x128.png',
        title: 'NovaGet Error',
        message: `Failed to add download: ${error.message}`,
        priority: 2
      });
    }
  }
});

/**
 * Handle messages from popup/options pages
 */
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ping') {
    console.log('Ping request received');
    
    // Test native host connection
    let port;
    try {
      port = browserAPI.runtime.connectNative(NATIVE_HOST_NAME);
    } catch (error) {
      console.error('Failed to connect for ping:', error);
      sendResponse({ 
        success: false, 
        error: 'Could not connect to native host: ' + error.message
      });
      return false;
    }
    
    port.onMessage.addListener((response) => {
      console.log('Ping response:', response);
      sendResponse({ success: true, response });
    });

    port.onDisconnect.addListener(() => {
      const error = browserAPI.runtime.lastError;
      console.error('Ping disconnected:', error);
      sendResponse({ 
        success: false, 
        error: error ? error.message : 'Native host not available' 
      });
    });

    port.postMessage({ type: 'ping' });

    return true; // Keep channel open for async response
  }

  if (message.type === 'getSettings') {
    sendResponse({ settings });
    return false;
  }

  if (message.type === 'updateSettings') {
    settings = { ...settings, ...message.settings };
    if (browserAPI.storage && browserAPI.storage.sync) {
      browserAPI.storage.sync.set({ settings });
    }
    sendResponse({ success: true });
    return false;
  }
});

// Log extension startup
console.log('NovaGet Browser Extension loaded (Firefox)');
console.log('Native host name:', NATIVE_HOST_NAME);
console.log('Browser API:', typeof browser !== 'undefined' ? 'browser' : 'chrome');

// Test native messaging on startup
setTimeout(() => {
  console.log('Testing native messaging connection...');
  try {
    const port = browserAPI.runtime.connectNative(NATIVE_HOST_NAME);
    
    port.onMessage.addListener((response) => {
      console.log('✓ Native messaging test successful:', response);
      port.disconnect();
    });
    
    port.onDisconnect.addListener(() => {
      const error = browserAPI.runtime.lastError;
      if (error) {
        console.error('✗ Native messaging test failed:', error);
      }
    });
    
    port.postMessage({ type: 'ping' });
  } catch (error) {
    console.error('✗ Native messaging connection error:', error);
  }
}, 1000);
