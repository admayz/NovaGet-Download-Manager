using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IDownloadRecoveryService
{
    Task<List<DownloadTask>> DetectIncompleteDownloadsAsync(CancellationToken ct = default);
    Task RecoverDownloadAsync(Guid downloadId, bool autoResume, CancellationToken ct = default);
    Task CleanupOrphanedFilesAsync(CancellationToken ct = default);
}
