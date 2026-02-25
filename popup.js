// Popup script for Pixabay Sound Effects Downloader - Focused Audio Extraction
let currentUsername = null;
let currentUserInfo = null;
let isScanning = false;
let isDownloading = false;
let isPaused = false;
let scannedItems = [];
let downloadConfig = {}; // Store configuration

// Initialize immediately when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
    try {
        // Load configuration first
        await loadConfiguration();
        
        // Get persisted state first
        await restoreExtensionState();
        
        // Quick status check
        await updateStatus();
        
        // Check current page - no API key needed for scraping
        await checkCurrentPage();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load auto-like setting
        await loadAutoLikeSetting();
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        updateStatusMessage('X', 'Error loading extension', 'error');
    }
}

// Configuration Management
async function loadConfiguration() {
    try {
        const result = await chrome.storage.local.get([
            'downloadLocation',
            'customLocationPath',
            'mainFolderName',
            'sortIntoUserFolders',
            'fileNamingPattern',
            'audioQuality',
            'downloadDelay'
        ]);
        
        // Set default configuration
        downloadConfig = {
            downloadLocation: result.downloadLocation || 'downloads',
            customLocationPath: result.customLocationPath || '',
            mainFolderName: result.mainFolderName || 'PixabayAudio',
            sortIntoUserFolders: result.sortIntoUserFolders !== undefined ? result.sortIntoUserFolders : true,
            fileNamingPattern: result.fileNamingPattern || 'title_id',
            audioQuality: result.audioQuality || 'highest',
            downloadDelay: result.downloadDelay || 2
        };
        
        // Update UI with loaded configuration
        updateConfigurationUI();
        
        console.log('Configuration loaded:', downloadConfig);
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Use default configuration
        downloadConfig = {
            downloadLocation: 'downloads',
            customLocationPath: '',
            mainFolderName: 'PixabayAudio',
            sortIntoUserFolders: true,
            fileNamingPattern: 'title_id',
            audioQuality: 'highest',
            downloadDelay: 2
        };
    }
}

function updateConfigurationUI() {
    // Update form fields with loaded configuration
    document.getElementById('downloadLocation').value = downloadConfig.downloadLocation;
    document.getElementById('customLocationPath').value = downloadConfig.customLocationPath;
    document.getElementById('mainFolderName').value = downloadConfig.mainFolderName;
    document.getElementById('sortIntoUserFolders').checked = downloadConfig.sortIntoUserFolders;
    document.getElementById('fileNamingPattern').value = downloadConfig.fileNamingPattern;
    document.getElementById('audioQuality').value = downloadConfig.audioQuality;
    document.getElementById('downloadDelay').value = downloadConfig.downloadDelay;
    
    // Show/hide custom location group based on selection
    const customLocationGroup = document.getElementById('customLocationGroup');
    if (downloadConfig.downloadLocation === 'custom') {
        customLocationGroup.classList.remove('hidden');
    } else {
        customLocationGroup.classList.add('hidden');
    }
    
    console.log('Configuration UI updated with loaded settings');
}

async function saveConfiguration() {
    try {
        // Get values from form
        downloadConfig = {
            downloadLocation: document.getElementById('downloadLocation').value,
            customLocationPath: document.getElementById('customLocationPath').value,
            mainFolderName: document.getElementById('mainFolderName').value.trim() || 'PixabayAudio',
            sortIntoUserFolders: document.getElementById('sortIntoUserFolders').checked,
            fileNamingPattern: document.getElementById('fileNamingPattern').value,
            audioQuality: document.getElementById('audioQuality').value,
            downloadDelay: parseInt(document.getElementById('downloadDelay').value)
        };
        
        // Save to storage
        await chrome.storage.local.set(downloadConfig);
        
        // Send configuration to background script
        await chrome.runtime.sendMessage({
            action: 'UPDATE_CONFIG',
            config: downloadConfig
        });
        
        // Show success message
        updateStatusMessage('Check', 'Configuration saved successfully', 'success');
        
        console.log('Configuration saved:', downloadConfig);
    } catch (error) {
        console.error('Error saving configuration:', error);
        updateStatusMessage('X', 'Error saving configuration', 'error');
    }
}

function resetConfiguration() {
    // Reset to default values
    downloadConfig = {
        downloadLocation: 'downloads',
        customLocationPath: '',
        mainFolderName: 'PixabayAudio',
        sortIntoUserFolders: true,
        fileNamingPattern: 'title_id',
        audioQuality: 'highest',
        downloadDelay: 2
    };
    
    // Update UI
    updateConfigurationUI();
    
    // Save the reset configuration
    saveConfiguration();
}

function toggleConfigSection() {
    const configSection = document.getElementById('configSection');
    const settingsCog = document.getElementById('settingsCog');
    
    if (configSection.classList.contains('visible')) {
        // Hide configuration
        configSection.classList.remove('visible');
        settingsCog.classList.remove('active');
        console.log('Configuration panel hidden');
    } else {
        // Show configuration
        configSection.classList.add('visible');
        settingsCog.classList.add('active');
        console.log('Configuration panel shown');
    }
}

async function restoreExtensionState() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_EXTENSION_STATE' });
        if (response && response.state) {
            const state = response.state;
            console.log('Restoring extension state:', state);
            
            // Restore variables
            isScanning = state.isScanning || false;
            isDownloading = state.isDownloading || false;
            isPaused = state.isPaused || false;
            scannedItems = state.scannedItems || [];
            
            // Restore UI state
            if (state.lastStatus) {
                updateStatusMessage(state.lastStatus.icon, state.lastStatus.message, state.lastStatus.type);
            }
            
            // Restore scan button state
            if (isScanning) {
                const scanBtn = document.getElementById('scanBtn');
                scanBtn.innerHTML = '<div class="spinner"></div> Scanning for sound effects...';
                scanBtn.disabled = true;
            }
            
            // Restore scanned items if any
            if (scannedItems.length > 0) {
                showItemsList(scannedItems);
                showDownloadSection();
                document.getElementById('soundEffectsCount').textContent = scannedItems.length;
            }
            
            // Restore download state
            if (isDownloading) {
                showDownloadSection();
                showProgress();
                showDownloadControls();
                
                const downloadBtn = document.getElementById('downloadBtn');
                downloadBtn.innerHTML = '<div class="spinner"></div> Downloading...';
                downloadBtn.disabled = true;
                
                // Restore progress if available
                if (state.currentProgress) {
                    updateProgress(state.currentProgress.current, state.currentProgress.total);
                }
                
                // Restore pause/resume button states
                if (isPaused) {
                    document.getElementById('pauseBtn').disabled = true;
                    document.getElementById('resumeBtn').disabled = false;
                } else {
                    document.getElementById('pauseBtn').disabled = false;
                    document.getElementById('resumeBtn').disabled = true;
                }
            }
            
            console.log('Extension state restored successfully');
        }
    } catch (error) {
        console.error('Error restoring extension state:', error);
    }
}

function setupEventListeners() {
    // Configuration event listeners - Updated for new cog button
    document.getElementById('settingsCog').addEventListener('click', toggleConfigSection);
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfiguration);
    document.getElementById('resetConfigBtn').addEventListener('click', resetConfiguration);
    
    // Handle download location change
    document.getElementById('downloadLocation').addEventListener('change', (e) => {
        const customLocationGroup = document.getElementById('customLocationGroup');
        if (e.target.value === 'custom') {
            customLocationGroup.classList.remove('hidden');
        } else {
            customLocationGroup.classList.add('hidden');
        }
    });
    
    // Separate scan and download buttons
    document.getElementById('scanBtn').addEventListener('click', () => startSoundEffectsScan());
    document.getElementById('downloadBtn').addEventListener('click', () => startSoundEffectsDownload());
    
    // Download control buttons
    document.getElementById('pauseBtn').addEventListener('click', pauseDownload);
    document.getElementById('resumeBtn').addEventListener('click', resumeDownload);
    document.getElementById('cancelBtn').addEventListener('click', cancelDownload);
    
    // User profile interactions
    document.getElementById('followBtn').addEventListener('click', followUser);
    
    // Auto-like toggle
    document.getElementById('autoLikeToggle').addEventListener('change', handleAutoLikeToggle);
    
    // Footer buttons
    document.getElementById('refreshBtn').addEventListener('click', (e) => {
        e.preventDefault();
        refreshData();
    });
    
    document.getElementById('clearListBtn').addEventListener('click', (e) => {
        e.preventDefault();
        clearScannedItems();
    });
}

async function updateStatus() {
    // Only update if not already set from restored state
    const currentMessage = document.getElementById('statusMessage').textContent;
    if (!currentMessage || currentMessage === 'Checking current page...') {
        updateStatusMessage('...', 'Checking status...', '');
    }
}

async function checkCurrentPage() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.url) {
            updateStatusMessage('i', 'No active tab detected', 'warning');
            return;
        }
        
        console.log('Current tab URL:', activeTab.url);
        
        if (activeTab.url.includes('pixabay.com')) {
            // Check if we're on a user profile page
            if (activeTab.url.includes('/users/')) {
                currentUsername = extractUsernameFromUrl(activeTab.url);
                if (currentUsername) {
                    // Get user info from the page itself
                    chrome.runtime.sendMessage({
                        action: 'GET_USER_INFO',
                        tabId: activeTab.id
                    });
                }
            }
            
            // Always show scan section on Pixabay pages (unless already in a process)
            if (!isScanning && !isDownloading) {
                showScanSection();
                updateStatusMessage('Check', 'Ready to scan sound effects from current page', 'success');
            }
        } else {
            if (!isScanning && !isDownloading) {
                updateStatusMessage('!', 'Visit a Pixabay page to scan for sound effects', 'warning');
            }
        }
        
    } catch (error) {
        console.error('Error checking current page:', error);
        updateStatusMessage('X', 'Error checking page', 'error');
    }
}

function extractUsernameFromUrl(url) {
    try {
        const match = url.match(/\/users\/([^\/\?]+)/);
        const username = match ? decodeURIComponent(match[1]) : null;
        console.log('Extracted username:', username);
        return username;
    } catch (error) {
        console.error('Error extracting username:', error);
        return null;
    }
}

function updateStatusMessage(icon, message, type = '') {
    // Larger, centered circle for status
    let color = '#495057'; // default gray
    if (icon === 'Check') {
        color = '#4bc24b'; // green
    } else if (icon === '!') {
        color = '#ffc107'; // yellow
    } else if (icon === 'X') {
        color = '#dc3545'; // red
    }
    const statusIconEl = document.getElementById('statusIcon');
    statusIconEl.innerHTML = `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;background:${color};vertical-align:middle;margin-left:6px;margin-right:6px;margin-bottom:2px;"></span>`;
    const statusMessageEl = document.getElementById('statusMessage');
    statusMessageEl.textContent = message;
    const statusSection = document.querySelector('.status-section');
    statusSection.className = `status-section ${type}`;
}

function showScanSection() {
    document.getElementById('scanSection').classList.remove('hidden');
}

function showDownloadSection() {
    document.getElementById('downloadSection').classList.remove('hidden');
}

function hideDownloadSection() {
    document.getElementById('downloadSection').classList.add('hidden');
}

function showTargetInfo(userInfo) {
    currentUserInfo = userInfo;
    document.getElementById('targetInfoSection').classList.remove('hidden');
    
    // Update user avatar
    const avatarEl = document.getElementById('userAvatar');
    if (userInfo.userImageURL) {
        avatarEl.innerHTML = `<img src="${userInfo.userImageURL}" alt="${userInfo.username}">`;
    } else {
        avatarEl.innerHTML = 'User';
    }
    
    // Update user name and profile link
    const displayName = userInfo.displayName || userInfo.username;
    document.getElementById('userName').textContent = displayName;
    
    // Add user ID footer under the name
    const userDetailsEl = document.querySelector('.user-details');
    
    // Remove existing user ID if present
    const existingUserId = userDetailsEl.querySelector('.user-id');
    if (existingUserId) {
        existingUserId.remove();
    }
    
    // Add user ID footer
    if (userInfo.userId) {
        const userIdEl = document.createElement('div');
        userIdEl.className = 'user-id';
        userIdEl.textContent = `ID: ${userInfo.userId}`;
        userDetailsEl.appendChild(userIdEl);
    }
    
    // Show login status - but don't disable toggle anymore
    const loginStatusEl = document.getElementById('loginStatus');
    if (userInfo.isLoggedIn) {
        loginStatusEl.classList.remove('hidden');
        loginStatusEl.textContent = 'Logged in to Pixabay';
    } else {
        loginStatusEl.classList.add('hidden');
    }
    
    // Note: Auto-like toggle is always enabled now, login check happens at download time
    
    const profileLink = document.getElementById('userProfileLink');
    profileLink.href = userInfo.profileUrl;
    profileLink.textContent = 'View Profile';
    
    console.log('Target info displayed:', userInfo);
}

async function loadAutoLikeSetting() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'GET_AUTO_LIKE' });
        const autoLikeToggle = document.getElementById('autoLikeToggle');
        autoLikeToggle.checked = response.enabled || false;
        
        // Update toggle description to indicate it checks login at download time
        const autoLikeDescription = document.querySelector('.auto-like-description');
        autoLikeDescription.textContent = 'Automatically like each sound effect during download (requires login)';
        
        console.log('Auto-like setting loaded:', response.enabled);
    } catch (error) {
        console.error('Error loading auto-like setting:', error);
    }
}

async function handleAutoLikeToggle(event) {
    const enabled = event.target.checked;
    try {
        await chrome.runtime.sendMessage({
            action: 'SET_AUTO_LIKE',
            enabled: enabled
        });
        console.log('Auto-like setting updated:', enabled);
        
        // Show helpful message about login requirement
        if (enabled) {
            updateStatusMessage('i', 'Auto-like enabled. Login will be checked when download starts.', 'success');
        } else {
            updateStatusMessage('i', 'Auto-like disabled.', '');
        }
    } catch (error) {
        console.error('Error updating auto-like setting:', error);
        // Revert toggle on error
        event.target.checked = !enabled;
    }
}

// Separate scan function
async function startSoundEffectsScan() {
    if (isScanning) {
        console.log('Scan already in progress');
        return;
    }
    
    isScanning = true;
    
    const scanBtn = document.getElementById('scanBtn');
    const originalText = scanBtn.innerHTML;
    
    try {
        console.log('Starting sound effects scan');
        
        // Clear previous results
        clearScannedItems();
        hideDownloadSection();
        
        scanBtn.innerHTML = '<div class="spinner"></div> Scanning for sound effects...';
        scanBtn.disabled = true;
        
        // Get current tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        console.log('Sending sound effects scan request to background script...');
        
        // Send message to background script to start scanning
        const response = await chrome.runtime.sendMessage({
            action: 'START_SOUND_EFFECTS_SCAN',
            tabId: activeTab.id,
            config: downloadConfig // Include configuration
        });
        
        console.log('Background script response:', response);
        updateStatusMessage('Search', 'Scanning current page for sound effects...', 'success');
        
    } catch (error) {
        console.error('Scan error:', error);
        updateStatusMessage('X', `Scan failed: ${error.message}`, 'error');
        
        // Reset button
        scanBtn.innerHTML = originalText;
        scanBtn.disabled = false;
        isScanning = false;
    }
}

// Separate download function
async function startSoundEffectsDownload() {
    if (isDownloading || scannedItems.length === 0) {
        console.log('Download not possible - either already downloading or no items found');
        return;
    }
    
    isDownloading = true;
    isPaused = false;
    
    const downloadBtn = document.getElementById('downloadBtn');
    const originalText = downloadBtn.innerHTML;
    
    try {
        console.log('Starting sound effects download');
        
        // Show progress and controls
        showProgress();
        showDownloadControls();
        downloadBtn.innerHTML = '<div class="spinner"></div> Starting download...';
        downloadBtn.disabled = true;
        
        // Get current tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if auto-like is enabled and inform user
        const autoLikeToggle = document.getElementById('autoLikeToggle');
        if (autoLikeToggle.checked) {
            updateStatusMessage('i', 'Checking login status for auto-like...', 'success');
        }
        
        // Send message to background script to start download
        const response = await chrome.runtime.sendMessage({
            action: 'START_DOWNLOAD',
            tabId: activeTab.id,
            config: downloadConfig // Include configuration
        });
        
        console.log('Download start response:', response);
        updateStatusMessage('Arrow', 'Starting download process...', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        updateStatusMessage('X', `Download failed: ${error.message}`, 'error');
        hideProgress();
        hideDownloadControls();
        
        // Reset button
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        isDownloading = false;
    }
}

async function pauseDownload() {
    try {
        isPaused = true;
        await chrome.runtime.sendMessage({ action: 'PAUSE_DOWNLOAD' });
        
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('resumeBtn').disabled = false;
        
        updateStatusMessage('Pause', 'Download paused', 'warning');
    } catch (error) {
        console.error('Error pausing download:', error);
    }
}

async function resumeDownload() {
    try {
        isPaused = false;
        await chrome.runtime.sendMessage({ action: 'RESUME_DOWNLOAD' });
        
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('resumeBtn').disabled = true;
        
        updateStatusMessage('Play', 'Download resumed', 'success');
    } catch (error) {
        console.error('Error resuming download:', error);
    }
}

async function cancelDownload() {
    try {
        await chrome.runtime.sendMessage({ action: 'CANCEL_DOWNLOAD' });
        
        updateStatusMessage('X', 'Download canceled', 'error');
        hideProgress();
        hideDownloadControls();
        resetDownloadButton();
        isDownloading = false;
        isPaused = false;
    } catch (error) {
        console.error('Error canceling download:', error);
    }
}

function followUser() {
    if (currentUserInfo && currentUserInfo.profileUrl) {
        chrome.tabs.create({ url: currentUserInfo.profileUrl });
    }
}

async function refreshData() {
    // Reset all states
    isScanning = false;
    isDownloading = false;
    isPaused = false;
    
    clearScannedItems();
    hideDownloadSection();
    resetScanButton();
    hideProgress();
    hideDownloadControls();
    
    await checkCurrentPage();
}

function clearScannedItems() {
    scannedItems = [];
    updateItemsList();
    document.getElementById('itemsList').classList.add('hidden');
    hideDownloadSection();
}

function showItemsList(items) {
    scannedItems = items;
    updateItemsList();
    document.getElementById('itemsList').classList.remove('hidden');
    
    // Update count on download button and show download section
    document.getElementById('soundEffectsCount').textContent = items.length;
    
    if (items.length > 0) {
        showDownloadSection();
        resetScanButton();
    }
}

function updateItemsList() {
    const container = document.getElementById('itemsContainer');
    const countEl = document.getElementById('itemsCount');
    
    countEl.textContent = `${scannedItems.length} items`;
    
    if (scannedItems.length === 0) {
        container.innerHTML = '<div class="empty-state">No sound effects scanned yet. Click the scan button to start extracting audio from the current page.</div>';
        return;
    }
    
    container.innerHTML = scannedItems.map((item, index) => `
        <div class="item-entry">
            <div class="item-preview">Audio</div>
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                <div class="item-id">ID: ${item.id}</div>
            </div>
        </div>
    `).join('');
}

function showProgress() {
    document.getElementById('progressSection').classList.remove('hidden');
    updateProgress(0, 0);
}

function hideProgress() {
    document.getElementById('progressSection').classList.add('hidden');
}

function showDownloadControls() {
    document.getElementById('downloadControls').classList.remove('hidden');
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('resumeBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = false;
}

function hideDownloadControls() {
    document.getElementById('downloadControls').classList.add('hidden');
}

function updateProgress(current, total) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${current} / ${total} downloaded (${percentage.toFixed(1)}%)`;
    } else {
        progressFill.style.width = '0%';
        progressText.textContent = 'Preparing download...';
    }
}

function resetScanButton() {
    const scanBtn = document.getElementById('scanBtn');
    scanBtn.innerHTML = 'Scan Current Page for Sound Effects';
    scanBtn.disabled = false;
    isScanning = false;
}

function resetDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.innerHTML = `Download All Sound Effects <span class="count">${scannedItems.length}</span>`;
    downloadBtn.disabled = false;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in popup:', message);
    
    switch (message.action) {
        case 'USER_INFO_RECEIVED':
            if (message.userInfo) {
                showTargetInfo(message.userInfo);
            }
            break;
            
        case 'SOUND_EFFECTS_SCANNED':
            if (message.items && message.items.length > 0) {
                showItemsList(message.items);
                updateStatusMessage('Check', `Found ${message.items.length} sound effects`, 'success');
            } else {
                updateStatusMessage('!', 'No sound effects found on this page', 'warning');
                resetScanButton();
                isScanning = false;
            }
            break;
            
        case 'DOWNLOAD_STARTED':
            updateStatusMessage('Arrow', `Downloading ${scannedItems.length} sound effects...`, 'success');
            break;
            
        case 'UPDATE_PROGRESS':
            updateProgress(message.current, message.total);
            updateStatusMessage('Download', `Downloaded ${message.current}/${message.total} files`, 'success');
            break;
            
        case 'DOWNLOAD_COMPLETE':
            updateStatusMessage('Check', `Download complete! ${message.count} sound effects downloaded.`, 'success');
            hideProgress();
            hideDownloadControls();
            resetDownloadButton();
            isDownloading = false;
            isPaused = false;
            break;
            
        case 'DOWNLOAD_CANCELED':
            updateStatusMessage('X', `Download canceled. ${message.count || 0} files downloaded.`, 'error');
            hideProgress();
            hideDownloadControls();
            resetDownloadButton();
            isDownloading = false;
            isPaused = false;
            break;
            
        case 'DOWNLOAD_PAUSED':
            updateStatusMessage('Pause', 'Download paused', 'warning');
            break;
            
        case 'DOWNLOAD_RESUMED':
            updateStatusMessage('Play', 'Download resumed', 'success');
            break;
            
        case 'DOWNLOAD_ERROR':
            console.error('Download error from background:', message.error);
            updateStatusMessage('X', `Error: ${message.error}`, 'error');
            hideProgress();
            hideDownloadControls();
            resetDownloadButton();
            isDownloading = false;
            isPaused = false;
            break;
            
        case 'SCANNING_ERROR':
            console.error('Scanning error from background:', message.error);
            updateStatusMessage('X', `Scanning failed: ${message.error}`, 'error');
            resetScanButton();
            isScanning = false;
            break;
    }
});

// Refresh status when popup is opened
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setTimeout(checkCurrentPage, 100);
    }
});

// Add debugging
console.log('Popup script (Sound Effects Downloader) loaded successfully');