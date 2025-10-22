namespace DownloadManager.Shared.Models;

public class DashManifest
{
    public string Url { get; set; } = string.Empty;
    public List<DashAdaptationSet> AdaptationSets { get; set; } = new();
    public int? MinBufferTime { get; set; }
    public string? MediaPresentationDuration { get; set; }
}

public class DashAdaptationSet
{
    public string Id { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty; // video or audio
    public string MimeType { get; set; } = string.Empty;
    public List<DashRepresentation> Representations { get; set; } = new();
}

public class DashRepresentation
{
    public string Id { get; set; } = string.Empty;
    public int? Bandwidth { get; set; }
    public string Codecs { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? AudioSamplingRate { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public DashSegmentInfo? SegmentInfo { get; set; }
}

public class DashSegmentInfo
{
    public string InitializationUrl { get; set; } = string.Empty;
    public string MediaUrlTemplate { get; set; } = string.Empty;
    public int StartNumber { get; set; } = 1;
    public int Timescale { get; set; } = 1;
    public int Duration { get; set; }
    public List<string> SegmentUrls { get; set; } = new();
}
