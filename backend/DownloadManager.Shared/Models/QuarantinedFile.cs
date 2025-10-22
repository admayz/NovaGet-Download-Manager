namespace DownloadManager.Shared.Models;

public class QuarantinedFile
{
    public int Id { get; set; }
    public Guid DownloadId { get; set; }
    public string OriginalPath { get; set; } = string.Empty;
    public string QuarantinePath { get; set; } = string.Empty;
    public string? ScanResult { get; set; }
    public DateTime QuarantinedAt { get; set; }
    
    // Navigation property
    public DownloadTask Download { get; set; } = null!;
}
