using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace DownloadManager.Core.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(
        ICategoryRepository categoryRepository,
        ILogger<CategoryService> logger)
    {
        _categoryRepository = categoryRepository;
        _logger = logger;
    }

    public async Task<List<Category>> GetAllCategoriesAsync(CancellationToken ct = default)
    {
        return await _categoryRepository.GetAllAsync(ct);
    }

    public async Task<Category?> GetCategoryByIdAsync(int id, CancellationToken ct = default)
    {
        return await _categoryRepository.GetByIdAsync(id, ct);
    }

    public async Task<Category?> GetCategoryByNameAsync(string name, CancellationToken ct = default)
    {
        return await _categoryRepository.GetByNameAsync(name, ct);
    }

    public async Task<Category> CreateCategoryAsync(Category category, CancellationToken ct = default)
    {
        // Validate category
        if (string.IsNullOrWhiteSpace(category.Name))
        {
            throw new ArgumentException("Category name is required");
        }

        if (string.IsNullOrWhiteSpace(category.FolderPath))
        {
            throw new ArgumentException("Category folder path is required");
        }

        // Check if category already exists
        if (await _categoryRepository.ExistsAsync(category.Name, ct))
        {
            throw new InvalidOperationException($"Category '{category.Name}' already exists");
        }

        // Ensure it's not marked as system category
        category.IsSystem = false;

        // Validate JSON fields
        ValidateJsonField(category.FileExtensions, "FileExtensions");
        ValidateJsonField(category.MimeTypes, "MimeTypes");

        return await _categoryRepository.CreateAsync(category, ct);
    }

    public async Task<Category> UpdateCategoryAsync(Category category, CancellationToken ct = default)
    {
        var existing = await _categoryRepository.GetByIdAsync(category.Id, ct);
        
        if (existing == null)
        {
            throw new InvalidOperationException($"Category with ID {category.Id} not found");
        }

        if (existing.IsSystem)
        {
            // Only allow updating folder path and color for system categories
            existing.FolderPath = category.FolderPath;
            existing.Color = category.Color;
            return await _categoryRepository.UpdateAsync(existing, ct);
        }

        // Validate JSON fields
        ValidateJsonField(category.FileExtensions, "FileExtensions");
        ValidateJsonField(category.MimeTypes, "MimeTypes");

        return await _categoryRepository.UpdateAsync(category, ct);
    }

    public async Task DeleteCategoryAsync(int id, CancellationToken ct = default)
    {
        await _categoryRepository.DeleteAsync(id, ct);
    }

    public async Task<string> DetectCategoryForFileAsync(string fileName, string? mimeType = null, CancellationToken ct = default)
    {
        try
        {
            var extension = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
            
            var categories = await _categoryRepository.GetAllAsync(ct);
            
            // Sort categories: custom categories first (higher priority), then system categories
            var sortedCategories = categories
                .Where(c => c.Name != "Other")
                .OrderBy(c => c.IsSystem ? 1 : 0)
                .ThenBy(c => c.Name);

            // Try to match by extension first
            foreach (var category in sortedCategories)
            {
                if (!string.IsNullOrEmpty(category.FileExtensions))
                {
                    try
                    {
                        var extensions = JsonSerializer.Deserialize<List<string>>(category.FileExtensions);
                        if (extensions != null && extensions.Any(ext => 
                            string.Equals(ext, extension, StringComparison.OrdinalIgnoreCase)))
                        {
                            _logger.LogDebug("Category detected by extension: {Category} for {FileName}", 
                                category.Name, fileName);
                            return category.Name;
                        }
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Invalid JSON in FileExtensions for category {CategoryName}", 
                            category.Name);
                    }
                }
            }

            // Try to match by MIME type if provided
            if (!string.IsNullOrEmpty(mimeType))
            {
                foreach (var category in sortedCategories)
                {
                    if (!string.IsNullOrEmpty(category.MimeTypes))
                    {
                        try
                        {
                            var mimeTypes = JsonSerializer.Deserialize<List<string>>(category.MimeTypes);
                            if (mimeTypes != null && mimeTypes.Any(mt => 
                                string.Equals(mt, mimeType, StringComparison.OrdinalIgnoreCase)))
                            {
                                _logger.LogDebug("Category detected by MIME type: {Category} for {FileName}", 
                                    category.Name, fileName);
                                return category.Name;
                            }
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogWarning(ex, "Invalid JSON in MimeTypes for category {CategoryName}", 
                                category.Name);
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

    public async Task EnsureDefaultCategoriesAsync(CancellationToken ct = default)
    {
        try
        {
            var existingCategories = await _categoryRepository.GetAllAsync(ct);
            
            if (existingCategories.Any())
            {
                _logger.LogInformation("Default categories already exist");
                return;
            }

            var defaultCategories = GetDefaultCategories();
            
            foreach (var category in defaultCategories)
            {
                await _categoryRepository.CreateAsync(category, ct);
            }

            _logger.LogInformation("Default categories created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring default categories");
            throw;
        }
    }

    private void ValidateJsonField(string? jsonField, string fieldName)
    {
        if (string.IsNullOrEmpty(jsonField))
        {
            return;
        }

        try
        {
            JsonSerializer.Deserialize<List<string>>(jsonField);
        }
        catch (JsonException)
        {
            throw new ArgumentException($"{fieldName} must be a valid JSON array of strings");
        }
    }

    private List<Category> GetDefaultCategories()
    {
        var downloadPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads");

        return new List<Category>
        {
            new Category
            {
                Name = "Video",
                FolderPath = Path.Combine(downloadPath, "Videos"),
                FileExtensions = JsonSerializer.Serialize(new[] { "mp4", "avi", "mkv", "mov", "wmv", "flv", "webm" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "video/mp4", "video/x-msvideo", "video/x-matroska" }),
                IsSystem = true,
                Color = "#ef4444",
                Icon = "video"
            },
            new Category
            {
                Name = "Documents",
                FolderPath = Path.Combine(downloadPath, "Documents"),
                FileExtensions = JsonSerializer.Serialize(new[] { "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
                IsSystem = true,
                Color = "#3b82f6",
                Icon = "document"
            },
            new Category
            {
                Name = "Software",
                FolderPath = Path.Combine(downloadPath, "Software"),
                FileExtensions = JsonSerializer.Serialize(new[] { "exe", "msi", "dmg", "pkg", "deb", "rpm" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "application/x-msdownload", "application/x-msi" }),
                IsSystem = true,
                Color = "#8b5cf6",
                Icon = "software"
            },
            new Category
            {
                Name = "Archives",
                FolderPath = Path.Combine(downloadPath, "Archives"),
                FileExtensions = JsonSerializer.Serialize(new[] { "zip", "rar", "7z", "tar", "gz", "bz2" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "application/zip", "application/x-rar-compressed", "application/x-7z-compressed" }),
                IsSystem = true,
                Color = "#f59e0b",
                Icon = "archive"
            },
            new Category
            {
                Name = "Music",
                FolderPath = Path.Combine(downloadPath, "Music"),
                FileExtensions = JsonSerializer.Serialize(new[] { "mp3", "wav", "flac", "aac", "ogg", "m4a" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "audio/mpeg", "audio/wav", "audio/flac" }),
                IsSystem = true,
                Color = "#10b981",
                Icon = "music"
            },
            new Category
            {
                Name = "Images",
                FolderPath = Path.Combine(downloadPath, "Images"),
                FileExtensions = JsonSerializer.Serialize(new[] { "jpg", "jpeg", "png", "gif", "bmp", "svg", "webp" }),
                MimeTypes = JsonSerializer.Serialize(new[] { "image/jpeg", "image/png", "image/gif" }),
                IsSystem = true,
                Color = "#ec4899",
                Icon = "image"
            },
            new Category
            {
                Name = "Other",
                FolderPath = Path.Combine(downloadPath, "Other"),
                FileExtensions = JsonSerializer.Serialize(Array.Empty<string>()),
                MimeTypes = JsonSerializer.Serialize(Array.Empty<string>()),
                IsSystem = true,
                Color = "#6b7280",
                Icon = "file"
            }
        };
    }
}
