using Microsoft.JSInterop;

namespace Pixabay_Mass_Audio_Downloader.Services
{
    public class SecureStorageService
    {
        private readonly IJSRuntime _jsRuntime;

        public SecureStorageService(IJSRuntime jsRuntime)
        {
            _jsRuntime = jsRuntime;
        }

        public async Task<string?> GetApiKeyAsync()
        {
            try
            {
                return await _jsRuntime.InvokeAsync<string?>("localStorage.getItem", "pixabayApiKey");
            }
            catch (JSException)
            {
                return null;
            }
        }

        public async Task SetApiKeyAsync(string apiKey)
        {
            try
            {
                await _jsRuntime.InvokeVoidAsync("localStorage.setItem", "pixabayApiKey", apiKey);
            }
            catch (JSException ex)
            {
                throw new InvalidOperationException("Failed to save API key", ex);
            }
        }

        public async Task RemoveApiKeyAsync()
        {
            try
            {
                await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", "pixabayApiKey");
            }
            catch (JSException ex)
            {
                throw new InvalidOperationException("Failed to remove API key", ex);
            }
        }

        public async Task<bool> HasApiKeyAsync()
        {
            var apiKey = await GetApiKeyAsync();
            return !string.IsNullOrWhiteSpace(apiKey);
        }
    }
}