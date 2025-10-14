// Background service worker for Pixabay Sound Effects Downloader - Focused Audio Extraction
console.log('Pixabay Sound Effects Downloader background script loaded');

// Download control variables
let isDownloadPaused = false;
let isDownloadCanceled = false;
let currentDownloadSession = null;
let downloadQueue = [];

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'START_SOUND_EFFECTS_SCAN':
            handleSoundEffectsScan(message, sender.tab?.id || null);
            sendResponse({ success: true });
            break;
        case 'PAUSE_DOWNLOAD':
            pauseDownload();
            sendResponse({ success: true });
            break;
        case 'RESUME_DOWNLOAD':
            resumeDownload();
            sendResponse({ success: true });
            break;
        case 'CANCEL_DOWNLOAD':
            cancelDownload();
            sendResponse({ success: true });
            break;
        case 'GET_USER_INFO':
            getUserInfoFromPage(message.tabId);
            sendResponse({ success: true });
            break;
        case 'SOUND_EFFECTS_EXTRACTED':
            handleSoundEffectsExtracted(message, sender.tab?.id || null);
            sendResponse({ success: true });
            break;
        case 'SCANNING_ERROR':
            handleScanningError(message);
            sendResponse({ success: true });
            break;
    }
    return true;
});

async function getUserInfoFromPage(tabId) {
    try {
        // Inject script to extract user info from the current page
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: extractUserInfoFromPage
        });
        
        if (results && results[0] && results[0].result) {
            const userInfo = results[0].result;
            
            // Send user info to popup
            try {
                await chrome.runtime.sendMessage({
                    action: 'USER_INFO_RECEIVED',
                    userInfo: userInfo
                });
            } catch (error) {
                console.log('Could not send user info to popup (popup may be closed)');
            }
        }
    } catch (error) {
        console.error('Error getting user info from page:', error);
    }
}

// Function to be injected into the page to extract user info
function extractUserInfoFromPage() {
    try {
        // Extract username from URL
        const urlMatch = window.location.pathname.match(/\/users\/([^\/\?]+)/);
        const username = urlMatch ? decodeURIComponent(urlMatch[1]) : null;
        
        if (!username) return null;
        
        // Try to find user avatar and info on the page
        let userImageURL = '';
        let userId = '';
        
        // Look for user avatar in various possible locations
        const avatarSelectors = [
            '.user-avatar img',
            '.profile-avatar img',
            '.user-profile img',
            '[data-testid="user-avatar"] img',
            '.avatar img',
            'img[alt*="' + username + '"]'
        ];
        
        for (const selector of avatarSelectors) {
            const avatarEl = document.querySelector(selector);
            if (avatarEl && avatarEl.src) {
                userImageURL = avatarEl.src;
                break;
            }
        }
        
        return {
            username: username,
            userImageURL: userImageURL,
            userId: userId,
            profileUrl: window.location.href
        };
    } catch (error) {
        console.error('Error extracting user info:', error);
        return null;
    }
}

async function handleSoundEffectsScan(request, tabId) {
    const { tabId: requestTabId } = request;
    const targetTabId = requestTabId || tabId;
    
    try {
        console.log('Starting sound effects scan...');
        
        // Send message to content script to start scanning
        try {
            await chrome.tabs.sendMessage(targetTabId, {
                action: 'SCAN_SOUND_EFFECTS'
            });
        } catch (error) {
            console.error('Error communicating with content script:', error);
            sendMessageToPopup({
                action: 'SCANNING_ERROR',
                error: 'Could not communicate with page. Try refreshing and try again.'
            });
        }
        
    } catch (error) {
        console.error('Sound effects scan error:', error);
        sendMessageToPopup({
            action: 'SCANNING_ERROR',
            error: error.message
        });
    }
}

function handleSoundEffectsExtracted(message, tabId) {
    const { items } = message;
    
    console.log(`Sound effects extracted: ${items.length} items`);
    
    // Forward to popup
    sendMessageToPopup({
        action: 'SOUND_EFFECTS_SCANNED',
        items: items
    });
    
    // If items found, start download process
    if (items.length > 0) {
        startSoundEffectsDownload(items, tabId);
    } else {
        sendMessageToPopup({
            action: 'SCANNING_ERROR',
            error: 'No sound effects found on this page'
        });
    }
}

function handleScanningError(message) {
    console.error('Scanning error:', message.error);
    
    // Forward to popup
    sendMessageToPopup({
        action: 'SCANNING_ERROR',
        error: message.error
    });
}

async function startSoundEffectsDownload(soundEffects, tabId) {
    // Reset download control flags
    isDownloadPaused = false;
    isDownloadCanceled = false;
    currentDownloadSession = Date.now();
    downloadQueue = soundEffects;
    
    try {
        const totalCount = soundEffects.length;
        let downloadedCount = 0;
        
        console.log(`Starting download of ${totalCount} sound effects`);
        
        // Notify that download is starting
        sendMessageToPopup({
            action: 'DOWNLOAD_STARTED',
            count: totalCount
        });
        
        // Create folder name for sound effects
        const folderName = 'pixabay_sound_effects';
        
        for (let i = 0; i < soundEffects.length; i++) {
            // Check for cancel/pause
            if (isDownloadCanceled) {
                console.log('Download canceled by user');
                break;
            }
            
            while (isDownloadPaused) {
                await sleep(500);
                if (isDownloadCanceled) break;
            }
            
            if (isDownloadCanceled) break;
            
            const soundEffect = soundEffects[i];
            
            try {
                await downloadSoundEffect(soundEffect, folderName);
                downloadedCount++;
                
                // Update progress
                sendMessageToPopup({
                    action: 'UPDATE_PROGRESS',
                    current: downloadedCount,
                    total: totalCount
                });
                
                // Add delay between downloads
                await sleep(500);
                
            } catch (error) {
                console.error(`Failed to download ${soundEffect.id}:`, error);
                // Continue with next file
            }
        }
        
        // Notify completion or cancellation
        if (isDownloadCanceled) {
            sendMessageToPopup({
                action: 'DOWNLOAD_CANCELED',
                count: downloadedCount
            });
        } else {
            sendMessageToPopup({
                action: 'DOWNLOAD_COMPLETE',
                count: downloadedCount
            });
        }
        
    } catch (error) {
        console.error('Download error:', error);
        sendMessageToPopup({
            action: 'DOWNLOAD_ERROR',
            error: error.message
        });
    }
}

async function downloadSoundEffect(soundEffect, folderName) {
    try {
        let downloadUrl = soundEffect.downloadUrl;
        
        // If we have a Pixabay item page URL, we might need to navigate to it to get the actual download link
        if (!downloadUrl || !downloadUrl.includes('.mp3') && !downloadUrl.includes('.wav') && !downloadUrl.includes('.ogg')) {
            // If we only have the item page URL, use the preview URL or construct a direct link
            if (soundEffect.previewUrl) {
                downloadUrl = soundEffect.previewUrl;
            } else if (soundEffect.downloadUrl && soundEffect.downloadUrl.includes('pixabay.com')) {
                // Try to construct a direct download URL (this might need adjustment based on Pixabay's URL structure)
                downloadUrl = soundEffect.downloadUrl;
            } else {
                throw new Error(`No suitable download URL found for ${soundEffect.id}`);
            }
        }
        
        // Create filename
        const safeTitle = sanitizeFilename(soundEffect.title || `sound_effect_${soundEffect.id}`);
        const extension = getFileExtensionFromUrl(downloadUrl) || 'mp3';
        const filename = `${folderName}/${safeTitle}_${soundEffect.id}.${extension}`;
        
        console.log(`Downloading sound effect: ${filename} from ${downloadUrl}`);
        
        // Use Chrome's downloads API
        return new Promise((resolve, reject) => {
            chrome.downloads.download({
                url: downloadUrl,
                filename: filename,
                saveAs: false,
                conflictAction: 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error(`Download failed for ${filename}:`, chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log(`Started download: ${downloadId} - ${filename}`);
                    resolve(downloadId);
                }
            });
        });
    } catch (error) {
        console.error(`Error downloading sound effect ${soundEffect.id}:`, error);
        throw error;
    }
}

function getFileExtensionFromUrl(url) {
    if (!url) return 'mp3';
    
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const extension = pathname.split('.').pop()?.toLowerCase();
        
        if (extension && ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(extension)) {
            return extension;
        }
        
        return 'mp3'; // Default for audio files
    } catch {
        return 'mp3';
    }
}

function pauseDownload() {
    isDownloadPaused = true;
    console.log('Download paused');
    sendMessageToPopup({ action: 'DOWNLOAD_PAUSED' });
}

function resumeDownload() {
    isDownloadPaused = false;
    console.log('Download resumed');
    sendMessageToPopup({ action: 'DOWNLOAD_RESUMED' });
}

function cancelDownload() {
    isDownloadCanceled = true;
    isDownloadPaused = false;
    downloadQueue = [];
    console.log('Download canceled');
    sendMessageToPopup({ action: 'DOWNLOAD_CANCELED' });
}

function sanitizeFilename(filename) {
    if (!filename) return 'unknown';
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase()
        .substring(0, 50);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to send messages to popup safely
async function sendMessageToPopup(message) {
    try {
        await chrome.runtime.sendMessage(message);
    } catch (error) {
        // Popup might be closed, which is normal - just log it
        console.log('Could not send message to popup (popup may be closed):', message.action);
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Pixabay Sound Effects Downloader installed');
        chrome.storage.local.set({
            'firstInstall': true,
            'installDate': new Date().toISOString(),
            'scrapingMode': 'sound-effects',
            'version': '3.0'
        });
    }
});