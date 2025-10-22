namespace DownloadManager.Shared.Models;

public class MirrorUrl
{
    public int Id { get; set; }
    public Guid DownloadId { get; set; }
    public string Url { get; set; } = string.Empty;
    public int Priority { get; set; }
    public long ResponseTimeMs { get; set; }
    public DateTime? LastChecked { get; set; }
    public bool IsHealthy { get; set; } = true;
    public string? ErrorMessage { get; set; }
    
    // Navigation property
    public DownloadTask Download { get; set; } = null!;
}
