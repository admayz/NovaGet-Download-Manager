using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IMirrorManager
{
    Task<List<MirrorUrl>> CheckMirrorHealthAsync(Guid downloadId, CancellationToken ct = default);
    Task<MirrorUrl?> GetBestMirrorAsync(Guid downloadId, CancellationToken ct = default);
    Task<List<MirrorUrl>> GetHealthyMirrorsAsync(Guid downloadId, CancellationToken ct = default);
    Task UpdateMirrorHealthAsync(int mirrorId, bool isHealthy, long responseTimeMs, string? errorMessage = null, CancellationToken ct = default);
}
