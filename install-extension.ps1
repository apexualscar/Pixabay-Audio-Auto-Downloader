# Chrome Extension Installation Script
# This script helps users prepare the extension for installation

Write-Host "Pixabay Mass Downloader - Chrome Extension Setup" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if required files exist
$requiredFiles = @(
    "manifest.json",
    "content-script.js",
    "content-styles.css",
    "background.js",
    "popup.html",
    "popup.js"
)

Write-Host "`nChecking required extension files..." -ForegroundColor Yellow

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "? $file" -ForegroundColor Green
    } else {
        Write-Host "? $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "`n? All required files are present!" -ForegroundColor Green
    
    Write-Host "`nTo install the Chrome extension:" -ForegroundColor Cyan
    Write-Host "1. Open Chrome and go to chrome://extensions/" -ForegroundColor White
    Write-Host "2. Enable 'Developer mode' in the top right" -ForegroundColor White
    Write-Host "3. Click 'Load unpacked' and select this folder" -ForegroundColor White
    Write-Host "4. The extension should appear in your extensions list" -ForegroundColor White
    
    Write-Host "`nTo use the web application:" -ForegroundColor Cyan
    Write-Host "1. Run: dotnet run --project Pixabay-Mass-Audio-Downloader" -ForegroundColor White
    Write-Host "2. Open your browser to the displayed URL" -ForegroundColor White
    Write-Host "3. Navigate to the Mass Downloader page" -ForegroundColor White
    
} else {
    Write-Host "`n? Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Red
    }
    Write-Host "`nPlease ensure all files are present before installing the extension." -ForegroundColor Yellow
}

Write-Host "`nFor more information, see EXTENSION_README.md" -ForegroundColor Cyan