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

            for (int i = 0; i < submissions.Count; i++)
            {
                var submission = submissions[i];
                
                try
                {
                    await DownloadFileAsync(submission, contentType);
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
                await Task.Delay(100);
            }

            return downloadedCount;
        }

        private async Task DownloadFileAsync(PixabayItem submission, string contentType)
        {
            var (downloadUrl, filename) = GetDownloadInfo(submission, contentType);
            
            if (string.IsNullOrEmpty(downloadUrl))
            {
                throw new InvalidOperationException("No download URL available");
            }

            // Use JavaScript to trigger download
            await _jsRuntime.InvokeVoidAsync("downloadFile", downloadUrl, filename);
        }

        private (string url, string filename) GetDownloadInfo(PixabayItem submission, string contentType)
        {
            return contentType.ToLower() switch
            {
                "photo" => (
                    submission.LargeImageURL ?? submission.WebformatURL,
                    $"pixabay_image_{submission.Id}_{submission.User}.jpg"
                ),
                "music" => (
                    submission.DownloadUrl ?? "",
                    $"pixabay_audio_{submission.Id}_{submission.User}.mp3"
                ),
                "video" => (
                    submission.Videos?.Large?.Url ?? submission.Videos?.Medium?.Url ?? "",
                    $"pixabay_video_{submission.Id}_{submission.User}.mp4"
                ),
                _ => (
                    submission.WebformatURL,
                    $"pixabay_{contentType}_{submission.Id}_{submission.User}"
                )
            };
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