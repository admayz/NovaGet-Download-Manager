namespace DownloadManager.Core.Interfaces;

public interface IConnectionManager
{
    Task<HttpClient> GetClientAsync(Uri uri);
    void ReleaseClient(HttpClient client);
    Task<bool> SupportsRangeRequestsAsync(Uri uri);
    HttpRequestMessage CreateRequestWithCookiesAndHeaders(Uri uri, HttpMethod method, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null);
}
