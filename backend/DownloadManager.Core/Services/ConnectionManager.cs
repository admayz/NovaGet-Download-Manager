using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;

namespace DownloadManager.Core.Services;

public class ConnectionManager : IConnectionManager
{
    private readonly ILogger<ConnectionManager> _logger;
    private readonly ICookieHeaderManager _cookieHeaderManager;
    private readonly ICertificateValidator? _certificateValidator;
    private readonly ConcurrentDictionary<string, HttpClient> _clientPool = new();
    private readonly SemaphoreSlim _poolLock = new(1, 1);
    private const int MaxConnectionsPerHost = 8;
    private const int ConnectionTimeoutSeconds = 30;
    private const string DefaultUserAgent = "DownloadManager/1.0";

    public ConnectionManager(
        ILogger<ConnectionManager> logger, 
        ICookieHeaderManager cookieHeaderManager,
        ICertificateValidator? certificateValidator = null)
    {
        _logger = logger;
        _cookieHeaderManager = cookieHeaderManager;
        _certificateValidator = certificateValidator;
    }

    public async Task<HttpClient> GetClientAsync(Uri uri)
    {
        var host = uri.Host;
        
        await _poolLock.WaitAsync();
        try
        {
            if (_clientPool.TryGetValue(host, out var existingClient))
            {
                return existingClient;
            }

            var handler = new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(5),
                PooledConnectionIdleTimeout = TimeSpan.FromSeconds(30),
                MaxConnectionsPerServer = MaxConnectionsPerHost,
                ConnectTimeout = TimeSpan.FromSeconds(ConnectionTimeoutSeconds),
                AllowAutoRedirect = true,
                MaxAutomaticRedirections = 5
            };

            // Add certificate validation if validator is provided
            if (_certificateValidator != null)
            {
                handler.SslOptions.RemoteCertificateValidationCallback = _certificateValidator.ValidateServerCertificate;
                _logger.LogDebug("Certificate validation enabled for host: {Host}", host);
            }

            var client = new HttpClient(handler)
            {
                Timeout = TimeSpan.FromMinutes(30)
            };

            // Set default headers
            client.DefaultRequestHeaders.Add("User-Agent", DefaultUserAgent);
            client.DefaultRequestHeaders.Add("Accept", "*/*");
            client.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate");
            client.DefaultRequestHeaders.ConnectionClose = false;

            _clientPool.TryAdd(host, client);
            
            _logger.LogInformation("Created new HTTP client for host: {Host}", host);
            
            return client;
        }
        finally
        {
            _poolLock.Release();
        }
    }

    public void ReleaseClient(HttpClient client)
    {
        // Clients are pooled and reused, so we don't dispose them here
        // They will be disposed when the ConnectionManager is disposed
    }

    public async Task<bool> SupportsRangeRequestsAsync(Uri uri)
    {
        try
        {
            var client = await GetClientAsync(uri);
            
            var request = new HttpRequestMessage(HttpMethod.Head, uri);
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
            
            response.EnsureSuccessStatusCode();

            // Check for Accept-Ranges header
            if (response.Headers.TryGetValues("Accept-Ranges", out var values))
            {
                var acceptRanges = values.FirstOrDefault();
                var supportsRange = acceptRanges != null && !acceptRanges.Equals("none", StringComparison.OrdinalIgnoreCase);
                
                _logger.LogInformation(
                    "Range request support for {Uri}: {SupportsRange} (Accept-Ranges: {AcceptRanges})",
                    uri,
                    supportsRange,
                    acceptRanges);
                
                return supportsRange;
            }

            // If no Accept-Ranges header, assume no support
            _logger.LogInformation("No Accept-Ranges header found for {Uri}, assuming no range support", uri);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check range request support for {Uri}", uri);
            return false;
        }
    }

    public HttpRequestMessage CreateRequestWithCookiesAndHeaders(Uri uri, HttpMethod method, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null)
    {
        var request = new HttpRequestMessage(method, uri);

        // Apply cookies if provided
        if (cookies != null && cookies.Any())
        {
            _cookieHeaderManager.ApplyCookiesToRequest(request, cookies);
        }

        // Apply custom headers if provided
        if (headers != null && headers.Any())
        {
            _cookieHeaderManager.ApplyHeadersToRequest(request, headers);
        }

        _logger.LogDebug("Created request with {CookieCount} cookies and {HeaderCount} headers", 
            cookies?.Count ?? 0, headers?.Count ?? 0);

        return request;
    }

    public void Dispose()
    {
        foreach (var client in _clientPool.Values)
        {
            client.Dispose();
        }
        _clientPool.Clear();
        _poolLock.Dispose();
    }
}
