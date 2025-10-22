using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ISecurityScanner
{
    Task<ScanResult> ScanFileAsync(string filePath, CancellationToken cancellationToken = default);
    Task<bool> IsFileSafeAsync(string filePath, CancellationToken cancellationToken = default);
    Task<ScanResult?> GetCachedScanResultAsync(string fileHash, CancellationToken cancellationToken = default);
}
