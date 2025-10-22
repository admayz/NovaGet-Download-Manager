using DownloadManager.Core.Interfaces;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;

namespace DownloadManager.Core.Services;

public class CookieHeaderManager : ICookieHeaderManager
{
    private readonly ILogger<CookieHeaderManager> _logger;

    public CookieHeaderManager(ILogger<CookieHeaderManager> logger)
    {
        _logger = logger;
    }

    public void ApplyCookiesToRequest(HttpRequestMessage request, Dictionary<string, string> cookies)
    {
        if (cookies == null || !cookies.Any())
        {
            return;
        }

        try
        {
            var cookieHeader = BuildCookieHeader(cookies);
            request.Headers.Add("Cookie", cookieHeader);
            
            _logger.LogDebug("Applied {Count} cookies to request", cookies.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to apply cookies to request");
        }
    }

    public void ApplyHeadersToRequest(HttpRequestMessage request, Dictionary<string, string> headers)
    {
        if (headers == null || !headers.Any())
        {
            return;
        }

        try
        {
            foreach (var header in headers)
            {
                // Skip headers that are set automatically or should not be forwarded
                if (ShouldSkipHeader(header.Key))
                {
                    _logger.LogDebug("Skipping header: {HeaderName}", header.Key);
                    continue;
                }

                // Try to add to request headers first
                if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value))
                {
                    // If it fails, try to add to content headers
                    if (request.Content != null)
                    {
                        request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    }
                }
            }

            _logger.LogDebug("Applied {Count} headers to request", headers.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to apply headers to request");
        }
    }

    public string BuildCookieHeader(Dictionary<string, string> cookies)
    {
        if (cookies == null || !cookies.Any())
        {
            return string.Empty;
        }

        return string.Join("; ", cookies.Select(kvp => $"{kvp.Key}={kvp.Value}"));
    }

    public Dictionary<string, string> ParseCookieString(string cookieString)
    {
        var cookies = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(cookieString))
        {
            return cookies;
        }

        try
        {
            var cookiePairs = cookieString.Split(';');
            
            foreach (var pair in cookiePairs)
            {
                var trimmedPair = pair.Trim();
                var separatorIndex = trimmedPair.IndexOf('=');
                
                if (separatorIndex > 0)
                {
                    var name = trimmedPair.Substring(0, separatorIndex).Trim();
                    var value = trimmedPair.Substring(separatorIndex + 1).Trim();
                    
                    if (!string.IsNullOrEmpty(name))
                    {
                        cookies[name] = value;
                    }
                }
            }

            _logger.LogDebug("Parsed {Count} cookies from string", cookies.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse cookie string");
        }

        return cookies;
    }

    private bool ShouldSkipHeader(string headerName)
    {
        var lowerHeaderName = headerName.ToLowerInvariant();

        // Skip headers that HttpClient sets automatically or that could cause issues
        var skipHeaders = new[]
        {
            "host",
            "connection",
            "content-length",
            "transfer-encoding",
            "expect",
            "proxy-connection"
        };

        return skipHeaders.Contains(lowerHeaderName);
    }
}
