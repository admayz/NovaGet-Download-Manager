using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IQuarantineManager
{
    Task<QuarantinedFile> QuarantineFileAsync(Guid downloadId, string filePath, ScanResult scanResult, CancellationToken cancellationToken = default);
    Task<List<QuarantinedFile>> GetQuarantinedFilesAsync(CancellationToken cancellationToken = default);
    Task<QuarantinedFile?> GetQuarantinedFileByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> RestoreFileAsync(int quarantineId, string destinationPath, CancellationToken cancellationToken = default);
    Task<bool> DeletePermanentlyAsync(int quarantineId, CancellationToken cancellationToken = default);
    void EnsureQuarantineFolderExists();
}
