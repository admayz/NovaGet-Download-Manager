using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IDownloadEngine
{
    Task<Guid> StartDownloadAsync(DownloadRequest request, CancellationToken ct = default);
    Task PauseDownloadAsync(Guid downloadId, CancellationToken ct = default);
    Task ResumeDownloadAsync(Guid downloadId, CancellationToken ct = default);
    Task CancelDownloadAsync(Guid downloadId, CancellationToken ct = default);
    Task<DownloadStatus> GetStatusAsync(Guid downloadId, CancellationToken ct = default);
    IObservable<DownloadProgress> ObserveProgress(Guid downloadId);
}
