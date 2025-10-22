using DownloadManager.Core.Services;

namespace DownloadManager.Core.Interfaces;

public interface ISegmentDownloader
{
    Task DownloadSegmentAsync(
        SegmentInfo segment,
        Stream outputStream,
        IProgress<long> progress,
        CancellationToken ct = default);
}
