using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IHlsDownloader
{
    Task<HlsPlaylist> ParsePlaylistAsync(string url, Dictionary<string, string>? headers = null);
    Task<string> DownloadStreamAsync(string playlistUrl, string outputPath, IProgress<DownloadProgress>? progress = null, CancellationToken cancellationToken = default);
    Task<byte[]?> GetDecryptionKeyAsync(HlsEncryption encryption, Dictionary<string, string>? headers = null);
}
