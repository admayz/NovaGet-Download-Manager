using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly DownloadManagerDbContext _context;
    private readonly ILogger<CategoryRepository> _logger;

    public CategoryRepository(
        DownloadManagerDbContext context,
        ILogger<CategoryRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Category?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        try
        {
            return await _context.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category by ID: {Id}", id);
            throw;
        }
    }

    public async Task<Category?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        try
        {
            return await _context.Categories
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Name == name, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category by name: {Name}", name);
            throw;
        }
    }

    public async Task<List<Category>> GetAllAsync(CancellationToken ct = default)
    {
        try
        {
            return await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .ToListAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all categories");
            throw;
        }
    }

    public async Task<Category> CreateAsync(Category category, CancellationToken ct = default)
    {
        try
        {
            _context.Categories.Add(category);
            await _context.SaveChangesAsync(ct);
            
            _logger.LogInformation("Category created: {Name}", category.Name);
            return category;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category: {Name}", category.Name);
            throw;
        }
    }

    public async Task<Category> UpdateAsync(Category category, CancellationToken ct = default)
    {
        try
        {
            _context.Categories.Update(category);
            await _context.SaveChangesAsync(ct);
            
            _logger.LogInformation("Category updated: {Name}", category.Name);
            return category;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category: {Name}", category.Name);
            throw;
        }
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        try
        {
            var category = await _context.Categories.FindAsync(new object[] { id }, ct);
            
            if (category == null)
            {
                throw new InvalidOperationException($"Category with ID {id} not found");
            }

            if (category.IsSystem)
            {
                throw new InvalidOperationException("Cannot delete system categories");
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync(ct);
            
            _logger.LogInformation("Category deleted: {Name}", category.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category: {Id}", id);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(string name, CancellationToken ct = default)
    {
        try
        {
            return await _context.Categories
                .AnyAsync(c => c.Name == name, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if category exists: {Name}", name);
            throw;
        }
    }
}
