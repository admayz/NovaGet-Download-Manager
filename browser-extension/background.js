// Background Service Worker for Download Manager Extension
// Handles download interception and native messaging communication

const NATIVE_HOST_NAME = 'com.downloadmanager.host';
const MIN_FILE_SIZE = 1024 * 100; // 100KB minimum to intercept

let nativePort = null;
let settings = {
  enabled: true,
  interceptDownloads: true,
  minFileSize: MIN_FILE_SIZE,
  clipboardWatcher: false,
  autoStart: true
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Download Manager Extension installed');
  
  // Load settings from storage
  const stored = await chrome.storage.local.get('settings');
  if (stored.settings) {
    settings = { ...settings, ...stored.settings };
  }
  
  // Set up alarm for clipboard watching if enabled
  if (settings.clipboardWatcher) {
    chrome.alarms.create('clipboardCheck', { periodInMinutes: 0.1 }); // Check every 6 seconds
  }
});

// Connect to native messaging host
function connectNative() {
  if (nativePort) {
    return nativePort;
  }
  
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    
    nativePort.onMessage.addListener((message) => {
      console.log('Received from native app:', message);
      handleNativeMessage(message);
    });
    
    nativePort.onDisconnect.addListener(() => {
      console.log('Native app disconnected:', chrome.runtime.lastError);
      nativePort = null;
      
      // Show notification if app is not running
      if (chrome.runtime.lastError) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Download Manager',
          message: 'Desktop application is not running. Please start it to use download interception.'
        });
      }
    });
    
    console.log('Connected to native app');
    return nativePort;
  } catch (error) {
    console.error('Failed to connect to native app:', error);
    return null;
  }
}

// Send message to native app
function sendToNative(message) {
  const port = connectNative();
  if (port) {
    port.postMessage(message);
    return true;
  }
  return false;
}

// Handle messages from native app
function handleNativeMessage(message) {
  switch (message.type) {
    case 'DOWNLOAD_STARTED':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Download Started',
        message: `${message.filename} is being downloaded`
      });
      break;
      
    case 'DOWNLOAD_COMPLETED':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Download Completed',
        message: `${message.filename} has been downloaded successfully`
      });
      break;
      
    case 'DOWNLOAD_FAILED':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Download Failed',
        message: `Failed to download ${message.filename}: ${message.error}`
      });
      break;
      
    case 'SETTINGS_REQUEST':
      sendToNative({
        type: 'SETTINGS_RESPONSE',
        settings: settings
      });
      break;
  }
}

// Listen for download events
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  if (!settings.enabled || !settings.interceptDownloads) {
    return;
  }
  
  // Check if file size meets minimum threshold
  if (downloadItem.fileSize > 0 && downloadItem.fileSize < settings.minFileSize) {
    console.log('File too small, not intercepting:', downloadItem.filename);
    return;
  }
  
  // Get cookies for the download URL
  const cookies = await getCookiesForUrl(downloadItem.url);
  
  // Extract download information
  const downloadInfo = {
    type: 'DOWNLOAD_REQUEST',
    url: downloadItem.url,
    filename: downloadItem.filename,
    fileSize: downloadItem.fileSize,
    mime: downloadItem.mime,
    referrer: downloadItem.referrer || '',
    cookies: cookies,
    headers: {},
    timestamp: Date.now()
  };
  
  // Try to send to native app
  const sent = sendToNative(downloadInfo);
  
  if (sent) {
    // Cancel the browser download
    chrome.downloads.cancel(downloadItem.id, () => {
      chrome.downloads.erase({ id: downloadItem.id });
      console.log('Download intercepted and sent to native app:', downloadItem.filename);
    });
  } else {
    console.log('Native app not available, allowing browser download:', downloadItem.filename);
  }
});

// Get cookies for a URL
async function getCookiesForUrl(url) {
  try {
    const cookies = await chrome.cookies.getAll({ url: url });
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path
    }));
  } catch (error) {
    console.error('Failed to get cookies:', error);
    return [];
  }
}

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ADD_DOWNLOAD':
      sendToNative({
        type: 'DOWNLOAD_REQUEST',
        url: message.url,
        filename: message.filename || '',
        referrer: message.referrer || '',
        cookies: message.cookies || [],
        headers: message.headers || {}
      });
      sendResponse({ success: true });
      break;
      
    case 'GET_SETTINGS':
      sendResponse({ settings: settings });
      break;
      
    case 'UPDATE_SETTINGS':
      settings = { ...settings, ...message.settings };
      chrome.storage.local.set({ settings: settings });
      
      // Update clipboard watcher alarm
      if (settings.clipboardWatcher) {
        chrome.alarms.create('clipboardCheck', { periodInMinutes: 0.1 });
      } else {
        chrome.alarms.clear('clipboardCheck');
      }
      
      sendResponse({ success: true });
      break;
      
    case 'CHECK_NATIVE_CONNECTION':
      const connected = connectNative() !== null;
      sendResponse({ connected: connected });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep channel open for async response
});

// Handle clipboard watching
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clipboardCheck' && settings.clipboardWatcher) {
    // Clipboard watching will be handled by content script
    // This is just a placeholder for future implementation
  }
});

console.log('Download Manager Extension background script loaded');
