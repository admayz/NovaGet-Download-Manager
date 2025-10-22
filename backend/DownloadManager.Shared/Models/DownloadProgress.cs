namespace DownloadManager.Shared.Models;

public class DownloadProgress
{
    public Guid DownloadId { get; set; }
    public long TotalBytes { get; set; }
    public long DownloadedBytes { get; set; }
    public double PercentComplete { get; set; }
    public long CurrentSpeed { get; set; } // bytes per second
    public TimeSpan EstimatedTimeRemaining { get; set; }
    public List<SegmentProgress> SegmentProgress { get; set; } = new();
}

public class SegmentProgress
{
    public int SegmentIndex { get; set; }
    public long StartByte { get; set; }
    public long EndByte { get; set; }
    public long DownloadedBytes { get; set; }
    public double PercentComplete { get; set; }
    public SegmentStatus Status { get; set; }
}
