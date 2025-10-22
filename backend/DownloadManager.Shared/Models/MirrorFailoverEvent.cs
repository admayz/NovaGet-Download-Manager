namespace DownloadManager.Shared.Models;

public class MirrorFailoverEvent
{
    public int Id { get; set; }
    public int SegmentId { get; set; }
    public int? OldMirrorId { get; set; }
    public int? NewMirrorId { get; set; }
    public string? OldMirrorUrl { get; set; }
    public string? NewMirrorUrl { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    
    // Navigation properties
    public DownloadSegment Segment { get; set; } = null!;
    public MirrorUrl? OldMirror { get; set; }
    public MirrorUrl? NewMirror { get; set; }
}
