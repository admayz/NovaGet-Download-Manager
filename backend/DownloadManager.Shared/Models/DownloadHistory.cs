namespace DownloadManager.Shared.Models;

public class DownloadHistory
{
    public int Id { get; set; }
    public Guid DownloadId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? EventData { get; set; }
    public DateTime Timestamp { get; set; }
    
    // Navigation property
    public DownloadTask Download { get; set; } = null!;
}
