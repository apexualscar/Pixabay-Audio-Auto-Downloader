// Popup script for the Chrome extension
document.addEventListener('DOMContentLoaded', async function() {
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const extensionStatus = document.getElementById('extensionStatus');
    
    // Load existing API key
    await loadApiKey();
    
    // Check current tab status
    await checkCurrentTab();
    
    // Save API key
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // Save on Enter key
    apiKeyInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });
    
    async function loadApiKey() {
        try {
            const result = await chrome.storage.local.get(['pixabayApiKey']);
            if (result.pixabayApiKey) {
                apiKeyInput.value = '••••••••••••••••'; // Show masked key
                showStatus(apiKeyStatus, 'API key is saved', 'success');
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    }
    
    async function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey || apiKey === '••••••••••••••••') {
            showStatus(apiKeyStatus, 'Please enter a valid API key', 'error');
            return;
        }
        
        // Basic API key validation (Pixabay keys are typically 32 characters)
        if (apiKey.length < 10) {
            showStatus(apiKeyStatus, 'API key seems too short. Please check your key.', 'error');
            return;
        }
        
        try {
            // Test the API key by making a simple request
            const testUrl = `https://pixabay.com/api/?key=${apiKey}&per_page=3`;
            const response = await fetch(testUrl);
            
            if (response.ok) {
                // Save the API key
                await chrome.storage.local.set({ pixabayApiKey: apiKey });
                showStatus(apiKeyStatus, 'API key saved successfully!', 'success');
                apiKeyInput.value = '••••••••••••••••';
            } else {
                const errorData = await response.json();
                showStatus(apiKeyStatus, `Invalid API key: ${errorData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error testing API key:', error);
            showStatus(apiKeyStatus, 'Error validating API key. Please check your connection.', 'error');
        }
    }
    
    async function checkCurrentTab() {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (activeTab.url.includes('pixabay.com/users/')) {
                const username = extractUsernameFromUrl(activeTab.url);
                extensionStatus.innerHTML = `
                    <p style="color: #28a745;">? Ready to download from user: <strong>${username}</strong></p>
                    <p style="font-size: 12px; opacity: 0.8;">Download buttons should appear on the user's profile page.</p>
                `;
            } else if (activeTab.url.includes('pixabay.com')) {
                extensionStatus.innerHTML = `
                    <p style="color: #ffc107;">?? You're on Pixabay but not on a user profile page.</p>
                    <p style="font-size: 12px; opacity: 0.8;">Navigate to a user's profile to use the mass downloader.</p>
                `;
            } else {
                extensionStatus.innerHTML = `
                    <p style="color: #6c757d;">?? Navigate to a Pixabay user profile to use the downloader.</p>
                    <p style="font-size: 12px; opacity: 0.8;">Example: pixabay.com/users/username/</p>
                `;
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
            extensionStatus.innerHTML = `
                <p style="color: #dc3545;">? Unable to check current tab status.</p>
            `;
        }
    }
    
    function extractUsernameFromUrl(url) {
        const match = url.match(/\/users\/([^\/\?]+)/);
        return match ? match[1] : 'Unknown';
    }
    
    function showStatus(element, message, type) {
        element.innerHTML = `<div class="status ${type}">${message}</div>`;
        
        // Clear status after 5 seconds for non-success messages
        if (type !== 'success') {
            setTimeout(() => {
                element.innerHTML = '';
            }, 5000);
        }
    }
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const extensionStatus = document.getElementById('extensionStatus');
    
    if (message.action === 'DOWNLOAD_STARTED') {
        extensionStatus.innerHTML = `
            <p style="color: #007bff;">?? Download started for ${message.username}</p>
            <p style="font-size: 12px; opacity: 0.8;">Check the user profile page for progress updates.</p>
        `;
    } else if (message.action === 'DOWNLOAD_COMPLETE') {
        extensionStatus.innerHTML = `
            <p style="color: #28a745;">? Download completed!</p>
            <p style="font-size: 12px; opacity: 0.8;">${message.count} files downloaded successfully.</p>
        `;
    }
});