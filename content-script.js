// Content script for Pixabay Sound Effects Downloader - Focused Audio Extraction
console.log('Pixabay Sound Effects Downloader content script loaded');

let isContentScriptActive = false;
let scrapingInProgress = false;

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
            background: #17a2b8;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            ?? Audio Scraper Ready
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
    
    switch (message.action) {
        case 'SCAN_SOUND_EFFECTS':
            scanSoundEffectsFromCurrentPage();
            break;
    }
}

async function scanSoundEffectsFromCurrentPage() {
    if (scrapingInProgress) {
        console.log('Scanning already in progress');
        return;
    }
    
    scrapingInProgress = true;
    
    try {
        console.log('Starting to scan sound effects from current page...');
        
        // Show scanning indicator
        showScrapingProgress('Scanning for sound effects...');
        
        // Wait for page to load completely
        await waitForPageLoad();
        
        // Scroll to load all content
        await scrollToLoadAll();
        
        // Extract sound effects using specific selectors
        const soundEffects = await extractSoundEffectsWithProgress();
        
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
        chrome.runtime.sendMessage({
            action: 'SCANNING_ERROR',
            error: error.message
        });
    } finally {
        scrapingInProgress = false;
    }
}

function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 2000); // Extra delay for dynamic content
        } else {
            window.addEventListener('load', () => {
                setTimeout(resolve, 2000);
            });
        }
    });
}

async function scrollToLoadAll() {
    console.log('Scrolling to load all sound effects...');
    
    return new Promise((resolve) => {
        let scrollCount = 0;
        let lastItemCount = 0;
        let stableCount = 0;
        const maxScrolls = 50; // Reduced since we're looking for specific elements
        
        function scrollStep() {
            // Count current sound effect items
            const currentItemCount = countSoundEffectsOnCurrentPage();
            
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
            
            // Stop if no new items for 3 consecutive scrolls or max scrolls reached
            if (stableCount >= 3 || scrollCount >= maxScrolls) {
                console.log(`Scrolling complete. Final count: ${currentItemCount} sound effects`);
                window.scrollTo(0, 0); // Scroll back to top
                setTimeout(resolve, 2000);
                return;
            }
            
            // Scroll down
            window.scrollBy(0, 1000);
            scrollCount++;
            
            setTimeout(scrollStep, 1000); // Wait between scrolls
        }
        
        scrollStep();
    });
}

function countSoundEffectsOnCurrentPage() {
    // Count items using the specific selector you provided
    const audioRows = document.querySelectorAll('.audioRow--nAm4Z');
    return audioRows.length;
}

async function extractSoundEffectsWithProgress() {
    console.log('Extracting sound effects using specific selectors...');
    showScrapingProgress('Analyzing sound effects...');
    
    const soundEffects = [];
    
    // Use the specific selectors you mentioned
    const audioRows = document.querySelectorAll('.audioRow--nAm4Z');
    console.log(`Found ${audioRows.length} audio rows with class "audioRow--nAm4Z"`);
    
    if (audioRows.length === 0) {
        console.log('No audio rows found, trying alternative selectors...');
        
        // Try alternative selectors as fallback
        const alternativeSelectors = [
            '[class*="audioRow"]',
            '[class*="audio-row"]',
            '[class*="sound-row"]',
            '.audio-item',
            '.sound-item',
            '.media-item[data-type="audio"]'
        ];
        
        for (const selector of alternativeSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} items using fallback selector: ${selector}`);
                elements.forEach(element => audioRows.push ? null : audioRows.push(element));
                break;
            }
        }
    }
    
    // Process each audio row
    for (let i = 0; i < audioRows.length; i++) {
        const audioRow = audioRows[i];
        
        try {
            const soundEffect = extractSoundEffectFromRow(audioRow, i);
            if (soundEffect) {
                soundEffects.push(soundEffect);
                
                // Update progress every 10 items
                if (soundEffects.length % 10 === 0) {
                    showScrapingProgress(`Extracted ${soundEffects.length} sound effects...`);
                }
            }
        } catch (error) {
            console.error(`Error processing audio row ${i}:`, error);
        }
    }
    
    console.log(`Successfully extracted ${soundEffects.length} sound effects`);
    return soundEffects;
}

function extractSoundEffectFromRow(audioRow, index) {
    try {
        // Find the title using the specific selector you mentioned
        const nameAndTitleEl = audioRow.querySelector('.nameAndTitle--KcBAZ');
        let title = '';
        
        if (nameAndTitleEl) {
            title = nameAndTitleEl.textContent?.trim() || '';
            console.log(`Found title using nameAndTitle selector: "${title}"`);
        }
        
        // If no title found with specific selector, try alternatives
        if (!title) {
            const titleSelectors = [
                '.title',
                '.name',
                '.track-name',
                '.audio-title',
                'h3',
                'h4',
                '[class*="title"]',
                '[class*="name"]'
            ];
            
            for (const selector of titleSelectors) {
                const titleEl = audioRow.querySelector(selector);
                if (titleEl && titleEl.textContent?.trim()) {
                    title = titleEl.textContent.trim();
                    console.log(`Found title using fallback selector "${selector}": "${title}"`);
                    break;
                }
            }
        }
        
        // If still no title, generate one
        if (!title) {
            title = `Sound Effect ${index + 1}`;
        }
        
        // Try to find download link or audio source
        let downloadUrl = '';
        let itemId = '';
        
        // Look for links to individual sound pages
        const linkSelectors = [
            'a[href*="/sound-effects/"]',
            'a[href*="/music/"]',
            'a[href*="/audio/"]',
            'a[href*="pixabay.com"]'
        ];
        
        for (const selector of linkSelectors) {
            const link = audioRow.querySelector(selector);
            if (link && link.href) {
                downloadUrl = link.href;
                
                // Extract ID from URL
                const idMatch = downloadUrl.match(/\/(\d+)/);
                if (idMatch) {
                    itemId = idMatch[1];
                }
                break;
            }
        }
        
        // Look for audio elements or direct download links
        if (!downloadUrl) {
            const audioSelectors = [
                'audio source',
                'audio[src]',
                'a[href*=".mp3"]',
                'a[href*=".wav"]',
                'a[href*=".ogg"]',
                '[data-src*=".mp3"]',
                '[data-src*=".wav"]'
            ];
            
            for (const selector of audioSelectors) {
                const audioEl = audioRow.querySelector(selector);
                if (audioEl) {
                    downloadUrl = audioEl.src || audioEl.getAttribute('data-src') || audioEl.href || '';
                    if (downloadUrl) break;
                }
            }
        }
        
        // Generate fallback ID if none found
        if (!itemId) {
            itemId = `sound_${index}`;
        }
        
        // Look for preview image
        let previewUrl = '';
        const imgEl = audioRow.querySelector('img');
        if (imgEl) {
            previewUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
        }
        
        console.log(`Extracted sound effect:`, {
            id: itemId,
            title: title,
            downloadUrl: downloadUrl,
            previewUrl: previewUrl
        });
        
        return {
            id: itemId,
            title: title,
            downloadUrl: downloadUrl,
            previewUrl: previewUrl,
            category: 'sound-effects',
            element: audioRow
        };
        
    } catch (error) {
        console.error(`Error extracting sound effect from row ${index}:`, error);
        return null;
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
            background: rgba(23, 162, 184, 0.95);
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
        setTimeout(initializeContentScript, 1000);
    }
}, 2000);