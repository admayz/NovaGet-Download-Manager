using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IVideoStreamDownloader
{
    Task<VideoMetadata> GetVideoMetadataAsync(string url, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null);
    Task<string> DownloadVideoAsync(string url, string outputPath, VideoFormat? selectedFormat = null, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null, IProgress<DownloadProgress>? progress = null, CancellationToken cancellationToken = default);
}
