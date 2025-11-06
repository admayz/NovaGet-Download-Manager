// NovaGet Extension Options Script

const enabledToggle = document.getElementById('enabled');
const autoInterceptToggle = document.getElementById('autoIntercept');
const minFileSizeInput = document.getElementById('minFileSize');
const saveButton = document.getElementById('save');
const successMessage = document.getElementById('success');

// File type checkboxes
const typeCheckboxes = {
  application: document.getElementById('type-application'),
  video: document.getElementById('type-video'),
  audio: document.getElementById('type-audio'),
  image: document.getElementById('type-image'),
  text: document.getElementById('type-text')
};

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get(['settings']);
  const settings = result.settings || {
    enabled: true,
    autoIntercept: true,
    minFileSize: 1024 * 1024,
    interceptTypes: ['application', 'video', 'audio']
  };

  enabledToggle.checked = settings.enabled;
  autoInterceptToggle.checked = settings.autoIntercept;
  minFileSizeInput.value = settings.minFileSize / (1024 * 1024); // Convert to MB

  // Set checkboxes
  Object.keys(typeCheckboxes).forEach(type => {
    typeCheckboxes[type].checked = settings.interceptTypes.includes(type);
  });
}

// Save settings to storage
async function saveSettings() {
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  // Get selected file types
  const interceptTypes = Object.keys(typeCheckboxes)
    .filter(type => typeCheckboxes[type].checked);

  const settings = {
    enabled: enabledToggle.checked,
    autoIntercept: autoInterceptToggle.checked,
    minFileSize: parseFloat(minFileSizeInput.value) * 1024 * 1024, // Convert to bytes
    interceptTypes
  };

  await chrome.storage.sync.set({ settings });

  // Notify background script
  await chrome.runtime.sendMessage({
    type: 'updateSettings',
    settings
  });

  // Show success message
  successMessage.classList.add('show');
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);

  saveButton.disabled = false;
  saveButton.textContent = 'Save Settings';
}

// Event listeners
saveButton.addEventListener('click', saveSettings);

// Initialize
loadSettings();
