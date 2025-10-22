// Content Script for Download Manager Extension
// Intercepts download links and monitors clipboard

let lastClipboardContent = '';

// Detect download links on the page
function isDownloadLink(url) {
  if (!url) return false;
  
  const downloadExtensions = [
    '.exe', '.msi', '.zip', '.rar', '.7z', '.tar', '.gz',
    '.iso', '.dmg', '.pkg', '.deb', '.rpm',
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv',
    '.mp3', '.wav', '.flac', '.aac',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.apk', '.ipa'
  ];
  
  const urlLower = url.toLowerCase();
  return downloadExtensions.some(ext => urlLower.includes(ext));
}

// Check if URL is a download URL
function checkDownloadUrl(url) {
  if (isDownloadLink(url)) {
    return true;
  }
  
  // Check for content-disposition in URL patterns
  if (url.includes('download') || url.includes('attachment')) {
    return true;
  }
  
  return false;
}

// Monitor right-click context menu on links
document.addEventListener('contextmenu', (event) => {
  const target = event.target;
  
  if (target.tagName === 'A' && target.href) {
    const url = target.href;
    
    if (checkDownloadUrl(url)) {
      // Store the URL for potential download
      chrome.storage.local.set({ lastContextUrl: url });
    }
  }
}, true);

// Intercept link clicks for download links
document.addEventListener('click', async (event) => {
  const target = event.target.closest('a');
  
  if (!target || !target.href) return;
  
  const url = target.href;
  
  if (checkDownloadUrl(url)) {
    // Get settings to check if interception is enabled
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (response.settings && response.settings.interceptDownloads) {
      // Let the browser handle it naturally - downloads.onCreated will intercept
      console.log('Download link detected:', url);
    }
  }
}, true);

// Clipboard monitoring (requires user interaction)
let clipboardCheckInterval = null;

async function checkClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    
    if (text && text !== lastClipboardContent) {
      lastClipboardContent = text;
      
      // Check if it's a URL
      if (text.startsWith('http://') || text.startsWith('https://')) {
        if (checkDownloadUrl(text)) {
          // Get settings
          const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
          
          if (response.settings && response.settings.clipboardWatcher) {
            // Show notification to add download
            showDownloadNotification(text);
          }
        }
      }
    }
  } catch (error) {
    // Clipboard access denied or not available
    console.log('Clipboard access not available');
  }
}

function showDownloadNotification(url) {
  // Create a small notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 999999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    cursor: pointer;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Download URL Detected</div>
    <div style="font-size: 12px; margin-bottom: 10px; word-break: break-all;">${url.substring(0, 50)}...</div>
    <button style="background: white; color: #4CAF50; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer; font-weight: bold;">
      Add to Download Manager
    </button>
  `;
  
  const button = notification.querySelector('button');
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: 'ADD_DOWNLOAD',
      url: url
    });
    document.body.removeChild(notification);
  });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 10000);
  
  document.body.appendChild(notification);
}

// Start clipboard monitoring when page is focused
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (response.settings && response.settings.clipboardWatcher) {
      if (!clipboardCheckInterval) {
        clipboardCheckInterval = setInterval(checkClipboard, 2000);
      }
    }
  } else {
    if (clipboardCheckInterval) {
      clearInterval(clipboardCheckInterval);
      clipboardCheckInterval = null;
    }
  }
});

console.log('Download Manager Extension content script loaded');
