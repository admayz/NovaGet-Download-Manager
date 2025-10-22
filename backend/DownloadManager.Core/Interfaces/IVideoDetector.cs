using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IVideoDetector
{
    Task<bool> IsVideoUrlAsync(string url);
    Task<VideoMetadata> ExtractMetadataAsync(string url, Dictionary<string, string>? cookies = null, Dictionary<string, string>? headers = null);
    Task<StreamType> DetectStreamTypeAsync(string url);
    string GetSiteName(string url);
}
