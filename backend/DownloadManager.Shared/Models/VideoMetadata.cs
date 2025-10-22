namespace DownloadManager.Shared.Models;

public class VideoMetadata
{
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Thumbnail { get; set; } = string.Empty;
    public int? Duration { get; set; }
    public string Uploader { get; set; } = string.Empty;
    public DateTime? UploadDate { get; set; }
    public List<VideoFormat> Formats { get; set; } = new();
    public string Site { get; set; } = string.Empty;
    public Dictionary<string, string> Cookies { get; set; } = new();
    public Dictionary<string, string> Headers { get; set; } = new();
}
