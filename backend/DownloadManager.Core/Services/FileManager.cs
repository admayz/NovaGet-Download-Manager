using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Repositories;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Services;

public class FileManager : IFileManager
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ILogger<FileManager> _logger;
    private readonly string _defaultDownloadPath;

    public FileManager(
        ICategoryRepository categoryRepository,
        ILogger<FileManager> logger)
    {
        _categoryRepository = categoryRepository;
        _logger = logger;
        _defaultDownloadPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads");
    }

    public async Task<string> ResolveFilePathAsync(string fileName, string? category = null, CancellationToken ct = default)
    {
        try
        {
            string folderPath;

            if (!string.IsNullOrEmpty(category))
            {
                var categoryEntity = await _categoryRepository.GetByNameAsync(category, ct);
                folderPath = categoryEntity?.FolderPath ?? _defaultDownloadPath;
            }
            else
            {
                // Detect category if not provided
                var detectedCategory = await DetectCategoryAsync(fileName, null, ct);
                var categoryEntity = await _categoryRepository.GetByNameAsync(detectedCategory, ct);
                folderPath = categoryEntity?.FolderPath ?? _defaultDownloadPath;
            }

            await EnsureDirectoryExistsAsync(folderPath, ct);
            
            var filePath = Path.Combine(folderPath, fileName);
            
            // Handle conflicts
            if (File.Exists(filePath))
            {
                filePath = await HandleFileConflictAsync(filePath, ct);
            }

            return filePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving file path for {FileName}", fileName);
            throw;
        }
    }

    public Task<string> HandleFileConflictAsync(string filePath, CancellationToken ct = default)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                return Task.FromResult(filePath);
            }

            var directory = Path.GetDirectoryName(filePath) ?? _defaultDownloadPath;
            var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);
            var extension = Path.GetExtension(filePath);

            int counter = 1;
            string newFilePath;

            do
            {
                var newFileName = $"{fileNameWithoutExtension} ({counter}){extension}";
                newFilePath = Path.Combine(directory, newFileName);
                counter++;
            }
            while (File.Exists(newFilePath));

            _logger.LogInformation("File conflict resolved: {OriginalPath} -> {NewPath}", filePath, newFilePath);
            
            return Task.FromResult(newFilePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling file conflict for {FilePath}", filePath);
            throw;
        }
    }

    public async Task MoveFileAsync(string sourcePath, string destinationPath, CancellationToken ct = default)
    {
        string? backupPath = null;
        
        try
        {
            if (!File.Exists(sourcePath))
            {
                throw new FileNotFoundException($"Source file not found: {sourcePath}");
            }

            // Ensure destination directory exists
            var destinationDir = Path.GetDirectoryName(destinationPath);
            if (!string.IsNullOrEmpty(destinationDir))
            {
                await EnsureDirectoryExistsAsync(destinationDir, ct);
            }

            // If destination exists, create backup
            if (File.Exists(destinationPath))
            {
                backupPath = destinationPath + ".backup";
                File.Move(destinationPath, backupPath, true);
                _logger.LogInformation("Created backup: {BackupPath}", backupPath);
            }

            // Move the file
            File.Move(sourcePath, destinationPath, true);
            _logger.LogInformation("File moved successfully: {Source} -> {Destination}", sourcePath, destinationPath);

            // Delete backup if move was successful
            if (backupPath != null && File.Exists(backupPath))
            {
                File.Delete(backupPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error moving file from {Source} to {Destination}", sourcePath, destinationPath);
            
            // Rollback: restore backup if it exists
            if (backupPath != null && File.Exists(backupPath))
            {
                try
                {
                    if (File.Exists(destinationPath))
                    {
                        File.Delete(destinationPath);
                    }
                    File.Move(backupPath, destinationPath);
                    _logger.LogInformation("Rollback successful: restored from backup");
                }
                catch (Exception rollbackEx)
                {
                    _logger.LogError(rollbackEx, "Rollback failed");
                }
            }
            
            throw;
        }
    }

    public async Task<string> DetectCategoryAsync(string fileName, string? mimeType = null, CancellationToken ct = default)
    {
        try
        {
            var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
            
            var categories = await _categoryRepository.GetAllAsync(ct);
            
            // Try to match by extension first
            foreach (var category in categories.Where(c => c.Name != "Other"))
            {
                if (category.FileExtensions != null)
                {
                    var extensions = System.Text.Json.JsonSerializer.Deserialize<List<string>>(category.FileExtensions);
                    if (extensions != null && extensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                    {
                        _logger.LogDebug("Category detected by extension: {Category} for {FileName}", category.Name, fileName);
                        return category.Name;
                    }
                }
            }

            // Try to match by MIME type if provided
            if (!string.IsNullOrEmpty(mimeType))
            {
                foreach (var category in categories.Where(c => c.Name != "Other"))
                {
                    if (category.MimeTypes != null)
                    {
                        var mimeTypes = System.Text.Json.JsonSerializer.Deserialize<List<string>>(category.MimeTypes);
                        if (mimeTypes != null && mimeTypes.Contains(mimeType, StringComparer.OrdinalIgnoreCase))
                        {
                            _logger.LogDebug("Category detected by MIME type: {Category} for {FileName}", category.Name, fileName);
                            return category.Name;
                        }
                    }
                }
            }

            // Default to "Other" if no match found
            _logger.LogDebug("No category match found, defaulting to 'Other' for {FileName}", fileName);
            return "Other";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting category for {FileName}", fileName);
            return "Other";
        }
    }

    public Task EnsureDirectoryExistsAsync(string filePath, CancellationToken ct = default)
    {
        try
        {
            var directory = Path.GetDirectoryName(filePath);
            
            if (string.IsNullOrEmpty(directory))
            {
                directory = filePath;
            }

            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
                _logger.LogInformation("Created directory: {Directory}", directory);
            }

            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring directory exists for {FilePath}", filePath);
            throw;
        }
    }
}
