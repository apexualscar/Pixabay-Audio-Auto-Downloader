using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pixabay_Mass_Audio_Downloader.Services
{
    public class PixabayApiService
    {
        private readonly HttpClient _httpClient;
        private const string BaseUrl = "https://pixabay.com/api/";

        public PixabayApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<PixabayResponse> GetUserSubmissionsAsync(string apiKey, string username, string contentType = "all", int perPage = 200, int page = 1)
        {
            var url = $"{BaseUrl}?key={apiKey}&username={Uri.EscapeDataString(username)}&category={contentType}&per_page={perPage}&page={page}";
            
            try
            {
                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();
                
                var jsonString = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<PixabayResponse>(jsonString, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return result ?? new PixabayResponse { Hits = Array.Empty<PixabayItem>(), Total = 0 };
            }
            catch (HttpRequestException ex)
            {
                throw new InvalidOperationException($"Failed to fetch data from Pixabay API: {ex.Message}", ex);
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException($"Failed to parse Pixabay API response: {ex.Message}", ex);
            }
        }

        public async Task<bool> ValidateApiKeyAsync(string apiKey)
        {
            try
            {
                var url = $"{BaseUrl}?key={apiKey}&per_page=3";
                var response = await _httpClient.GetAsync(url);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<List<PixabayItem>> GetAllUserSubmissionsAsync(string apiKey, string username, string contentType = "all")
        {
            var allSubmissions = new List<PixabayItem>();
            var page = 1;
            const int perPage = 200;

            while (true)
            {
                var response = await GetUserSubmissionsAsync(apiKey, username, contentType, perPage, page);
                
                if (response.Hits == null || !response.Hits.Any())
                    break;

                allSubmissions.AddRange(response.Hits);

                if (response.Hits.Count() < perPage)
                    break;

                page++;
                
                // Add small delay to be respectful to the API
                await Task.Delay(200);
            }

            return allSubmissions;
        }
    }

    public class PixabayResponse
    {
        public int Total { get; set; }
        public int TotalHits { get; set; }
        public IEnumerable<PixabayItem> Hits { get; set; } = Array.Empty<PixabayItem>();
    }

    public class PixabayItem
    {
        public int Id { get; set; }
        public string PageURL { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Tags { get; set; } = string.Empty;
        public string PreviewURL { get; set; } = string.Empty;
        public int PreviewWidth { get; set; }
        public int PreviewHeight { get; set; }
        public string WebformatURL { get; set; } = string.Empty;
        public int WebformatWidth { get; set; }
        public int WebformatHeight { get; set; }
        public string LargeImageURL { get; set; } = string.Empty;
        public int ImageWidth { get; set; }
        public int ImageHeight { get; set; }
        public int ImageSize { get; set; }
        public int Views { get; set; }
        public int Downloads { get; set; }
        public int Favorites { get; set; }
        public int Likes { get; set; }
        public int Comments { get; set; }
        public string User { get; set; } = string.Empty;
        public string UserImageURL { get; set; } = string.Empty;
        
        // Video-specific properties
        public VideoInfo? Videos { get; set; }
        
        // Audio-specific properties (these might not be in the standard API response)
        public string? DownloadUrl { get; set; }
        public int? Duration { get; set; }
    }

    public class VideoInfo
    {
        public VideoQuality? Large { get; set; }
        public VideoQuality? Medium { get; set; }
        public VideoQuality? Small { get; set; }
        public VideoQuality? Tiny { get; set; }
    }

    public class VideoQuality
    {
        public string Url { get; set; } = string.Empty;
        public int Width { get; set; }
        public int Height { get; set; }
        public int Size { get; set; }
    }
}