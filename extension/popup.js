// NovaGet Extension Popup Script

const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('status-text');
const enabledToggle = document.getElementById('enabled-toggle');
const autoInterceptToggle = document.getElementById('auto-intercept-toggle');
const testConnectionBtn = document.getElementById('test-connection');
const openOptionsBtn = document.getElementById('open-options');

// Load current settings
async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'getSettings' });
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
    const response = await chrome.runtime.sendMessage({ type: 'ping' });
    
    if (response.success) {
      updateStatus(true, 'Connected to NovaGet');
    } else {
      updateStatus(false, response.error || 'Connection failed');
    }
  } catch (error) {
    updateStatus(false, 'Connection failed');
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

  await chrome.runtime.sendMessage({
    type: 'updateSettings',
    settings
  });
}

// Event listeners
enabledToggle.addEventListener('change', saveSettings);
autoInterceptToggle.addEventListener('change', saveSettings);
testConnectionBtn.addEventListener('click', testConnection);
openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize
loadSettings();
testConnection();
