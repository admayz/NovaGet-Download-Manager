namespace DownloadManager.Core.Interfaces;

public interface IFileManager
{
    /// <summary>
    /// Resolves the full file path based on filename and category
    /// </summary>
    Task<string> ResolveFilePathAsync(string fileName, string? category = null, CancellationToken ct = default);
    
    /// <summary>
    /// Handles file name conflicts by adding incremental suffixes
    /// </summary>
    Task<string> HandleFileConflictAsync(string filePath, CancellationToken ct = default);
    
    /// <summary>
    /// Safely moves a file with rollback on failure
    /// </summary>
    Task MoveFileAsync(string sourcePath, string destinationPath, CancellationToken ct = default);
    
    /// <summary>
    /// Detects the category for a file based on extension and MIME type
    /// </summary>
    Task<string> DetectCategoryAsync(string fileName, string? mimeType = null, CancellationToken ct = default);
    
    /// <summary>
    /// Ensures the directory exists for the given file path
    /// </summary>
    Task EnsureDirectoryExistsAsync(string filePath, CancellationToken ct = default);
}
