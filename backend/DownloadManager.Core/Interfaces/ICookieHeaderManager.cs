namespace DownloadManager.Core.Interfaces;

public interface ICookieHeaderManager
{
    void ApplyCookiesToRequest(HttpRequestMessage request, Dictionary<string, string> cookies);
    void ApplyHeadersToRequest(HttpRequestMessage request, Dictionary<string, string> headers);
    string BuildCookieHeader(Dictionary<string, string> cookies);
    Dictionary<string, string> ParseCookieString(string cookieString);
}
