namespace DownloadManager.Shared.Models;

public class VideoFormat
{
    public string FormatId { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public long? FileSize { get; set; }
    public string Resolution { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string VideoCodec { get; set; } = string.Empty;
    public string AudioCodec { get; set; } = string.Empty;
    public int? Bitrate { get; set; }
    public int? Fps { get; set; }
    public bool HasVideo { get; set; }
    public bool HasAudio { get; set; }
    public string Url { get; set; } = string.Empty;
    public Dictionary<string, string> Headers { get; set; } = new();
}
