// Popup script for Download Manager Extension

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const interceptToggle = document.getElementById('interceptToggle');
const clipboardToggle = document.getElementById('clipboardToggle');
const messageDiv = document.getElementById('message');

// Check native app connection
async function checkConnection() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_NATIVE_CONNECTION' });
    
    if (response.connected) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected to Desktop App';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Desktop App Not Running';
    }
  } catch (error) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Connection Error';
  }
}

// Load settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (response.settings) {
      interceptToggle.checked = response.settings.interceptDownloads;
      clipboardToggle.checked = response.settings.clipboardWatcher;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Show message
function showMessage(text, type = 'success') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// Add download
addBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showMessage('Please enter a URL', 'error');
    return;
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showMessage('URL must start with http:// or https://', 'error');
    return;
  }
  
  try {
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
    
    const response = await chrome.runtime.sendMessage({
      type: 'ADD_DOWNLOAD',
      url: url
    });
    
    if (response.success) {
      showMessage('Download added successfully!', 'success');
      urlInput.value = '';
    } else {
      showMessage('Failed to add download', 'error');
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add Download';
  }
});

// Handle Enter key in URL input
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

// Update settings
interceptToggle.addEventListener('change', async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: {
        interceptDownloads: interceptToggle.checked
      }
    });
    
    showMessage('Settings updated', 'success');
  } catch (error) {
    showMessage('Failed to update settings', 'error');
  }
});

clipboardToggle.addEventListener('change', async () => {
  try {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: {
        clipboardWatcher: clipboardToggle.checked
      }
    });
    
    showMessage('Settings updated', 'success');
  } catch (error) {
    showMessage('Failed to update settings', 'error');
  }
});

// Initialize
checkConnection();
loadSettings();

// Check connection periodically
setInterval(checkConnection, 5000);
