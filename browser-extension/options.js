// Options page script for Download Manager Extension

const interceptToggle = document.getElementById('interceptToggle');
const clipboardToggle = document.getElementById('clipboardToggle');
const autoStartToggle = document.getElementById('autoStartToggle');
const minFileSize = document.getElementById('minFileSize');
const saveBtn = document.getElementById('saveBtn');
const messageDiv = document.getElementById('message');

// Load settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    
    if (response.settings) {
      interceptToggle.checked = response.settings.interceptDownloads;
      clipboardToggle.checked = response.settings.clipboardWatcher;
      autoStartToggle.checked = response.settings.autoStart;
      minFileSize.value = response.settings.minFileSize / 1024; // Convert to KB
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

// Save settings
saveBtn.addEventListener('click', async () => {
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const settings = {
      interceptDownloads: interceptToggle.checked,
      clipboardWatcher: clipboardToggle.checked,
      autoStart: autoStartToggle.checked,
      minFileSize: parseInt(minFileSize.value) * 1024 // Convert to bytes
    };
    
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: settings
    });
    
    showMessage('Settings saved successfully!', 'success');
  } catch (error) {
    showMessage('Failed to save settings: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
});

// Initialize
loadSettings();
