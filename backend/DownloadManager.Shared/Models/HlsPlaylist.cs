namespace DownloadManager.Shared.Models;

public class HlsPlaylist
{
    public string Url { get; set; } = string.Empty;
    public bool IsMasterPlaylist { get; set; }
    public List<HlsVariant> Variants { get; set; } = new();
    public List<HlsSegment> Segments { get; set; } = new();
    public int? TargetDuration { get; set; }
    public int? MediaSequence { get; set; }
    public bool IsEncrypted { get; set; }
    public HlsEncryption? Encryption { get; set; }
}

public class HlsVariant
{
    public string Url { get; set; } = string.Empty;
    public int? Bandwidth { get; set; }
    public string Resolution { get; set; } = string.Empty;
    public string Codecs { get; set; } = string.Empty;
}

public class HlsSegment
{
    public string Url { get; set; } = string.Empty;
    public double Duration { get; set; }
    public int Sequence { get; set; }
}

public class HlsEncryption
{
    public string Method { get; set; } = string.Empty;
    public string KeyUrl { get; set; } = string.Empty;
    public string? Iv { get; set; }
    public byte[]? Key { get; set; }
}
