using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;

namespace DownloadManager.Core.Services;

public class SegmentDownloader : ISegmentDownloader
{
    private readonly ILogger<SegmentDownloader> _logger;
    private readonly IConnectionManager _connectionManager;
    private readonly IRetryPolicy _retryPolicy;
    private readonly GlobalSpeedLimiter _globalSpeedLimiter;
    private const int BufferSize = 65536; // 64KB buffer

    public SegmentDownloader(
        ILogger<SegmentDownloader> logger,
        IConnectionManager connectionManager,
        IRetryPolicy retryPolicy,
        GlobalSpeedLimiter globalSpeedLimiter)
    {
        _logger = logger;
        _connectionManager = connectionManager;
        _retryPolicy = retryPolicy;
        _globalSpeedLimiter = globalSpeedLimiter;
    }

    public int? CurrentSegmentId { get; set; }
    public int? CurrentMirrorId { get; set; }

    public async Task DownloadSegmentAsync(
        SegmentInfo segment,
        Stream outputStream,
        IProgress<long> progress,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Downloading segment {SegmentIndex} from {StartByte} to {EndByte}",
            segment.SegmentIndex,
            segment.StartByte,
            segment.EndByte);

        await _retryPolicy.ExecuteAsync(async () =>
        {
            using var client = await _connectionManager.GetClientAsync(new Uri(segment.Url));
            
            var request = new HttpRequestMessage(HttpMethod.Get, segment.Url);
            request.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(
                segment.StartByte,
                segment.EndByte);

            using var response = await client.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                ct);

            response.EnsureSuccessStatusCode();

            await using var contentStream = await response.Content.ReadAsStreamAsync(ct);
            
            var buffer = new byte[BufferSize];
            long totalBytesRead = 0;
            long bytesToRead = segment.EndByte - segment.StartByte + 1;
            
            // Create per-download speed limiter if configured
            ISpeedLimiter? perDownloadLimiter = segment.SpeedLimit.HasValue && segment.SpeedLimit.Value > 0
                ? new SpeedLimiter(segment.SpeedLimit.Value)
                : null;

            while (totalBytesRead < bytesToRead)
            {
                ct.ThrowIfCancellationRequested();

                var bytesToReadNow = (int)Math.Min(buffer.Length, bytesToRead - totalBytesRead);
                var bytesRead = await contentStream.ReadAsync(buffer.AsMemory(0, bytesToReadNow), ct);

                if (bytesRead == 0)
                {
                    break;
                }

                // Apply per-download speed limiting first
                if (perDownloadLimiter != null)
                {
                    await perDownloadLimiter.ThrottleAsync(bytesRead, ct);
                }

                // Apply global speed limiting
                await _globalSpeedLimiter.ThrottleAsync(bytesRead, ct);

                // Write to output stream at correct position
                lock (outputStream)
                {
                    outputStream.Seek(segment.StartByte + totalBytesRead, SeekOrigin.Begin);
                    outputStream.Write(buffer, 0, bytesRead);
                }

                totalBytesRead += bytesRead;
                progress?.Report(totalBytesRead);
            }

            _logger.LogInformation(
                "Segment {SegmentIndex} completed. Downloaded {TotalBytes} bytes",
                segment.SegmentIndex,
                totalBytesRead);
        }, ct);
    }
}
