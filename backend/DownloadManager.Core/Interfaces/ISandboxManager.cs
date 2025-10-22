using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ISandboxManager
{
    Task<string> GetSandboxPathAsync(string filename, CancellationToken cancellationToken = default);
    Task<bool> ShouldUseSandboxAsync(string filename, string? mimeType = null, CancellationToken cancellationToken = default);
    Task<ScanResult> ScanAndMoveFromSandboxAsync(string sandboxPath, string destinationPath, CancellationToken cancellationToken = default);
    Task<bool> PromptUserForScanResultAsync(ScanResult scanResult, CancellationToken cancellationToken = default);
    void EnsureSandboxFolderExists();
}
