using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ICategoryService
{
    /// <summary>
    /// Gets all categories
    /// </summary>
    Task<List<Category>> GetAllCategoriesAsync(CancellationToken ct = default);
    
    /// <summary>
    /// Gets a category by ID
    /// </summary>
    Task<Category?> GetCategoryByIdAsync(int id, CancellationToken ct = default);
    
    /// <summary>
    /// Gets a category by name
    /// </summary>
    Task<Category?> GetCategoryByNameAsync(string name, CancellationToken ct = default);
    
    /// <summary>
    /// Creates a new custom category
    /// </summary>
    Task<Category> CreateCategoryAsync(Category category, CancellationToken ct = default);
    
    /// <summary>
    /// Updates an existing category
    /// </summary>
    Task<Category> UpdateCategoryAsync(Category category, CancellationToken ct = default);
    
    /// <summary>
    /// Deletes a custom category (system categories cannot be deleted)
    /// </summary>
    Task DeleteCategoryAsync(int id, CancellationToken ct = default);
    
    /// <summary>
    /// Detects the appropriate category for a file
    /// </summary>
    Task<string> DetectCategoryForFileAsync(string fileName, string? mimeType = null, CancellationToken ct = default);
    
    /// <summary>
    /// Ensures default categories exist in the database
    /// </summary>
    Task EnsureDefaultCategoriesAsync(CancellationToken ct = default);
}
