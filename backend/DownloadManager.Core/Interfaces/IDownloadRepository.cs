using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IDownloadRepository
{
    Task<DownloadTask?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DownloadTask?> GetByIdWithSegmentsAsync(Guid id, CancellationToken ct = default);
    Task<List<DownloadTask>> GetAllAsync(DownloadFilter? filter = null, CancellationToken ct = default);
    Task<List<DownloadTask>> GetIncompleteDownloadsAsync(CancellationToken ct = default);
    Task SaveAsync(DownloadTask task, CancellationToken ct = default);
    Task UpdateAsync(DownloadTask task, CancellationToken ct = default);
    Task UpdateProgressAsync(Guid id, long downloadedSize, CancellationToken ct = default);
    Task UpdateStatusAsync(Guid id, DownloadStatus status, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    
    // Segment operations
    Task<List<DownloadSegment>> GetSegmentsAsync(Guid downloadId, CancellationToken ct = default);
    Task SaveSegmentAsync(DownloadSegment segment, CancellationToken ct = default);
    Task UpdateSegmentAsync(DownloadSegment segment, CancellationToken ct = default);
    Task UpdateSegmentProgressAsync(int segmentId, long downloadedBytes, SegmentStatus status, CancellationToken ct = default);
    Task SaveSegmentsAsync(IEnumerable<DownloadSegment> segments, CancellationToken ct = default);
}

public class DownloadFilter
{
    public DownloadStatus? Status { get; set; }
    public string? Category { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? SearchTerm { get; set; }
    public int? Skip { get; set; }
    public int? Take { get; set; }
}
