using Microsoft.JSInterop;
using Pixabay_Mass_Audio_Downloader.Services;

namespace Pixabay_Mass_Audio_Downloader.Services
{
    public class DownloadService
    {
        private readonly IJSRuntime _jsRuntime;
        private readonly PixabayApiService _pixabayService;

        public DownloadService(IJSRuntime jsRuntime, PixabayApiService pixabayService)
        {
            _jsRuntime = jsRuntime;
            _pixabayService = pixabayService;
        }

        public async Task<int> DownloadUserSubmissionsAsync(string apiKey, string username, string contentType, 
            IProgress<DownloadProgress>? progress = null)
        {
            var submissions = await _pixabayService.GetAllUserSubmissionsAsync(apiKey, username, contentType);
            
            if (!submissions.Any())
            {
                return 0;
            }

            var downloadedCount = 0;
            var totalCount = submissions.Count;

            // Create folder name: username_contenttype (e.g., "john_doe_images")
            var folderName = $"{SanitizeFilename(username)}_{contentType}";

            for (int i = 0; i < submissions.Count; i++)
            {
                var submission = submissions[i];
                
                try
                {
                    await DownloadFileAsync(submission, contentType, folderName, username);
                    downloadedCount++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to download {submission.Id}: {ex.Message}");
                    // Continue with next file
                }

                // Report progress
                progress?.Report(new DownloadProgress
                {
                    Current = downloadedCount,
                    Total = totalCount,
                    CurrentItem = submission
                });

                // Small delay to avoid overwhelming the browser
                await Task.Delay(200);
            }

            return downloadedCount;
        }

        private async Task DownloadFileAsync(PixabayItem submission, string contentType, string folderName, string username)
        {
            var (downloadUrl, extension) = GetDownloadInfo(submission, contentType);
            
            if (string.IsNullOrEmpty(downloadUrl))
            {
                throw new InvalidOperationException("No download URL available");
            }

            // Create structured filename: foldername/user_id_description.ext
            var safeUser = SanitizeFilename(submission.User ?? username);
            var safeDescription = SanitizeFilename(GetFirstTag(submission.Tags) ?? "content");
            var filename = $"{folderName}/{safeUser}_{submission.Id}_{safeDescription}.{extension}";

            // Use JavaScript to trigger download with folder structure
            await _jsRuntime.InvokeVoidAsync("downloadFileToFolder", downloadUrl, filename);
        }

        private (string url, string extension) GetDownloadInfo(PixabayItem submission, string contentType)
        {
            return contentType.ToLower() switch
            {
                "photo" => (
                    submission.LargeImageURL ?? submission.WebformatURL,
                    "jpg"
                ),
                "music" => (
                    submission.DownloadUrl ?? submission.WebformatURL,
                    "mp3"
                ),
                "video" => (
                    submission.Videos?.Large?.Url ?? submission.Videos?.Medium?.Url ?? "",
                    "mp4"
                ),
                _ => (
                    submission.WebformatURL,
                    GetExtensionFromUrl(submission.WebformatURL) ?? "jpg"
                )
            };
        }

        private string SanitizeFilename(string filename)
        {
            if (string.IsNullOrWhiteSpace(filename)) return "unknown";
            
            // Remove or replace characters that are not allowed in filenames
            return filename
                .Replace("/", "_")
                .Replace("\\", "_")
                .Replace(":", "_")
                .Replace("*", "_")
                .Replace("?", "_")
                .Replace("\"", "_")
                .Replace("<", "_")
                .Replace(">", "_")
                .Replace("|", "_")
                .Replace(" ", "_")
                .ToLowerInvariant()
                .Substring(0, Math.Min(filename.Length, 50)); // Limit length
        }

        private string? GetFirstTag(string? tags)
        {
            if (string.IsNullOrWhiteSpace(tags)) return null;
            
            var firstTag = tags.Split(',', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
            return string.IsNullOrWhiteSpace(firstTag) ? null : firstTag;
        }

        private string? GetExtensionFromUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;
            
            try
            {
                var uri = new Uri(url);
                var extension = Path.GetExtension(uri.AbsolutePath)?.TrimStart('.');
                return string.IsNullOrWhiteSpace(extension) ? null : extension;
            }
            catch
            {
                return null;
            }
        }
    }

    public class DownloadProgress
    {
        public int Current { get; set; }
        public int Total { get; set; }
        public PixabayItem? CurrentItem { get; set; }
        public double Percentage => Total > 0 ? (double)Current / Total * 100 : 0;
    }
}