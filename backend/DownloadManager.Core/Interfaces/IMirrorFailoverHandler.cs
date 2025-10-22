namespace DownloadManager.Core.Interfaces;

public interface IMirrorFailoverHandler
{
    Task<bool> HandleSegmentFailureAsync(int segmentId, string errorMessage, CancellationToken ct = default);
    Task LogFailoverEventAsync(int segmentId, int? oldMirrorId, int? newMirrorId, string reason, CancellationToken ct = default);
}
