// NovaGet Browser Extension - Background Script for Safari
// Safari uses 'browser' API (WebExtensions)

const NATIVE_HOST_NAME = 'com.novaget.host';

// Safari uses browser API
const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

// Store extension settings
let settings = {
  enabled: true,
  autoIntercept: true,
  minFileSize: 1024 * 1024, // 1MB
  interceptTypes: ['application', 'video', 'audio', 'archive']
};

// Load settings from storage
if (browserAPI && browserAPI.storage && browserAPI.storage.sync) {
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
 * Send download to NovaGet via HTTP (Safari doesn't support native messaging well)
 */
async function sendToNovaGet(downloadInfo) {
  try {
    console.log('Sending to NovaGet via HTTP:', downloadInfo);
    
    const response = await fetch('http://localhost:42069/api/downloads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'add-download',
        data: downloadInfo
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return { success: true, downloadId: data.downloadId };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Failed to send to NovaGet:', error);
    throw error;
  }
}

/**
 * Handle download interception
 */
if (browserAPI && browserAPI.downloads) {
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

      // Send to NovaGet via HTTP
      const response = await sendToNovaGet(downloadInfo);

      // Show success notification
      if (browserAPI.notifications) {
        browserAPI.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128x128.png',
          title: 'NovaGet Download Manager',
          message: `Download added: ${downloadItem.filename}`,
          priority: 1
        });
      }

    } catch (error) {
      console.error('Failed to send download to NovaGet:', error);

      // Show error notification
      if (browserAPI.notifications) {
        browserAPI.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128x128.png',
          title: 'NovaGet Error',
          message: `Failed to add download: ${error.message}`,
          priority: 2
        });
      }

      // Resume the browser download as fallback
      try {
        await browserAPI.downloads.resume(downloadItem.id);
      } catch (resumeError) {
        console.error('Failed to resume download:', resumeError);
      }
    }
  });
}

/**
 * Create context menu when extension is installed
 */
if (browserAPI && browserAPI.runtime) {
  browserAPI.runtime.onInstalled.addListener(() => {
    if (browserAPI.contextMenus) {
      browserAPI.contextMenus.create({
        id: 'novaget-download',
        title: 'Download with NovaGet',
        contexts: ['link']
      });
      console.log('NovaGet context menu created');
    }
  });
}

/**
 * Handle context menu clicks
 */
if (browserAPI && browserAPI.contextMenus) {
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

        if (browserAPI.notifications) {
          browserAPI.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128x128.png',
            title: 'NovaGet Download Manager',
            message: 'Download added to NovaGet',
            priority: 1
          });
        }

      } catch (error) {
        console.error('Failed to send download to NovaGet:', error);

        if (browserAPI.notifications) {
          browserAPI.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128x128.png',
            title: 'NovaGet Error',
            message: `Failed to add download: ${error.message}`,
            priority: 2
          });
        }
      }
    }
  });
}

/**
 * Handle messages from popup/options pages
 */
if (browserAPI && browserAPI.runtime) {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ping') {
      console.log('Ping request received');
      
      // Test HTTP connection
      fetch('http://localhost:42069/api/health')
        .then(response => response.json())
        .then(data => {
          sendResponse({ 
            success: true, 
            response: data,
            method: 'http'
          });
        })
        .catch(error => {
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        });

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
}

// Log extension startup
console.log('NovaGet Browser Extension loaded (Safari)');
console.log('Using HTTP communication (Safari native messaging limited)');
console.log('Browser API:', browserAPI ? 'available' : 'not available');
