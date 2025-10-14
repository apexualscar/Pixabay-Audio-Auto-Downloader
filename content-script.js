// Content script that runs on Pixabay user pages
console.log('Pixabay Mass Downloader content script loaded');

// Wait for the page to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

function initializeExtension() {
    // Check if we're on a user profile page
    const userPagePattern = /\/users\/([^\/]+)/;
    const match = window.location.pathname.match(userPagePattern);
    
    if (match) {
        const username = match[1];
        console.log(`Found user profile: ${username}`);
        
        // Add the download button to the page
        addDownloadButton(username);
    }
}

function addDownloadButton(username) {
    // Find a suitable location to add the button (user stats area)
    const userStatsContainer = document.querySelector('.user_stats') || 
                              document.querySelector('.profile-stats') ||
                              document.querySelector('[data-testid="user-stats"]');
    
    if (userStatsContainer) {
        // Create the download button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'pixabay-mass-downloader-container';
        buttonContainer.innerHTML = `
            <div class="mass-download-section">
                <h3>Mass Download</h3>
                <div class="download-options">
                    <button id="download-images" class="mass-download-btn" data-type="photo">
                        ?? Download All Images
                    </button>
                    <button id="download-sounds" class="mass-download-btn" data-type="music">
                        ?? Download All Sounds
                    </button>
                    <button id="download-videos" class="mass-download-btn" data-type="video">
                        ?? Download All Videos
                    </button>
                </div>
                <div class="api-key-section" style="display: none;">
                    <input type="password" id="pixabay-api-key" placeholder="Enter your Pixabay API key">
                    <button id="save-api-key">Save API Key</button>
                </div>
                <div class="progress-section" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0 / 0 downloaded</div>
                </div>
            </div>
        `;
        
        // Insert the button container
        userStatsContainer.appendChild(buttonContainer);
        
        // Add event listeners
        setupEventListeners(username);
    }
}

function setupEventListeners(username) {
    const downloadButtons = document.querySelectorAll('.mass-download-btn');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const contentType = e.target.dataset.type;
            await initiateDownload(username, contentType);
        });
    });
    
    // API key save button
    const saveApiKeyBtn = document.getElementById('save-api-key');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
    }
}

async function initiateDownload(username, contentType) {
    // Check if API key exists
    const apiKey = await getStoredApiKey();
    
    if (!apiKey) {
        showApiKeyInput();
        return;
    }
    
    // Send message to background script to start download
    chrome.runtime.sendMessage({
        action: 'START_DOWNLOAD',
        username: username,
        contentType: contentType,
        apiKey: apiKey
    });
    
    showProgressSection();
}

async function getStoredApiKey() {
    return new Promise((resolve) => {
        chrome.storage.secure ? 
            chrome.storage.secure.get(['pixabayApiKey'], (result) => {
                resolve(result.pixabayApiKey);
            }) :
            chrome.storage.local.get(['pixabayApiKey'], (result) => {
                resolve(result.pixabayApiKey);
            });
    });
}

function saveApiKey() {
    const apiKeyInput = document.getElementById('pixabay-api-key');
    const apiKey = apiKeyInput.value.trim();
    
    if (apiKey) {
        // Store API key securely
        chrome.storage.secure ? 
            chrome.storage.secure.set({ pixabayApiKey: apiKey }) :
            chrome.storage.local.set({ pixabayApiKey: apiKey });
        
        document.querySelector('.api-key-section').style.display = 'none';
        alert('API key saved successfully!');
    }
}

function showApiKeyInput() {
    document.querySelector('.api-key-section').style.display = 'block';
}

function showProgressSection() {
    document.querySelector('.progress-section').style.display = 'block';
}

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'UPDATE_PROGRESS') {
        updateProgress(message.current, message.total);
    } else if (message.action === 'DOWNLOAD_COMPLETE') {
        downloadComplete(message.count);
    } else if (message.action === 'DOWNLOAD_ERROR') {
        downloadError(message.error);
    }
});

function updateProgress(current, total) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill && progressText) {
        const percentage = (current / total) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${current} / ${total} downloaded`;
    }
}

function downloadComplete(count) {
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
        progressText.textContent = `Download complete! ${count} files downloaded.`;
    }
    
    // Hide progress section after 3 seconds
    setTimeout(() => {
        const progressSection = document.querySelector('.progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }, 3000);
}

function downloadError(error) {
    alert(`Download error: ${error}`);
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.style.display = 'none';
    }
}