namespace DownloadManager.Shared.Models;

public class DownloadRequest
{
    public string Url { get; set; } = string.Empty;
    public List<string> MirrorUrls { get; set; } = new();
    public string? Filename { get; set; }
    public string? SavePath { get; set; }
    public string? Category { get; set; }
    public long? SpeedLimit { get; set; }
    public int Priority { get; set; }
    public string? Referrer { get; set; }
    public Dictionary<string, string> Headers { get; set; } = new();
    public Dictionary<string, string> Cookies { get; set; } = new();
    public bool StartImmediately { get; set; } = true;
    public ScheduleInfo? Schedule { get; set; }
}

public class ScheduleInfo
{
    public DateTime ScheduledTime { get; set; }
    public string? RecurrencePattern { get; set; }
    public string? RecurrenceData { get; set; }
}
