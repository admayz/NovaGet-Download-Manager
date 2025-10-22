using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ISegmentMirrorAssigner
{
    Task AssignMirrorsToSegmentsAsync(Guid downloadId, CancellationToken ct = default);
    Task<string?> GetSegmentUrlAsync(DownloadSegment segment, CancellationToken ct = default);
    Task ReassignSegmentMirrorAsync(int segmentId, CancellationToken ct = default);
}
