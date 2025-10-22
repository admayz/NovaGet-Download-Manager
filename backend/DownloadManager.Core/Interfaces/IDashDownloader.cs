using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IDashDownloader
{
    Task<DashManifest> ParseManifestAsync(string url, Dictionary<string, string>? headers = null);
    Task<string> DownloadStreamAsync(string manifestUrl, string outputPath, IProgress<DownloadProgress>? progress = null, CancellationToken cancellationToken = default);
    Task<string> MergeVideoAudioAsync(string videoPath, string audioPath, string outputPath, CancellationToken cancellationToken = default);
}
