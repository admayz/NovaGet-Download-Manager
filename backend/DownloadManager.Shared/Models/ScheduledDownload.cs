namespace DownloadManager.Shared.Models;

public class ScheduledDownload
{
    public Guid Id { get; set; }
    public Guid DownloadId { get; set; }
    public DateTime ScheduledTime { get; set; }
    public string? RecurrencePattern { get; set; }
    public string? RecurrenceData { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastRun { get; set; }
    public DateTime? NextRun { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation property
    public DownloadTask Download { get; set; } = null!;
}
