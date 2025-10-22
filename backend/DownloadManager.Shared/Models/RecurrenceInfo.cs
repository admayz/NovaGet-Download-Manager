namespace DownloadManager.Shared.Models;

public class RecurrenceInfo
{
    public RecurrenceType Type { get; set; }
    public int Interval { get; set; } = 1;
    public List<DayOfWeek>? DaysOfWeek { get; set; }
    public int? DayOfMonth { get; set; }
    public TimeSpan? TimeOfDay { get; set; }
    public string? CronExpression { get; set; }
}

public enum RecurrenceType
{
    None,
    Daily,
    Weekly,
    Monthly,
    Custom
}
