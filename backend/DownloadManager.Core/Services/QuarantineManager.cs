using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class QuarantineManager : IQuarantineManager
{
    private readonly DownloadManagerDbContext _dbContext;
    private readonly ILogger<QuarantineManager> _logger;
    private readonly string _quarantineFolder;

    public QuarantineManager(
        DownloadManagerDbContext dbContext,
        ILogger<QuarantineManager> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
        _quarantineFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads",
            ".quarantine"
        );
        EnsureQuarantineFolderExists();
    }

    public void EnsureQuarantineFolderExists()
    {
        if (!Directory.Exists(_quarantineFolder))
        {
            Directory.CreateDirectory(_quarantineFolder);
            _logger.LogInformation("Created quarantine folder at {QuarantineFolder}", _quarantineFolder);
            
            // Set folder as hidden
            try
            {
                var dirInfo = new DirectoryInfo(_quarantineFolder);
                dirInfo.Attributes |= FileAttributes.Hidden;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to set quarantine folder as hidden");
            }
        }
    }

    public async Task<QuarantinedFile> QuarantineFileAsync(
        Guid downloadId,
        string filePath,
        ScanResult scanResult,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"File not found: {filePath}");
            }

            // Generate quarantine file path
            var fileName = Path.GetFileName(filePath);
            var quarantinePath = Path.Combine(_quarantineFolder, $"{Guid.NewGuid()}_{fileName}");

            _logger.LogWarning("Quarantining file {FilePath} to {QuarantinePath}. Detections: {Detections}/{Total}",
                filePath, quarantinePath, scanResult.PositiveDetections, scanResult.TotalScans);

            // Move file to quarantine
            File.Move(filePath, quarantinePath, overwrite: false);

            // Create quarantine record
            var quarantinedFile = new QuarantinedFile
            {
                DownloadId = downloadId,
                OriginalPath = filePath,
                QuarantinePath = quarantinePath,
                ScanResult = JsonSerializer.Serialize(scanResult),
                QuarantinedAt = DateTime.UtcNow
            };

            _dbContext.QuarantinedFiles.Add(quarantinedFile);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("File quarantined successfully with ID {Id}", quarantinedFile.Id);

            return quarantinedFile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error quarantining file {FilePath}", filePath);
            throw;
        }
    }

    public async Task<List<QuarantinedFile>> GetQuarantinedFilesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _dbContext.QuarantinedFiles
                .Include(q => q.Download)
                .OrderByDescending(q => q.QuarantinedAt)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quarantined files");
            throw;
        }
    }

    public async Task<QuarantinedFile?> GetQuarantinedFileByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _dbContext.QuarantinedFiles
                .Include(q => q.Download)
                .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quarantined file with ID {Id}", id);
            throw;
        }
    }

    public async Task<bool> RestoreFileAsync(int quarantineId, string destinationPath, CancellationToken cancellationToken = default)
    {
        try
        {
            var quarantinedFile = await GetQuarantinedFileByIdAsync(quarantineId, cancellationToken);
            if (quarantinedFile == null)
            {
                _logger.LogWarning("Quarantined file with ID {Id} not found", quarantineId);
                return false;
            }

            if (!File.Exists(quarantinedFile.QuarantinePath))
            {
                _logger.LogError("Quarantined file not found at {QuarantinePath}", quarantinedFile.QuarantinePath);
                return false;
            }

            // Ensure destination directory exists
            var destinationDir = Path.GetDirectoryName(destinationPath);
            if (!string.IsNullOrEmpty(destinationDir) && !Directory.Exists(destinationDir))
            {
                Directory.CreateDirectory(destinationDir);
            }

            _logger.LogInformation("Restoring quarantined file {Id} from {QuarantinePath} to {DestinationPath}",
                quarantineId, quarantinedFile.QuarantinePath, destinationPath);

            // Move file back from quarantine
            File.Move(quarantinedFile.QuarantinePath, destinationPath, overwrite: true);

            // Remove quarantine record
            _dbContext.QuarantinedFiles.Remove(quarantinedFile);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("File restored successfully from quarantine");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring file from quarantine with ID {Id}", quarantineId);
            return false;
        }
    }

    public async Task<bool> DeletePermanentlyAsync(int quarantineId, CancellationToken cancellationToken = default)
    {
        try
        {
            var quarantinedFile = await GetQuarantinedFileByIdAsync(quarantineId, cancellationToken);
            if (quarantinedFile == null)
            {
                _logger.LogWarning("Quarantined file with ID {Id} not found", quarantineId);
                return false;
            }

            _logger.LogInformation("Permanently deleting quarantined file {Id} at {QuarantinePath}",
                quarantineId, quarantinedFile.QuarantinePath);

            // Delete the physical file
            if (File.Exists(quarantinedFile.QuarantinePath))
            {
                File.Delete(quarantinedFile.QuarantinePath);
            }

            // Remove quarantine record
            _dbContext.QuarantinedFiles.Remove(quarantinedFile);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Quarantined file deleted permanently");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error permanently deleting quarantined file with ID {Id}", quarantineId);
            return false;
        }
    }
}
