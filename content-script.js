// Content script for Pixabay Sound Effects Downloader - Focused Audio Extraction
console.log('Pixabay Sound Effects Downloader content script loaded');

let isContentScriptActive = false;
let scrapingInProgress = false;
let scrapingSessionId = null;

// Initialize content script
function initializeContentScript() {
    if (isContentScriptActive) return;
    
    console.log('Initializing Pixabay sound effects content script...');
    isContentScriptActive = true;
    
    // Check if we're on a Pixabay page
    if (window.location.hostname.includes('pixabay.com')) {
        console.log('Pixabay page detected');
        
        // Add visual indicators that scraping is available
        addScrapingIndicators();
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    }
}

function addScrapingIndicators() {
    // Add a subtle indicator that the scraper is active
    const indicator = document.createElement('div');
    indicator.id = 'pixabay-sound-scraper-indicator';
    indicator.innerHTML = `
        <div style="
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4bc24b;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            PeX Audio Scraper Ready
        </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        const el = document.getElementById('pixabay-sound-scraper-indicator');
        if (el) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s ease';
            setTimeout(() => el.remove(), 500);
        }
    }, 3000);
}

function handleBackgroundMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    // Check if we're on a Cloudflare challenge page
    if (isCloudflareChallengePage()) {
        console.log('Cloudflare challenge detected, waiting for completion...');
        sendResponse({ error: 'Cloudflare challenge detected. Please wait for the page to load completely and try again.' });
        return;
    }
    
    switch (message.action) {
        case 'SCAN_SOUND_EFFECTS':
            scanSoundEffectsFromCurrentPage();
            break;
        case 'CANCEL_SCAN':
            cancelCurrentScan();
            break;
    }
}

function isCloudflareChallengePage() {
    // Check for common Cloudflare challenge indicators
    const cloudflareIndicators = [
        'Checking your browser before accessing',
        'This process is automatic',
        'DDoS protection by Cloudflare',
        'cf-browser-verification',
        'cf-checking-browser',
        'cf-challenge-page'
    ];
    
    const pageText = document.body ? document.body.textContent || '' : '';
    const pageHTML = document.documentElement ? document.documentElement.innerHTML || '' : '';
    
    for (const indicator of cloudflareIndicators) {
        if (pageText.includes(indicator) || pageHTML.includes(indicator)) {
            return true;
        }
    }
    
    // Check for Cloudflare-specific elements
    const cloudflareSelectors = [
        '.cf-browser-verification',
        '.cf-checking-browser',
        '#cf-challenge-stage',
        '.cf-challenge-page'
    ];
    
    for (const selector of cloudflareSelectors) {
        if (document.querySelector(selector)) {
            return true;
        }
    }
    
    return false;
}

function cancelCurrentScan() {
    if (scrapingInProgress) {
        console.log('Canceling current scan');
        scrapingInProgress = false;
        scrapingSessionId = null;
        hideScrapingProgress();
    }
}

async function scanSoundEffectsFromCurrentPage() {
    if (scrapingInProgress) {
        console.log('Scanning already in progress');
        return;
    }
    
    scrapingInProgress = true;
    scrapingSessionId = Date.now(); // Create unique session ID
    const currentSessionId = scrapingSessionId;
    
    try {
        console.log('Starting to scan sound effects from current page...');
        
        // Show scanning indicator
        showScrapingProgress('Scanning for sound effects...');
        
        // Quick page readiness check (reduced from 2000ms to 500ms)
        await waitForPageLoad();
        
        // Check if scan was cancelled
        if (!scrapingInProgress || scrapingSessionId !== currentSessionId) {
            throw new Error('Scan was cancelled');
        }
        
        // Optimized scrolling with timeout and better performance
        await scrollToLoadAllOptimized(currentSessionId);
        
        // Check if scan was cancelled
        if (!scrapingInProgress || scrapingSessionId !== currentSessionId) {
            throw new Error('Scan was cancelled');
        }
        
        // Extract sound effects with optimized approach
        const soundEffects = await extractSoundEffectsOptimized(currentSessionId);
        
        // Final check before sending results
        if (!scrapingInProgress || scrapingSessionId !== currentSessionId) {
            throw new Error('Scan was cancelled');
        }
        
        console.log(`Successfully extracted ${soundEffects.length} sound effects`);
        
        // Send results back to background script
        chrome.runtime.sendMessage({
            action: 'SOUND_EFFECTS_EXTRACTED',
            items: soundEffects
        });
        
        hideScrapingProgress();
        
    } catch (error) {
        console.error('Error scanning sound effects:', error);
        hideScrapingProgress();
        
        // Only send error if scan wasn't cancelled
        if (scrapingInProgress && scrapingSessionId === currentSessionId) {
            chrome.runtime.sendMessage({
                action: 'SCANNING_ERROR',
                error: error.message
            });
        }
    } finally {
        scrapingInProgress = false;
        scrapingSessionId = null;
    }
}

function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 500); // Reduced from 2000ms
        } else {
            window.addEventListener('load', () => {
                setTimeout(resolve, 500); // Reduced from 2000ms
            });
        }
    });
}

async function scrollToLoadAllOptimized(sessionId) {
    console.log('Optimized scrolling to load all sound effects with anti-Cloudflare measures...');
    
    return new Promise((resolve, reject) => {
        let scrollCount = 0;
        let lastItemCount = 0;
        let stableCount = 0;
        const maxScrolls = 10; // Reduced from 15 to 10 for better performance
        const scrollDelay = 800; // Increased from 300ms to 800ms to avoid Cloudflare
        const maxTime = 30000; // 30 second timeout (reduced from 20s)
        const startTime = Date.now();
        
        function scrollStep() {
            // Check for cancellation or timeout
            if (!scrapingInProgress || scrapingSessionId !== sessionId) {
                reject(new Error('Scan cancelled'));
                return;
            }
            
            if (Date.now() - startTime > maxTime) {
                console.log('Scrolling timeout reached');
                window.scrollTo(0, 0);
                setTimeout(resolve, 1000); // Increased delay
                return;
            }
            
            // Count current sound effect items with faster method
            const currentItemCount = countSoundEffectsOnCurrentPageFast();
            
            // Check if new items loaded
            if (currentItemCount === lastItemCount) {
                stableCount++;
            } else {
                stableCount = 0;
                lastItemCount = currentItemCount;
                console.log(`Found ${currentItemCount} sound effects after scroll ${scrollCount}`);
                
                // Update progress
                showScrapingProgress(`Loading sound effects... Found ${currentItemCount} items`);
            }
            
            // Stop if no new items for 2 consecutive scrolls or max scrolls reached
            if (stableCount >= 2 || scrollCount >= maxScrolls) {
                console.log(`Scrolling complete. Final count: ${currentItemCount} sound effects`);
                window.scrollTo(0, 0); // Scroll back to top
                setTimeout(resolve, 1000); // Increased delay
                return;
            }
            
            // Scroll down with human-like behavior to avoid detection
            const scrollAmount = 600 + Math.random() * 400; // Random 600-1000px
            window.scrollBy(0, scrollAmount);
            scrollCount++;
            
            // Add random additional delay occasionally to mimic human behavior
            const extraDelay = Math.random() < 0.3 ? Math.random() * 1000 : 0;
            const totalDelay = scrollDelay + extraDelay;
            
            setTimeout(scrollStep, totalDelay);
        }
        
        // Initial delay before starting to mimic human behavior
        setTimeout(scrollStep, 1000);
    });
}

function countSoundEffectsOnCurrentPageFast() {
    // More specific audio-only counting
    let audioCount = 0;
    
    // Method 1: Try to find audio-specific rows first
    const audioRows = document.querySelectorAll('.audioRow--nAm4Z');
    if (audioRows.length > 0) {
        return audioRows.length;
    }
    
    // Method 2: Filter overlay containers to only include audio content
    const allContainers = document.querySelectorAll('.overlayContainer--0ZpHP');
    allContainers.forEach(container => {
        if (isAudioContainer(container)) {
            audioCount++;
        }
    });
    
    return audioCount;
}

// Helper function to determine if a container represents audio content
function isAudioContainer(container) {
    // Check 1: Look for audio-specific indicators in the URL
    const linkElement = container.querySelector('a');
    if (linkElement && linkElement.href) {
        // Audio URLs typically contain /music/ or /sound-effects/
        if (linkElement.href.includes('/music/') || 
            linkElement.href.includes('/sound-effects/') ||
            linkElement.href.includes('/audio/')) {
            return true;
        }
    }
    
    // Check 2: Look for audio-specific classes or attributes
    const audioIndicators = [
        '[class*="audio"]',
        '[class*="sound"]',
        '[class*="music"]',
        '[data-type="audio"]',
        '[data-category="audio"]',
        '[data-category="music"]',
        '[data-category="sound-effects"]'
    ];
    
    for (const selector of audioIndicators) {
        if (container.querySelector(selector) || container.matches(selector)) {
            return true;
        }
    }
    
    // Check 3: Look for play button or audio controls
    const audioControlSelectors = [
        '.play-button',
        '.audio-controls',
        '[class*="play"]',
        '.fa-play',
        '.fa-volume',
        'button[title*="play" i]',
        'button[aria-label*="play" i]'
    ];
    
    for (const selector of audioControlSelectors) {
        if (container.querySelector(selector)) {
            return true;
        }
    }
    
    // Check 4: Look for duration indicators (audio files often show duration)
    const durationSelectors = [
        '[class*="duration"]',
        '[class*="time"]',
        '.fa-clock'
    ];
    
    for (const selector of durationSelectors) {
        const element = container.querySelector(selector);
        if (element) {
            const text = element.textContent || '';
            // Check if it looks like a duration (e.g., "2:30", "0:45")
            if (/\d+:\d+/.test(text)) {
                return true;
            }
        }
    }
    
    // Check 5: Exclude obvious image indicators
    const imageElement = container.querySelector('img');
    if (imageElement) {
        const src = imageElement.src || '';
        const alt = imageElement.alt || '';
        
        // If the image clearly indicates it's a photo/illustration, exclude it
        if (src.includes('/photo/') || 
            src.includes('/illustration/') ||
            src.includes('/vector/') ||
            alt.toLowerCase().includes('photo') ||
            alt.toLowerCase().includes('image') ||
            alt.toLowerCase().includes('picture')) {
            return false;
        }
    }
    
    // If none of the audio indicators are found, assume it's not audio
    return false;
}

async function extractSoundEffectsOptimized(sessionId) {
    console.log('Extracting sound effects using optimized approach...');
    showScrapingProgress('Analyzing sound effects...');
    
    const soundEffects = [];
    
    // Method 1: Try audio-specific selectors first
    let audioContainers = document.querySelectorAll('.audioRow--nAm4Z');
    
    // Method 2: If no audio rows found, filter overlay containers for audio content
    if (audioContainers.length === 0) {
        const allContainers = document.querySelectorAll('.overlayContainer--0ZpHP');
        const filteredContainers = [];
        
        allContainers.forEach(container => {
            if (isAudioContainer(container)) {
                filteredContainers.push(container);
            }
        });
        
        audioContainers = filteredContainers;
        console.log(`Filtered ${allContainers.length} containers down to ${audioContainers.length} audio containers`);
    }
    
    if (audioContainers.length === 0) {
        // Try alternative selectors only if no audio content found
        return await extractUsingFallbackSelectors(sessionId);
    }
    
    console.log(`Found ${audioContainers.length} audio containers`);
    
    // Process containers in batches to prevent blocking
    const batchSize = 10;
    for (let i = 0; i < audioContainers.length; i += batchSize) {
        // Check for cancellation
        if (!scrapingInProgress || scrapingSessionId !== sessionId) {
            throw new Error('Scan cancelled');
        }
        
        const batch = Array.from(audioContainers).slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
            const container = batch[j];
            const index = i + j;
            
            try {
                const soundEffect = await extractSoundEffectOptimized(container, index);
                if (soundEffect) {
                    soundEffects.push(soundEffect);
                }
            } catch (error) {
                console.error(`Error processing container ${index}:`, error);
            }
        }
        
        // Update progress
        const processed = Math.min(i + batchSize, audioContainers.length);
        showScrapingProgress(`Processed ${processed}/${audioContainers.length} audio items...`);
        
        // Allow other processes to run
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`Successfully extracted ${soundEffects.length} sound effects`);
    return soundEffects;
}

async function extractUsingFallbackSelectors(sessionId) {
    console.log('Using fallback selectors for audio content...');
    
    // More specific audio fallback selectors
    const alternativeSelectors = [
        '[class*="audioRow"]',
        '[class*="audio-row"]',
        '[class*="sound-row"]',
        '[class*="music-row"]',
        '.audio-item',
        '.sound-item',
        '.music-item',
        '[data-type="audio"]',
        '[data-category="audio"]',
        '[data-category="music"]',
        '[data-category="sound-effects"]'
    ];
    
    for (const selector of alternativeSelectors) {
        // Check for cancellation
        if (!scrapingInProgress || scrapingSessionId !== sessionId) {
            throw new Error('Scan cancelled');
        }
        
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`Found ${elements.length} items using fallback selector: ${selector}`);
            
            const soundEffects = [];
            for (let i = 0; i < Math.min(elements.length, 50); i++) { // Limit to 50 items for performance
                try {
                    const soundEffect = await extractSoundEffectOptimized(elements[i], i);
                    if (soundEffect) {
                        soundEffects.push(soundEffect);
                    }
                } catch (error) {
                    console.error(`Error processing element ${i}:`, error);
                }
            }
            return soundEffects;
        }
    }
    
    // Final fallback: manually filter all overlay containers
    console.log('Using manual filtering as final fallback...');
    const allContainers = document.querySelectorAll('.overlayContainer--0ZpHP');
    const audioContainers = [];
    
    for (let i = 0; i < allContainers.length && i < 100; i++) { // Limit for performance
        if (isAudioContainer(allContainers[i])) {
            audioContainers.push(allContainers[i]);
        }
    }
    
    console.log(`Manual filtering found ${audioContainers.length} audio containers from ${allContainers.length} total`);
    
    const soundEffects = [];
    for (let i = 0; i < audioContainers.length; i++) {
        try {
            const soundEffect = await extractSoundEffectOptimized(audioContainers[i], i);
            if (soundEffect) {
                soundEffects.push(soundEffect);
            }
        } catch (error) {
            console.error(`Error processing container ${i}:`, error);
        }
    }
    
    return soundEffects;
}

async function extractSoundEffectOptimized(container, index) {
    try {
        // Validate this is actually audio content before processing
        if (!isAudioContainer(container)) {
            console.log(`Skipping non-audio container ${index}`);
            return null;
        }
        
        // Basic extraction without expensive operations
        const linkElement = container.querySelector('a');
        let itemUrl = linkElement ? linkElement.href : '';
        let itemId = `sound_${index}`;
        
        // Validate URL contains audio indicators
        if (itemUrl) {
            // Extract ID from URL if available (for individual sound effect pages)
            const idMatch = itemUrl.match(/\/(\d+)(?:\/|$|\?)/);
            if (idMatch) {
                itemId = idMatch[1];
                console.log(`Extracted sound effect ID: ${itemId} from URL: ${itemUrl}`);
            }
            
            // Check if this is an individual sound effect URL or just contains audio indicators
            const isIndividualUrl = itemUrl.match(/\/music-\d+\/|\/sound-effect-\d+\/|\/audio-\d+\//);
            const hasAudioIndicators = itemUrl.includes('/music/') || 
                                     itemUrl.includes('/sound-effects/') || 
                                     itemUrl.includes('/audio/');
            
            if (!isIndividualUrl && !hasAudioIndicators) {
                // Additional check: if URL contains image indicators, skip
                if (itemUrl.includes('/photo/') || 
                    itemUrl.includes('/illustration/') || 
                    itemUrl.includes('/vector/')) {
                    console.log(`Skipping image URL: ${itemUrl}`);
                    return null;
                }
            }
        }
        
        // Get basic info
        const imgElement = container.querySelector('img');
        let previewUrl = '';
        let title = '';
        
        if (imgElement) {
            previewUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            title = imgElement.alt || imgElement.title || '';
            
            // Additional validation: check if image alt/title suggests it's not audio
            if (title.toLowerCase().includes('photo') ||
                title.toLowerCase().includes('image') ||
                title.toLowerCase().includes('picture') ||
                title.toLowerCase().includes('illustration') ||
                title.toLowerCase().includes('vector')) {
                console.log(`Skipping non-audio content based on title: ${title}`);
                return null;
            }
        }
        
        // Try to find title from text content (simplified)
        if (!title && linkElement) {
            title = linkElement.textContent?.trim() || '';
        }
        
        if (!title) {
            // Quick text search without deep traversal
            const titleElement = container.querySelector('[class*="title"], [class*="name"], h3, h4');
            if (titleElement) {
                title = titleElement.textContent?.trim() || '';
            }
        }
        
        // Generate fallback title
        if (!title || title.length < 2) {
            title = `Sound Effect ${index + 1}`;
        }
        
        // Final validation: ensure we have a valid audio URL or page URL
        if (!itemUrl) {
            console.log(`Skipping container ${index} - no URL found`);
            return null;
        }
        
        // Store both the individual page URL and current profile page URL
        const currentPageUrl = window.location.href;
        
        console.log(`Successfully extracted audio item ${index}: ${title} (Individual: ${itemUrl}, Profile: ${currentPageUrl})`);
        
        return {
            id: itemId,
            title: title.substring(0, 100), // Limit title length
            downloadUrl: itemUrl, // Individual sound effect page URL
            previewUrl: previewUrl,
            pageUrl: itemUrl, // Individual page URL for button clicking
            profileUrl: currentPageUrl, // Profile page URL as fallback
            category: 'sound-effects',
            element: null, // Don't store DOM elements to prevent memory leaks
            useButtonClick: true // Flag to indicate we should use button clicking
        };
        
    } catch (error) {
        console.error(`Error extracting from container ${index}:`, error);
        return null;
    }
}

// Keep the old extraction functions for download-time use
async function extractAudioUrlFromPage(pageUrl) {
    try {
        console.log(`Attempting to extract audio URL from: ${pageUrl}`);
        
        // Fetch the page content
        const response = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        
        // Look for common patterns in Pixabay's HTML that contain audio URLs
        const audioUrlPatterns = [
            /"preview":\s*"([^"]*\.(?:mp3|wav|ogg)[^"]*)"/gi,
            /"audioURL":\s*"([^"]*\.(?:mp3|wav|ogg)[^"]*)"/gi,
            /"download":\s*"([^"]*\.(?:mp3|wav|ogg)[^"]*)"/gi,
            /data-audio-url="([^"]*\.(?:mp3|wav|ogg)[^"]*)"/gi,
            /src="([^"]*\.(?:mp3|wav|ogg)[^"]*)"/gi,
            /https:\/\/cdn\.pixabay\.com\/audio\/[^"']*\.(?:mp3|wav|ogg)/gi,
            /https:\/\/pixabay\.com\/[^"']*\.(?:mp3|wav|ogg)/gi
        ];
        
        for (const pattern of audioUrlPatterns) {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                // Extract the URL from the first match
                let audioUrl = matches[0];
                
                // Clean up the URL if it's in JSON format
                if (audioUrl.includes('"')) {
                    const urlMatch = audioUrl.match(/"([^"]*\.(?:mp3|wav|ogg)[^"]*)"/);
                    if (urlMatch) {
                        audioUrl = urlMatch[1];
                    }
                }
                
                // Clean up data attribute format
                if (audioUrl.includes('data-audio-url=')) {
                    const urlMatch = audioUrl.match(/data-audio-url="([^"]*)"/);
                    if (urlMatch) {
                        audioUrl = urlMatch[1];
                    }
                }
                
                // Clean up src attribute format
                if (audioUrl.includes('src=')) {
                    const urlMatch = audioUrl.match(/src="([^"]*)"/);
                    if (urlMatch) {
                        audioUrl = urlMatch[1];
                    }
                }
                
                // Ensure the URL is properly formatted
                if (audioUrl && !audioUrl.startsWith('http')) {
                    if (audioUrl.startsWith('//')) {
                        audioUrl = 'https:' + audioUrl;
                    } else if (audioUrl.startsWith('/')) {
                        audioUrl = 'https://pixabay.com' + audioUrl;
                    }
                }
                
                console.log(`Extracted audio URL: ${audioUrl}`);
                return audioUrl;
            }
        }
        
        // If no direct audio URL found, look for any MP3/audio references
        const mp3Matches = html.match(/https:\/\/[^"'\s]*\.mp3/gi);
        if (mp3Matches && mp3Matches.length > 0) {
            console.log(`Found MP3 URL: ${mp3Matches[0]}`);
            return mp3Matches[0];
        }
        
        throw new Error('No audio URL found in page content');
        
    } catch (error) {
        console.error(`Failed to extract audio URL from ${pageUrl}:`, error);
        throw error;
    }
}

function showScrapingProgress(message) {
    let progressEl = document.getElementById('pixabay-sound-scraping-progress');
    
    if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.id = 'pixabay-sound-scraping-progress';
        progressEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(75,194,75,0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(10px);
            max-width: 400px;
            text-align: center;
        `;
        document.body.appendChild(progressEl);
    }
    
    progressEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; flex-direction: column;">
            <div style="
                width: 24px;
                height: 24px;
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <div>${message}</div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

function hideScrapingProgress() {
    const progressEl = document.getElementById('pixabay-sound-scraping-progress');
    if (progressEl) {
        progressEl.remove();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}

// Handle page navigation (for single-page app behavior)
let currentUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        isContentScriptActive = false;
        cancelCurrentScan(); // Cancel any active scan
        setTimeout(initializeContentScript, 1000);
    }
}, 2000);