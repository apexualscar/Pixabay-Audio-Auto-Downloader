// Background service worker for the Chrome extension
console.log('Pixabay Mass Downloader background script loaded');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_DOWNLOAD') {
        handleDownloadRequest(message, sender.tab?.id || null);
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

async function handleDownloadRequest(request, tabId) {
    const { username, contentType, apiKey } = request;
    
    try {
        console.log(`Starting download for user: ${username}, type: ${contentType}`);
        
        // Notify that download is starting
        if (tabId) {
            chrome.tabs.sendMessage(tabId, {
                action: 'DOWNLOAD_STARTED',
                username: username,
                contentType: contentType
            }).catch(() => {}); // Ignore errors if content script not present
        }
        
        // Send to popup as well
        chrome.runtime.sendMessage({
            action: 'DOWNLOAD_STARTED',
            username: username,
            contentType: contentType
        }).catch(() => {});
        
        // Get user's submissions from Pixabay API
        const submissions = await fetchUserSubmissions(username, contentType, apiKey);
        
        if (submissions.length === 0) {
            const errorMsg = 'No submissions found for this user and content type';
            notifyError(tabId, errorMsg);
            return;
        }
        
        console.log(`Found ${submissions.length} submissions to download`);
        
        // Download each submission with proper folder structure
        let downloadedCount = 0;
        const totalCount = submissions.length;
        
        // Create folder name: username_contenttype (e.g., "john_doe_images")
        const folderName = `${sanitizeFilename(username)}_${contentType}`;
        
        for (let i = 0; i < submissions.length; i++) {
            const submission = submissions[i];
            
            try {
                await downloadFileToFolder(submission, contentType, folderName, username);
                downloadedCount++;
                
                // Update progress
                notifyProgress(tabId, downloadedCount, totalCount);
                
                // Add delay to avoid overwhelming the system and respect rate limits
                await sleep(150);
                
            } catch (error) {
                console.error(`Failed to download ${submission.id}:`, error);
                // Continue with next file even if one fails
            }
        }
        
        // Notify completion
        notifyComplete(tabId, downloadedCount);
        
    } catch (error) {
        console.error('Download error:', error);
        notifyError(tabId, error.message);
    }
}

async function fetchUserSubmissions(username, contentType, apiKey) {
    const baseUrl = 'https://pixabay.com/api/';
    const submissions = [];
    let page = 1;
    const perPage = 200; // Maximum allowed by Pixabay API
    
    try {
        while (true) {
            const url = `${baseUrl}?key=${apiKey}&username=${encodeURIComponent(username)}&category=${contentType}&per_page=${perPage}&page=${page}&safesearch=true`;
            
            console.log(`Fetching page ${page} for ${username}...`);
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (!data.hits || data.hits.length === 0) {
                break; // No more results
            }
            
            submissions.push(...data.hits);
            console.log(`Page ${page}: Found ${data.hits.length} submissions`);
            
            // If we got less than perPage results, we've reached the end
            if (data.hits.length < perPage) {
                break;
            }
            
            page++;
            
            // Add delay between API calls to be respectful
            await sleep(300);
        }
        
        return submissions;
        
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
}

async function downloadFileToFolder(submission, contentType, folderName, username) {
    // Determine the best download URL and filename based on content type
    const { downloadUrl, filename, extension } = getDownloadInfo(submission, contentType);
    
    if (!downloadUrl) {
        throw new Error('No download URL available for this submission');
    }
    
    // Create full filename with proper extension
    const fullFilename = `${folderName}/${sanitizeFilename(submission.user || username)}_${submission.id}_${sanitizeFilename(submission.tags?.split(',')[0] || 'content')}.${extension}`;
    
    console.log(`Downloading: ${fullFilename}`);
    
    // Use Chrome's downloads API with folder structure
    return new Promise((resolve, reject) => {
        chrome.downloads.download({
            url: downloadUrl,
            filename: fullFilename,
            saveAs: false,
            conflictAction: 'uniquify' // Add number if file exists
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                console.log(`Started download: ${downloadId} - ${fullFilename}`);
                resolve(downloadId);
            }
        });
    });
}

function getDownloadInfo(submission, contentType) {
    switch (contentType.toLowerCase()) {
        case 'photo':
            return {
                downloadUrl: submission.largeImageURL || submission.fullHDURL || submission.webformatURL,
                filename: `image_${submission.id}`,
                extension: 'jpg'
            };
            
        case 'music':
            // Note: Pixabay API doesn't always provide direct download URLs for music
            // This would need to be handled differently, possibly through web scraping
            return {
                downloadUrl: submission.download_url || submission.webformatURL,
                filename: `audio_${submission.id}`,
                extension: 'mp3'
            };
            
        case 'video':
            const videoUrl = submission.videos?.large?.url || 
                           submission.videos?.medium?.url || 
                           submission.videos?.small?.url;
            return {
                downloadUrl: videoUrl,
                filename: `video_${submission.id}`,
                extension: 'mp4'
            };
            
        default:
            return {
                downloadUrl: submission.largeImageURL || submission.webformatURL,
                filename: `content_${submission.id}`,
                extension: getExtensionFromUrl(submission.webformatURL) || 'jpg'
            };
    }
}

function getExtensionFromUrl(url) {
    if (!url) return 'jpg';
    const pathname = new URL(url).pathname;
    const extension = pathname.split('.').pop();
    return extension || 'jpg';
}

function sanitizeFilename(filename) {
    if (!filename) return 'unknown';
    // Remove or replace characters that are not allowed in filenames
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace invalid chars with underscore
        .replace(/\s+/g, '_') // Replace spaces with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .toLowerCase()
        .substring(0, 50); // Limit length
}

function notifyProgress(tabId, current, total) {
    const message = {
        action: 'UPDATE_PROGRESS',
        current: current,
        total: total
    };
    
    // Notify tab content script
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {});
    }
    
    // Notify popup
    chrome.runtime.sendMessage(message).catch(() => {});
}

function notifyComplete(tabId, count) {
    const message = {
        action: 'DOWNLOAD_COMPLETE',
        count: count
    };
    
    // Notify tab content script
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {});
    }
    
    // Notify popup
    chrome.runtime.sendMessage(message).catch(() => {});
}

function notifyError(tabId, error) {
    const message = {
        action: 'DOWNLOAD_ERROR',
        error: error
    };
    
    // Notify tab content script
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {});
    }
    
    // Notify popup
    chrome.runtime.sendMessage(message).catch(() => {});
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Pixabay Mass Downloader installed');
        
        // Set default storage
        chrome.storage.local.set({
            'firstInstall': true,
            'installDate': new Date().toISOString()
        });
    }
});

// Clean up old downloads periodically (optional)
chrome.alarms.create('cleanup', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        // You could implement cleanup logic here if needed
        console.log('Periodic cleanup check');
    }
});