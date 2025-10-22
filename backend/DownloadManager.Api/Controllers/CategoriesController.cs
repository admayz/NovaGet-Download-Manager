using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.AspNetCore.Mvc;

namespace DownloadManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly ILogger<CategoriesController> _logger;

    public CategoriesController(
        ICategoryService categoryService,
        ILogger<CategoriesController> logger)
    {
        _categoryService = categoryService;
        _logger = logger;
    }

    /// <summary>
    /// Get all categories
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<Category>>> GetAll(CancellationToken ct)
    {
        try
        {
            var categories = await _categoryService.GetAllCategoriesAsync(ct);
            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all categories");
            return StatusCode(500, new { error = "Failed to retrieve categories" });
        }
    }

    /// <summary>
    /// Get category by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Category>> GetById(int id, CancellationToken ct)
    {
        try
        {
            var category = await _categoryService.GetCategoryByIdAsync(id, ct);
            
            if (category == null)
            {
                return NotFound(new { error = $"Category with ID {id} not found" });
            }

            return Ok(category);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category by ID: {Id}", id);
            return StatusCode(500, new { error = "Failed to retrieve category" });
        }
    }

    /// <summary>
    /// Create a new custom category
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Category>> Create([FromBody] Category category, CancellationToken ct)
    {
        try
        {
            var created = await _categoryService.CreateCategoryAsync(category, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, new { error = "Failed to create category" });
        }
    }

    /// <summary>
    /// Update an existing category
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<Category>> Update(int id, [FromBody] Category category, CancellationToken ct)
    {
        try
        {
            if (id != category.Id)
            {
                return BadRequest(new { error = "ID mismatch" });
            }

            var updated = await _categoryService.UpdateCategoryAsync(category, ct);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category: {Id}", id);
            return StatusCode(500, new { error = "Failed to update category" });
        }
    }

    /// <summary>
    /// Delete a custom category
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            await _categoryService.DeleteCategoryAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category: {Id}", id);
            return StatusCode(500, new { error = "Failed to delete category" });
        }
    }

    /// <summary>
    /// Detect category for a file
    /// </summary>
    [HttpPost("detect")]
    public async Task<ActionResult<string>> DetectCategory(
        [FromBody] DetectCategoryRequest request, 
        CancellationToken ct)
    {
        try
        {
            var category = await _categoryService.DetectCategoryForFileAsync(
                request.FileName, 
                request.MimeType, 
                ct);
            
            return Ok(new { category });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting category for file: {FileName}", request.FileName);
            return StatusCode(500, new { error = "Failed to detect category" });
        }
    }
}

public class DetectCategoryRequest
{
    public string FileName { get; set; } = string.Empty;
    public string? MimeType { get; set; }
}
