# Pixabay Mass Downloader Chrome Extension

A Chrome extension built with Blazor WebAssembly and C# that allows you to download all submissions from any Pixabay user profile with a single click.

## Features

- ?? **Mass Download**: Download all images, sounds, or videos from any Pixabay user
- ?? **Secure API Storage**: Your Pixabay API key is stored securely
- ?? **Progress Tracking**: Real-time progress updates during downloads
- ?? **Content Type Selection**: Choose between images, audio, videos, or all content
- ?? **Preview Mode**: Preview submissions before downloading
- ?? **Web Interface**: Use the extension as a web app or Chrome extension

## Installation

### Chrome Extension Installation

1. **Download or clone this repository**
2. **Open Chrome and navigate to** `chrome://extensions/`
3. **Enable "Developer mode"** in the top right corner
4. **Click "Load unpacked"** and select the project root directory
5. **The extension should now appear** in your extensions list

### Web App Usage

1. **Build and run the Blazor WebAssembly application**:
   ```bash
   dotnet run --project Pixabay-Mass-Audio-Downloader
   ```
2. **Navigate to** `https://localhost:5001` (or your configured port)
3. **Use the Mass Downloader page** to download content

## Setup

### 1. Get Your Pixabay API Key

1. Visit [Pixabay API Documentation](https://pixabay.com/api/docs/)
2. Create a free account or log in
3. Generate your API key (it's free!)
4. Copy your API key for the next step

### 2. Configure the Extension

**Option A: Extension Popup**
1. Click the extension icon in Chrome
2. Enter your API key in the popup
3. Click "Save API Key"

**Option B: Web Interface**
1. Open the web app
2. Go to the "Mass Downloader" page
3. Enter your API key
4. Click "Save Key"

## Usage

### Using the Chrome Extension

1. **Navigate to any Pixabay user profile** (e.g., `https://pixabay.com/users/username/`)
2. **The extension will automatically add download buttons** to the user's profile page
3. **Choose the content type** you want to download:
   - ?? **Download All Images**
   - ?? **Download All Sounds**
   - ?? **Download All Videos**
4. **Click the appropriate button** to start the download
5. **Monitor progress** through the progress bar that appears

### Using the Web Interface

1. **Open the Mass Downloader page**
2. **Enter the Pixabay username** you want to download from
3. **Select the content type** (All, Images, Audio, Videos)
4. **Click "Preview"** to see what will be downloaded (optional)
5. **Click "Start Download"** to begin the download process

## File Structure

```
?? Pixabay-Mass-Audio-Downloader/
??? ?? manifest.json                    # Chrome extension manifest
??? ?? content-script.js               # Content script for Pixabay pages
??? ?? content-styles.css              # Styles for injected UI
??? ?? background.js                   # Background service worker
??? ?? popup.html                      # Extension popup interface
??? ?? popup.js                        # Popup functionality
??? ?? Components/
?   ??? ?? Pages/
?   ?   ??? ?? Home.razor              # Landing page
?   ?   ??? ?? Downloader.razor        # Main downloader interface
?   ??? ?? Layout/                     # Layout components
??? ?? Services/
?   ??? ?? PixabayApiService.cs        # Pixabay API integration
?   ??? ?? DownloadService.cs          # Download management
?   ??? ?? SecureStorageService.cs     # Secure storage handling
??? ?? wwwroot/
    ??? ?? js/
        ??? ?? app.js                  # JavaScript utilities
```

## How It Works

1. **Content Script Injection**: When you visit a Pixabay user profile, the content script automatically injects download buttons
2. **API Integration**: Uses the official Pixabay API to fetch user submissions
3. **Batch Processing**: Downloads files in batches with progress tracking
4. **Secure Storage**: API keys are stored securely using Chrome's storage API
5. **File Management**: Downloaded files are organized in a `pixabay_downloads` folder

## API Limits

- **Pixabay API Rate Limits**: 
  - 5,000 requests per hour for free accounts
  - 20,000 requests per hour for premium accounts
- **Download Limits**: Based on your internet connection and storage space
- **File Size Limits**: Dependent on the original file sizes on Pixabay

## Supported Content Types

- **Images**: JPEG, PNG, WebP formats
- **Audio**: MP3, WAV formats (where available)
- **Videos**: MP4 format in various qualities
- **All Content**: Downloads everything from the user

## Troubleshooting

### Extension Not Working
- Ensure developer mode is enabled in Chrome
- Check that the extension is loaded and enabled
- Verify you're on a Pixabay user profile page

### API Key Issues
- Verify your API key is valid at [Pixabay API](https://pixabay.com/api/docs/)
- Check that you haven't exceeded rate limits
- Ensure the key is properly saved in the extension

### Download Issues
- Check your internet connection
- Verify sufficient storage space
- Some files may not be available for download due to Pixabay restrictions

### Performance Tips
- **For large collections**: Consider downloading in smaller batches
- **Network considerations**: Downloads may be slower on slower connections
- **Storage management**: Regularly clean up downloaded files

## Development

### Prerequisites
- .NET 8 SDK
- Visual Studio 2022 or VS Code
- Chrome browser for testing

### Building the Project
```bash
# Restore packages
dotnet restore

# Build the application
dotnet build

# Run the web application
dotnet run --project Pixabay-Mass-Audio-Downloader
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security

- **API Key Storage**: Keys are stored using Chrome's secure storage API
- **HTTPS Only**: All API calls use HTTPS
- **No Data Collection**: The extension doesn't collect or transmit personal data
- **Local Processing**: All processing is done locally in your browser

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for personal use only. Please respect Pixabay's terms of service and the rights of content creators. Always verify that you have the right to download and use the content according to Pixabay's license terms.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Chrome's developer console for errors
3. Verify your Pixabay API key is working
4. Create an issue on GitHub with detailed information

---

**Enjoy bulk downloading from Pixabay! ??**