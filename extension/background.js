// NovaGet Browser Extension - Background Service Worker
// Intercepts downloads and sends them to NovaGet via native messaging

const NATIVE_HOST_NAME = 'com.novaget.host';

// Store extension settings
let settings = {
  enabled: true,
  autoIntercept: true,
  minFileSize: 1024 * 1024, // 1MB - only intercept files larger than this
  interceptTypes: ['application', 'video', 'audio', 'archive'] // MIME type prefixes to intercept
};

// Load settings from storage
chrome.storage.sync.get(['settings'], (result) => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings) {
    settings = { ...settings, ...changes.settings.newValue };
  }
});

/**
 * Check if a download should be intercepted based on settings
 */
function shouldInterceptDownload(downloadItem) {
  if (!settings.enabled || !settings.autoIntercept) {
    return false;
  }

  // Check file size
  if (downloadItem.fileSize && downloadItem.fileSize < settings.minFileSize) {
    return false;
  }

  // Check MIME type
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
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    
    let responseReceived = false;

    port.onMessage.addListener((response) => {
      responseReceived = true;
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
    });

    port.onDisconnect.addListener(() => {
      if (!responseReceived) {
        const error = chrome.runtime.lastError;
        reject(new Error(error ? error.message : 'Native host disconnected'));
      }
    });

    // Send the download message
    port.postMessage({
      type: 'download',
      data: downloadInfo
    });
  });
}

/**
 * Handle download interception
 */
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  // Check if we should intercept this download
  if (!shouldInterceptDownload(downloadItem)) {
    return;
  }

  try {
    // Cancel the browser download
    await chrome.downloads.cancel(downloadItem.id);
    await chrome.downloads.erase({ id: downloadItem.id });

    // Prepare download info
    const downloadInfo = {
      url: downloadItem.url,
      filename: downloadItem.filename,
      referrer: downloadItem.referrer || '',
      mime: downloadItem.mime || '',
      fileSize: downloadItem.fileSize || 0,
      timestamp: Date.now()
    };

    // Send to NovaGet
    const response = await sendToNovaGet(downloadInfo);

    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'NovaGet Download Manager',
      message: `Download added: ${downloadItem.filename}`,
      priority: 1
    });

  } catch (error) {
    console.error('Failed to send download to NovaGet:', error);

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'NovaGet Error',
      message: `Failed to add download: ${error.message}`,
      priority: 2
    });

    // Resume the browser download as fallback
    try {
      await chrome.downloads.resume(downloadItem.id);
    } catch (resumeError) {
      console.error('Failed to resume download:', resumeError);
    }
  }
});

/**
 * Handle context menu downloads (right-click -> Save link as)
 */
chrome.contextMenus.create({
  id: 'novaget-download',
  title: 'Download with NovaGet',
  contexts: ['link']
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'NovaGet Download Manager',
        message: 'Download added to NovaGet',
        priority: 1
      });

    } catch (error) {
      console.error('Failed to send download to NovaGet:', error);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ping') {
    // Test native host connection
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    
    port.onMessage.addListener((response) => {
      sendResponse({ success: true, response });
    });

    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
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
    chrome.storage.sync.set({ settings });
    sendResponse({ success: true });
    return false;
  }
});

// Log extension startup
console.log('NovaGet Browser Extension loaded');
