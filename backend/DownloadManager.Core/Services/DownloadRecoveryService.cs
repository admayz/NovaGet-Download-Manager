using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class DownloadRecoveryService : IDownloadRecoveryService
{
    private readonly ILogger<DownloadRecoveryService> _logger;
    private readonly IDownloadRepository _downloadRepository;
    private readonly IDownloadEngine _downloadEngine;

    public DownloadRecoveryService(
        ILogger<DownloadRecoveryService> logger,
        IDownloadRepository downloadRepository,
        IDownloadEngine downloadEngine)
    {
        _logger = logger;
        _downloadRepository = downloadRepository;
        _downloadEngine = downloadEngine;
    }

    public async Task<List<DownloadTask>> DetectIncompleteDownloadsAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Detecting incomplete downloads on startup");

        var incompleteDownloads = await _downloadRepository.GetIncompleteDownloadsAsync(ct);

        _logger.LogInformation("Found {Count} incomplete downloads", incompleteDownloads.Count);

        return incompleteDownloads;
    }

    public async Task RecoverDownloadAsync(Guid downloadId, bool autoResume, CancellationToken ct = default)
    {
        _logger.LogInformation("Recovering download: {DownloadId}, AutoResume: {AutoResume}", 
            downloadId, autoResume);

        var download = await _downloadRepository.GetByIdWithSegmentsAsync(downloadId, ct);

        if (download == null)
        {
            _logger.LogWarning("Download not found for recovery: {DownloadId}", downloadId);
            return;
        }

        if (autoResume)
        {
            // Automatically resume if configured in settings
            if (download.Status == DownloadStatus.Downloading)
            {
                // Was downloading when app closed, set to paused first
                await _downloadRepository.UpdateStatusAsync(downloadId, DownloadStatus.Paused, ct);
            }

            if (download.Status == DownloadStatus.Paused || download.Status == DownloadStatus.Pending)
            {
                await _downloadEngine.ResumeDownloadAsync(downloadId, ct);
                _logger.LogInformation("Auto-resumed download: {DownloadId}", downloadId);
            }
        }
        else
        {
            // Just update status to paused if it was downloading
            if (download.Status == DownloadStatus.Downloading)
            {
                await _downloadRepository.UpdateStatusAsync(downloadId, DownloadStatus.Paused, ct);
                _logger.LogInformation("Set download to paused state: {DownloadId}", downloadId);
            }
        }
    }

    public async Task CleanupOrphanedFilesAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Cleaning up orphaned temporary files");

        var tempPath = Path.GetTempPath();
        var tempFiles = Directory.GetFiles(tempPath, "*.tmp")
            .Where(f => f.Contains(Guid.Empty.ToString().Substring(0, 8))) // Files with GUID pattern
            .ToList();

        var activeDownloads = await _downloadRepository.GetIncompleteDownloadsAsync(ct);
        var activeDownloadIds = activeDownloads.Select(d => d.Id).ToHashSet();

        int cleanedCount = 0;

        foreach (var tempFile in tempFiles)
        {
            try
            {
                var fileName = Path.GetFileNameWithoutExtension(tempFile);
                
                // Try to parse GUID from filename
                if (Guid.TryParse(fileName, out var downloadId))
                {
                    // Check if this download still exists and is incomplete
                    if (!activeDownloadIds.Contains(downloadId))
                    {
                        // Orphaned file - download was completed, cancelled, or deleted
                        File.Delete(tempFile);
                        cleanedCount++;
                        _logger.LogDebug("Deleted orphaned temp file: {FilePath}", tempFile);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete orphaned temp file: {FilePath}", tempFile);
            }
        }

        _logger.LogInformation("Cleaned up {Count} orphaned temporary files", cleanedCount);
    }
}
