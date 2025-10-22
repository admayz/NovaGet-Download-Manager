namespace DownloadManager.Shared.Models;

public class DownloadTask
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Filename { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public long TotalSize { get; set; }
    public long DownloadedSize { get; set; }
    public DownloadStatus Status { get; set; }
    public string? Category { get; set; }
    public string? MimeType { get; set; }
    public string? Checksum { get; set; }
    public ChecksumAlgorithm? ChecksumAlgorithm { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public long? SpeedLimit { get; set; }
    public int Priority { get; set; }
    public string? Referrer { get; set; }
    public string? UserAgent { get; set; }
    
    // Future cloud sync
    public string? CloudId { get; set; }
    public string? SyncToken { get; set; }
    public DateTime? LastModified { get; set; }
    
    // Navigation properties
    public ICollection<DownloadSegment> Segments { get; set; } = new List<DownloadSegment>();
    public ICollection<MirrorUrl> MirrorUrls { get; set; } = new List<MirrorUrl>();
}

public enum DownloadStatus
{
    Pending,
    Downloading,
    Paused,
    Completed,
    Failed,
    Cancelled
}

public enum ChecksumAlgorithm
{
    MD5,
    SHA256
}
