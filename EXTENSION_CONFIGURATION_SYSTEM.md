# Extension Configuration System

## Overview

A comprehensive configuration system has been added to the Pixabay Sound Effects Downloader extension, providing users with full control over download behavior, file organization, and naming patterns.

## Configuration Options

### **?? Download Location**
Controls where files are downloaded to on the user's system.

**Options:**
- **Downloads Folder (Default)**: Standard browser downloads directory
- **Desktop**: User's desktop directory  
- **Documents**: User's documents directory
- **Music Folder**: User's music directory
- **Custom Location**: User-specified directory path

**Implementation:**
```javascript
// Chrome Downloads API path handling
switch (downloadConfig.downloadLocation) {
    case 'desktop':
        fullPath = `Desktop/${folderPath}/${filename}`;
        break;
    case 'documents':
        fullPath = `Documents/${folderPath}/${filename}`;
        break;
    case 'music':
        fullPath = `Music/${folderPath}/${filename}`;
        break;
    case 'custom':
        fullPath = `${customPath}/${folderPath}/${filename}`;
        break;
    default:
        fullPath = `${folderPath}/${filename}`;
}
```

### **??? Main Folder Name**
The primary folder name where all audio files are organized.

**Default:** `PixabayAudio`
**Examples:**
- `PixabayAudio` (default)
- `SoundEffects`
- `AudioLibrary` 
- `Music_Collection`

### **?? Sort into User Folders**
Creates separate subfolders for each user's content.

**Enabled (Default):**
```
PixabayAudio/
??? username1_Page1/
?   ??? sound1.mp3
?   ??? sound2.mp3
??? username2/
    ??? effect1.mp3
    ??? effect2.mp3
```

**Disabled:**
```
PixabayAudio/
??? sound1.mp3
??? sound2.mp3
??? effect1.mp3
??? effect2.mp3
```

### **?? File Naming Patterns**
Controls how individual audio files are named.

**Options:**
1. **Title + ID (Default)**: `relaxing_music_456789.mp3`
2. **ID + Title**: `456789_relaxing_music.mp3`
3. **Title Only**: `relaxing_music.mp3`
4. **ID Only**: `456789.mp3`
5. **Custom Pattern**: User-defined (future feature)

**Implementation:**
```javascript
function generateFilename(soundEffect, index) {
    const title = sanitizeFilename(soundEffect.title || `sound_effect_${index}`);
    const id = soundEffect.id || index;
    
    switch (downloadConfig.fileNamingPattern) {
        case 'title_id': return `${title}_${id}`;
        case 'id_title': return `${id}_${title}`;
        case 'title_only': return title;
        case 'id_only': return id.toString();
        default: return `${title}_${id}`;
    }
}
```

### **?? Audio Quality**
Preferred audio quality when multiple options are available.

**Options:**
- **Highest Available (Default)**: Best quality possible
- **Medium Quality**: Balanced size/quality
- **Preview Quality**: Smallest files

### **?? Download Delay**
Time delay between downloads to prevent rate limiting and avoid Cloudflare detection.

**Options:**
- **1 second**: Fast (higher risk)
- **2 seconds**: Balanced (default)
- **3 seconds**: Conservative
- **5 seconds**: Very safe

**Implementation:**
```javascript
// Apply configured download delay
const configuredDelay = downloadConfig.downloadDelay * 1000; // Convert to ms
const randomDelay = Math.random() * 1000; // Random 0-1 seconds  
const totalDelay = configuredDelay + randomDelay;

await sleep(totalDelay);
```

## UI Implementation

### **Collapsible Configuration Section**
- **Toggle Button**: Show/Hide configuration
- **Compact Design**: Doesn't interfere with main functionality
- **Persistent Settings**: Saved automatically

### **Form Controls**
```html
<!-- Download Location -->
<select class="config-select" id="downloadLocation">
    <option value="downloads">Downloads Folder (Default)</option>
    <option value="desktop">Desktop</option>
    <option value="documents">Documents</option>
    <option value="music">Music Folder</option>
    <option value="custom">Custom Location</option>
</select>

<!-- Custom Location (conditional) -->
<input type="text" class="config-input" id="customLocationPath" 
       placeholder="e.g., C:\Users\YourName\Music\Pixabay">

<!-- Main Folder Name -->
<input type="text" class="config-input" id="mainFolderName" 
       value="PixabayAudio" placeholder="PixabayAudio">

<!-- User Folders Toggle -->
<input type="checkbox" class="config-checkbox" id="sortIntoUserFolders" checked>

<!-- File Naming Pattern -->
<select class="config-select" id="fileNamingPattern">
    <option value="title_id">Title + ID (Default)</option>
    <option value="id_title">ID + Title</option>
    <option value="title_only">Title Only</option>
    <option value="id_only">ID Only</option>
</select>
```

### **Configuration Management**
```javascript
// Load configuration on startup
async function loadConfiguration() {
    const result = await chrome.storage.local.get([...configKeys]);
    downloadConfig = { ...defaultConfig, ...result };
    updateConfigurationUI();
}

// Save configuration changes
async function saveConfiguration() {
    await chrome.storage.local.set(downloadConfig);
    await chrome.runtime.sendMessage({
        action: 'UPDATE_CONFIG', 
        config: downloadConfig
    });
}
```

## Storage & Persistence

### **Chrome Storage Local**
Configuration is stored using Chrome's local storage API for persistence across browser sessions.

```javascript
// Storage structure
{
    downloadLocation: 'downloads',
    customLocationPath: '',
    mainFolderName: 'PixabayAudio', 
    sortIntoUserFolders: true,
    fileNamingPattern: 'title_id',
    audioQuality: 'highest',
    downloadDelay: 2
}
```

### **Background Script Integration**
Configuration is loaded in the background script and applied to all download operations.

```javascript
// Configuration loading on extension startup
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Set default configuration
        chrome.storage.local.set(defaultConfig);
    }
    loadConfiguration();
});
```

## Examples

### **Default Configuration**
**Location:** Downloads folder  
**Structure:**
```
Downloads/
??? PixabayAudio/
    ??? john_doe_Page1/
        ??? ambient_forest_456789.mp3
        ??? rain_sounds_456790.mp3
        ??? bird_chirping_456791.mp3
```

### **Music Folder + ID-Only Naming**
**Location:** Music folder  
**Naming:** ID Only  
**Structure:**
```
Music/
??? PixabayAudio/
    ??? nature_sounds_artist/
        ??? 456789.mp3
        ??? 456790.mp3
        ??? 456791.mp3
```

### **Custom Location + No User Folders**
**Location:** `C:\MyAudio\Pixabay`  
**User Folders:** Disabled  
**Structure:**
```
C:\MyAudio\Pixabay/
??? SoundLibrary/
    ??? relaxing_music_456789.mp3
    ??? upbeat_song_456790.mp3
    ??? ambient_noise_456791.mp3
```

### **Desktop + Title-Only Naming**
**Location:** Desktop  
**Naming:** Title Only  
**Structure:**
```
Desktop/
??? AudioEffects/
    ??? sound_designer_xyz/
        ??? thunderstorm.mp3
        ??? ocean_waves.mp3
        ??? city_traffic.mp3
```

## Advanced Features

### **Smart Filename Sanitization**
Automatically cleans filenames to be compatible with all operating systems:

```javascript
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // Remove invalid chars
        .replace(/\s+/g, '_')                     // Replace spaces
        .replace(/_{2,}/g, '_')                   // Remove double underscores
        .toLowerCase()                            // Lowercase
        .substring(0, 50);                        // Limit length
}
```

### **Graceful Fallbacks**
- **Folder Creation Fails**: Falls back to flat structure
- **Custom Path Invalid**: Falls back to Downloads folder  
- **Invalid Characters**: Automatically sanitized
- **Empty Names**: Generated from ID or index

### **Cross-Platform Compatibility**
- **Windows**: `C:\Users\Name\Downloads\PixabayAudio\`
- **macOS**: `/Users/Name/Downloads/PixabayAudio/`
- **Linux**: `/home/name/Downloads/PixabayAudio/`

## User Experience

### **?? Intuitive Interface**
- **Clear Labels**: Each option clearly explained
- **Helpful Descriptions**: Context for each setting
- **Live Preview**: Shows folder structure as configured

### **?? Smart Defaults**
- **Downloads Folder**: Familiar location for most users
- **Organized Structure**: User folders enabled by default
- **Balanced Timing**: 2-second delay prevents issues

### **?? Automatic Saving**
- **Instant Persistence**: Settings saved immediately
- **No Data Loss**: Configuration survives browser restarts
- **Reset Option**: Easy return to defaults

### **? Performance Optimized**
- **Lazy Loading**: Configuration loaded only when needed
- **Minimal UI Impact**: Collapsible design saves space
- **Efficient Storage**: Only changed values stored

## Recommended Configurations

### **?? Speed Focused**
- **Location**: Downloads
- **User Folders**: Disabled
- **Naming**: ID Only
- **Delay**: 1 second

### **?? Organization Focused**
- **Location**: Music Folder
- **User Folders**: Enabled
- **Naming**: Title + ID
- **Delay**: 2 seconds

### **??? Safety Focused**
- **Location**: Custom (dedicated folder)
- **User Folders**: Enabled
- **Naming**: Title + ID
- **Delay**: 5 seconds

### **?? Space Efficient**
- **Quality**: Preview
- **Naming**: ID Only
- **Location**: Custom (external drive)
- **Delay**: 3 seconds

The configuration system provides users with complete control over their download experience while maintaining the extension's ease of use and reliability.