namespace DownloadManager.Shared.Models;

public class FileScanCache
{
    public int Id { get; set; }
    public string FileHash { get; set; } = string.Empty;
    public bool IsSafe { get; set; }
    public int PositiveDetections { get; set; }
    public int TotalScans { get; set; }
    public string? ScanResultJson { get; set; }
    public DateTime ScannedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
