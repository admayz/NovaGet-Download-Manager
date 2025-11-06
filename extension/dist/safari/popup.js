// NovaGet Extension Popup Script

// Use browser API if available (Firefox), otherwise chrome API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('status-text');
const enabledToggle = document.getElementById('enabled-toggle');
const autoInterceptToggle = document.getElementById('auto-intercept-toggle');
const testConnectionBtn = document.getElementById('test-connection');
const openOptionsBtn = document.getElementById('open-options');

// Load current settings
async function loadSettings() {
  const response = await browserAPI.runtime.sendMessage({ type: 'getSettings' });
  const settings = response.settings;

  enabledToggle.checked = settings.enabled;
  autoInterceptToggle.checked = settings.autoIntercept;
}

// Update status display
function updateStatus(connected, message) {
  if (connected) {
    statusEl.className = 'status connected';
    statusTextEl.textContent = message || 'Connected to NovaGet';
  } else {
    statusEl.className = 'status disconnected';
    statusTextEl.textContent = message || 'Not connected to NovaGet';
  }
}

// Test connection to native host
async function testConnection() {
  statusTextEl.textContent = 'Testing connection...';
  testConnectionBtn.disabled = true;

  try {
    // Try native messaging first
    const response = await browserAPI.runtime.sendMessage({ type: 'ping' });
    
    if (response.success) {
      updateStatus(true, 'Connected to NovaGet');
    } else {
      updateStatus(false, response.error || 'Connection failed');
    }
  } catch (error) {
    console.error('Native messaging failed, trying HTTP fallback:', error);
    
    // Fallback to HTTP
    try {
      const httpResponse = await fetch('http://localhost:42069/api/health');
      const data = await httpResponse.json();
      
      if (data.status === 'ok') {
        updateStatus(true, 'Connected to NovaGet (HTTP)');
      } else {
        updateStatus(false, 'Connection failed');
      }
    } catch (httpError) {
      console.error('HTTP fallback also failed:', httpError);
      updateStatus(false, 'Connection failed: ' + error.message);
    }
  } finally {
    testConnectionBtn.disabled = false;
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    enabled: enabledToggle.checked,
    autoIntercept: autoInterceptToggle.checked
  };

  await browserAPI.runtime.sendMessage({
    type: 'updateSettings',
    settings
  });
}

// Event listeners
enabledToggle.addEventListener('change', saveSettings);
autoInterceptToggle.addEventListener('change', saveSettings);
testConnectionBtn.addEventListener('click', testConnection);
openOptionsBtn.addEventListener('click', () => {
  browserAPI.runtime.openOptionsPage();
});

// Register extension ID with desktop app
async function registerExtensionId() {
  try {
    // Use browser API if available (Firefox), otherwise chrome API
    const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
    const extensionId = runtime.id;
    
    // Only register for Chrome (Firefox uses fixed ID)
    const isChrome = typeof browser === 'undefined';
    if (isChrome && extensionId) {
      await fetch('http://localhost:42069/api/register-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId, browser: 'chrome' })
      });
      console.log('Extension ID registered:', extensionId);
    }
  } catch (error) {
    console.log('Could not register extension ID:', error.message);
  }
}

// Initialize
loadSettings();
registerExtensionId();
testConnection();
