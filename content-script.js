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
    // Count items using the specific selectors you provided
    const audioContainers = document.querySelectorAll('.overlayContainer--0ZpHP.lazyImg--u6+yh');
    const audioRows = document.querySelectorAll('.audioRow--nAm4Z');
    
    // Return the higher count as fallback
    return Math.max(audioContainers.length, audioRows.length);
}

async function extractSoundEffectsWithProgress() {
    console.log('Extracting sound effects using specific selectors...');
    showScrapingProgress('Analyzing sound effects...');
    
    const soundEffects = [];
    
    // Use the specific selectors you mentioned for sound effect items
    const overlayContainers = document.querySelectorAll('.overlayContainer--0ZpHP.lazyImg--u6+yh');
    console.log(`Found ${overlayContainers.length} overlay containers with classes "overlayContainer--0ZpHP lazyImg--u6+yh"`);
    
    // Also try the original audioRow selector as fallback
    const audioRows = document.querySelectorAll('.audioRow--nAm4Z');
    console.log(`Found ${audioRows.length} audio rows with class "audioRow--nAm4Z"`);
    
    // Process overlay containers first (your new selector)
    if (overlayContainers.length > 0) {
        for (let i = 0; i < overlayContainers.length; i++) {
            const container = overlayContainers[i];
            
            try {
                const soundEffect = extractSoundEffectFromOverlayContainer(container, i);
                if (soundEffect) {
                    soundEffects.push(soundEffect);
                    
                    // Update progress every 10 items
                    if (soundEffects.length % 10 === 0) {
                        showScrapingProgress(`Extracted ${soundEffects.length} sound effects...`);
                    }
                }
            } catch (error) {
                console.error(`Error processing overlay container ${i}:`, error);
            }
        }
    }
    
    // If no overlay containers found, try audioRows as fallback
    if (soundEffects.length === 0 && audioRows.length > 0) {
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
    }
    
    // If still no results, try alternative selectors
    if (soundEffects.length === 0) {
        console.log('No sound effects found with primary selectors, trying alternatives...');
        
        const alternativeSelectors = [
            '[class*="overlayContainer"]',
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
                
                for (let i = 0; i < elements.length; i++) {
                    try {
                        const soundEffect = extractSoundEffectFromGenericElement(elements[i], i);
                        if (soundEffect) {
                            soundEffects.push(soundEffect);
                        }
                    } catch (error) {
                        console.error(`Error processing element ${i}:`, error);
                    }
                }
                break;
            }
        }
    }
    
    console.log(`Successfully extracted ${soundEffects.length} sound effects`);
    return soundEffects;
}

function extractSoundEffectFromOverlayContainer(container, index) {
    try {
        // Look for links within the overlay container
        const linkElement = container.querySelector('a');
        let itemUrl = linkElement ? linkElement.href : '';
        let itemId = `sound_${index}`;
        
        // Extract ID from URL if available
        if (itemUrl) {
            const idMatch = itemUrl.match(/\/(\d+)/);
            if (idMatch) {
                itemId = idMatch[1];
            }
        }
        
        // Look for image within the container
        const imgElement = container.querySelector('img');
        let previewUrl = '';
        let title = '';
        
        if (imgElement) {
            previewUrl = imgElement.src || imgElement.getAttribute('data-src') || '';
            title = imgElement.alt || imgElement.title || '';
        }
        
        // Try to find title from nearby elements or link text
        if (!title && linkElement) {
            title = linkElement.getAttribute('title') || 
                   linkElement.textContent?.trim() || '';
        }
        
        // Look for any text content within the container
        if (!title) {
            const textElements = container.querySelectorAll('span, div, p');
            for (const textEl of textElements) {
                const text = textEl.textContent?.trim();
                if (text && text.length > 2 && text.length < 100) {
                    title = text;
                    break;
                }
            }
        }
        
        // Generate fallback title if none found
        if (!title) {
            title = `Sound Effect ${index + 1}`;
        }
        
        console.log(`Extracted from overlay container:`, {
            id: itemId,
            title: title,
            downloadUrl: itemUrl,
            previewUrl: previewUrl
        });
        
        return {
            id: itemId,
            title: title,
            downloadUrl: itemUrl,
            previewUrl: previewUrl,
            category: 'sound-effects',
            element: container
        };
        
    } catch (error) {
        console.error(`Error extracting from overlay container ${index}:`, error);
        return null;
    }
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

function extractSoundEffectFromGenericElement(element, index) {
    try {
        let title = '';
        let downloadUrl = '';
        let previewUrl = '';
        let itemId = `sound_${index}`;
        
        // Try to find any link
        const link = element.querySelector('a') || (element.tagName === 'A' ? element : null);
        if (link && link.href) {
            downloadUrl = link.href;
            const idMatch = downloadUrl.match(/\/(\d+)/);
            if (idMatch) {
                itemId = idMatch[1];
            }
        }
        
        // Try to find any image
        const img = element.querySelector('img');
        if (img) {
            previewUrl = img.src || img.getAttribute('data-src') || '';
            if (!title) {
                title = img.alt || img.title || '';
            }
        }
        
        // Try to find text content
        if (!title) {
            title = element.textContent?.trim() || `Sound Effect ${index + 1}`;
        }
        
        // Clean up title (remove extra whitespace, limit length)
        title = title.replace(/\s+/g, ' ').substring(0, 100).trim();
        
        if (title) {
            return {
                id: itemId,
                title: title,
                downloadUrl: downloadUrl,
                previewUrl: previewUrl,
                category: 'sound-effects',
                element: element
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error extracting from generic element ${index}:`, error);
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
            background: rgba(75, 194, 75, 0.95);
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