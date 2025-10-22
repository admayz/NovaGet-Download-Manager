namespace DownloadManager.Shared.Models;

public class DownloadSegment
{
    public int Id { get; set; }
    public Guid DownloadId { get; set; }
    public int SegmentIndex { get; set; }
    public long StartByte { get; set; }
    public long EndByte { get; set; }
    public long DownloadedBytes { get; set; }
    public SegmentStatus Status { get; set; }
    public string? MirrorUrl { get; set; }
    public int? AssignedMirrorId { get; set; }
    public int RetryCount { get; set; }
    public string? ErrorMessage { get; set; }
    
    // Navigation properties
    public DownloadTask Download { get; set; } = null!;
    public MirrorUrl? AssignedMirror { get; set; }
}

public enum SegmentStatus
{
    Pending,
    Downloading,
    Completed,
    Failed
}
