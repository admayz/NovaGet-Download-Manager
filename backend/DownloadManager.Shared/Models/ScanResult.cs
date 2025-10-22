namespace DownloadManager.Shared.Models;

public class ScanResult
{
    public string FilePath { get; set; } = string.Empty;
    public string FileHash { get; set; } = string.Empty;
    public bool IsSafe { get; set; }
    public int PositiveDetections { get; set; }
    public int TotalScans { get; set; }
    public string? ScanId { get; set; }
    public DateTime ScannedAt { get; set; }
    public Dictionary<string, string> DetectionDetails { get; set; } = new();
    public string? ErrorMessage { get; set; }
}
