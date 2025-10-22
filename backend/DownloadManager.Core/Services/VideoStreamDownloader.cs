using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Services;

public class VideoStreamDownloader : IVideoStreamDownloader
{
    private readonly ILogger<VideoStreamDownloader> _logger;
    private readonly IVideoDetector _videoDetector;
    private readonly IHlsDownloader _hlsDownloader;
    private readonly IDashDownloader _dashDownloader;
    private readonly IConnectionManager _connectionManager;

    public VideoStreamDownloader(
        ILogger<VideoStreamDownloader> logger,
        IVideoDetector videoDetector,
        IHlsDownloader hlsDownloader,
        IDashDownloader dashDownloader,
        IConnectionManager connectionManager)
    {
        _logger = logger;
        _videoDetector = videoDetector;
        _hlsDownloader = hlsDownloader;
        _dashDownloader = dashDownloader;
        _connectionManager = connectionManager;
    }

    public async Task<VideoMetadata> GetVideoMetadataAsync(string url, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null)
    {
        _logger.LogInformation("Getting video metadata for: {Url}", url);

        var isVideo = await _videoDetector.IsVideoUrlAsync(url);
        if (!isVideo)
        {
            throw new InvalidOperationException($"URL is not a video: {url}");
        }

        var metadata = await _videoDetector.ExtractMetadataAsync(url, cookies, headers);
        
        _logger.LogInformation("Retrieved metadata for video: {Title} ({FormatCount} formats)", 
            metadata.Title, metadata.Formats.Count);

        return metadata;
    }

    public async Task<string> DownloadVideoAsync(
        string url, 
        string outputPath, 
        VideoFormat? selectedFormat = null, 
        Dictionary<string, string>? cookies = null, 
        Dictionary<string, string>? headers = null, 
        IProgress<DownloadProgress>? progress = null, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Downloading video from: {Url} to {Output}", url, outputPath);

        // Detect stream type
        var streamType = await _videoDetector.DetectStreamTypeAsync(url);
        
        _logger.LogInformation("Detected stream type: {StreamType}", streamType);

        string result;

        switch (streamType)
        {
            case StreamType.HLS:
                result = await DownloadHlsStreamAsync(url, outputPath, cookies, headers, progress, cancellationToken);
                break;

            case StreamType.DASH:
                result = await DownloadDashStreamAsync(url, outputPath, cookies, headers, progress, cancellationToken);
                break;

            case StreamType.Progressive:
            case StreamType.Unknown:
            default:
                result = await DownloadProgressiveVideoAsync(url, outputPath, cookies, headers, progress, cancellationToken);
                break;
        }

        _logger.LogInformation("Video download completed: {Output}", result);
        return result;
    }

    private async Task<string> DownloadHlsStreamAsync(
        string url, 
        string outputPath, 
        Dictionary<string, string>? cookies, 
        Dictionary<string, string>? headers, 
        IProgress<DownloadProgress>? progress, 
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Downloading HLS stream");
        
        // The HLS downloader will handle cookies and headers internally
        return await _hlsDownloader.DownloadStreamAsync(url, outputPath, progress, cancellationToken);
    }

    private async Task<string> DownloadDashStreamAsync(
        string url, 
        string outputPath, 
        Dictionary<string, string>? cookies, 
        Dictionary<string, string>? headers, 
        IProgress<DownloadProgress>? progress, 
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Downloading DASH stream");
        
        // The DASH downloader will handle cookies and headers internally
        return await _dashDownloader.DownloadStreamAsync(url, outputPath, progress, cancellationToken);
    }

    private async Task<string> DownloadProgressiveVideoAsync(
        string url, 
        string outputPath, 
        Dictionary<string, string>? cookies, 
        Dictionary<string, string>? headers, 
        IProgress<DownloadProgress>? progress, 
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Downloading progressive video");

        var client = await _connectionManager.GetClientAsync(new Uri(url));
        var request = _connectionManager.CreateRequestWithCookiesAndHeaders(
            new Uri(url), 
            HttpMethod.Get, 
            cookies, 
            headers);

        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var totalBytes = response.Content.Headers.ContentLength ?? 0;
        var downloadedBytes = 0L;

        using var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var fileStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);

        var buffer = new byte[81920];
        int bytesRead;

        while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
        {
            await fileStream.WriteAsync(buffer, 0, bytesRead, cancellationToken);
            downloadedBytes += bytesRead;

            progress?.Report(new DownloadProgress
            {
                DownloadId = Guid.Empty,
                TotalBytes = totalBytes,
                DownloadedBytes = downloadedBytes,
                PercentComplete = totalBytes > 0 ? (double)downloadedBytes / totalBytes * 100 : 0
            });
        }

        await fileStream.FlushAsync(cancellationToken);
        
        return outputPath;
    }
}
