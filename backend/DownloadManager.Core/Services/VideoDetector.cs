using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace DownloadManager.Core.Services;

public class VideoDetector : IVideoDetector
{
    private readonly ILogger<VideoDetector> _logger;
    private readonly IConnectionManager _connectionManager;

    private static readonly Dictionary<string, string[]> VideoSitePatterns = new()
    {
        { "YouTube", new[] { @"youtube\.com", @"youtu\.be" } },
        { "Vimeo", new[] { @"vimeo\.com" } },
        { "Dailymotion", new[] { @"dailymotion\.com", @"dai\.ly" } },
        { "Twitch", new[] { @"twitch\.tv" } },
        { "Facebook", new[] { @"facebook\.com/.*/(videos|watch)" } },
        { "Twitter", new[] { @"twitter\.com/.*/status", @"x\.com/.*/status" } },
        { "Instagram", new[] { @"instagram\.com/(p|reel|tv)" } },
        { "TikTok", new[] { @"tiktok\.com" } }
    };

    private static readonly string[] VideoExtensions = new[]
    {
        ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg"
    };

    public VideoDetector(ILogger<VideoDetector> logger, IConnectionManager connectionManager)
    {
        _logger = logger;
        _connectionManager = connectionManager;
    }

    public async Task<bool> IsVideoUrlAsync(string url)
    {
        try
        {
            // Check if URL matches known video sites
            var siteName = GetSiteName(url);
            if (!string.IsNullOrEmpty(siteName))
            {
                return true;
            }

            // Check if URL has video extension
            if (HasVideoExtension(url))
            {
                return true;
            }

            // Check content type via HEAD request
            var contentType = await GetContentTypeAsync(url);
            if (!string.IsNullOrEmpty(contentType) && contentType.StartsWith("video/"))
            {
                return true;
            }

            // Check for M3U8 or MPD manifest
            if (url.Contains(".m3u8") || url.Contains(".mpd"))
            {
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error detecting video URL: {Url}", url);
            return false;
        }
    }

    public string GetSiteName(string url)
    {
        foreach (var site in VideoSitePatterns)
        {
            foreach (var pattern in site.Value)
            {
                if (Regex.IsMatch(url, pattern, RegexOptions.IgnoreCase))
                {
                    return site.Key;
                }
            }
        }
        return string.Empty;
    }

    public async Task<VideoMetadata> ExtractMetadataAsync(string url, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null)
    {
        _logger.LogInformation("Extracting video metadata from: {Url}", url);

        var metadata = new VideoMetadata
        {
            Url = url,
            Site = GetSiteName(url),
            Cookies = cookies ?? new Dictionary<string, string>(),
            Headers = headers ?? new Dictionary<string, string>()
        };

        try
        {
            var streamType = await DetectStreamTypeAsync(url);

            // For now, create a basic format entry
            // In a real implementation, this would use yt-dlp or similar tool
            var format = new VideoFormat
            {
                FormatId = "default",
                Quality = "best",
                Extension = GetExtensionFromUrl(url),
                Url = url,
                HasVideo = true,
                HasAudio = true,
                Headers = headers ?? new Dictionary<string, string>()
            };

            metadata.Formats.Add(format);
            metadata.Title = ExtractTitleFromUrl(url);

            _logger.LogInformation("Extracted metadata for {Site}: {Title}", metadata.Site, metadata.Title);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting video metadata from: {Url}", url);
            throw;
        }

        return metadata;
    }

    public async Task<StreamType> DetectStreamTypeAsync(string url)
    {
        try
        {
            if (url.Contains(".m3u8"))
            {
                return StreamType.HLS;
            }

            if (url.Contains(".mpd"))
            {
                return StreamType.DASH;
            }

            // Check content type
            var contentType = await GetContentTypeAsync(url);
            if (!string.IsNullOrEmpty(contentType))
            {
                if (contentType.Contains("application/vnd.apple.mpegurl") || 
                    contentType.Contains("application/x-mpegURL"))
                {
                    return StreamType.HLS;
                }

                if (contentType.Contains("application/dash+xml"))
                {
                    return StreamType.DASH;
                }

                if (contentType.StartsWith("video/"))
                {
                    return StreamType.Progressive;
                }
            }

            return StreamType.Unknown;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error detecting stream type for: {Url}", url);
            return StreamType.Unknown;
        }
    }

    private bool HasVideoExtension(string url)
    {
        var uri = new Uri(url);
        var path = uri.AbsolutePath.ToLowerInvariant();
        return VideoExtensions.Any(ext => path.EndsWith(ext));
    }

    private async Task<string> GetContentTypeAsync(string url)
    {
        try
        {
            var client = await _connectionManager.GetClientAsync(new Uri(url));
            var request = new HttpRequestMessage(HttpMethod.Head, url);
            var response = await client.SendAsync(request);

            if (response.Content.Headers.ContentType != null)
            {
                return response.Content.Headers.ContentType.MediaType ?? string.Empty;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not get content type for: {Url}", url);
        }

        return string.Empty;
    }

    private string GetExtensionFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var path = uri.AbsolutePath;
            var extension = Path.GetExtension(path);
            
            if (!string.IsNullOrEmpty(extension))
            {
                return extension.TrimStart('.');
            }

            // Default to mp4 for video URLs
            return "mp4";
        }
        catch
        {
            return "mp4";
        }
    }

    private string ExtractTitleFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var filename = Path.GetFileNameWithoutExtension(uri.AbsolutePath);
            
            if (!string.IsNullOrEmpty(filename) && filename != "/")
            {
                return filename;
            }

            return $"video_{DateTime.Now:yyyyMMddHHmmss}";
        }
        catch
        {
            return $"video_{DateTime.Now:yyyyMMddHHmmss}";
        }
    }
}
