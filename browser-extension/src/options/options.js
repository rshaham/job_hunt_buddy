const PRODUCTION_URL = 'https://www.jobhuntbuddy.ai';
const LOCALHOST_URL = 'http://localhost:5173';
const DEFAULT_URL = PRODUCTION_URL;

document.addEventListener('DOMContentLoaded', async () => {
  const appUrlInput = document.getElementById('appUrl');
  const saveBtn = document.getElementById('save');
  const statusEl = document.getElementById('status');

  // Load current settings
  try {
    const settings = await chrome.storage.sync.get('appUrl');
    appUrlInput.value = settings.appUrl || DEFAULT_URL;
  } catch {
    appUrlInput.value = DEFAULT_URL;
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const url = appUrlInput.value.trim() || DEFAULT_URL;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    await chrome.storage.sync.set({ appUrl: url });

    // Show saved feedback
    statusEl.classList.add('show');
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 2000);
  });

  // Also save on Enter key
  appUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });

  // Quick-select buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appUrlInput.value = btn.dataset.url;
      saveBtn.click();
    });
  });
});
