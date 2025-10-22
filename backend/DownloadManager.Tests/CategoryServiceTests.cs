using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Services;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using System.Text.Json;

namespace DownloadManager.Tests;

public class CategoryServiceTests
{
    private readonly Mock<ICategoryRepository> _mockCategoryRepository;
    private readonly Mock<ILogger<CategoryService>> _mockLogger;
    private readonly CategoryService _categoryService;

    public CategoryServiceTests()
    {
        _mockCategoryRepository = new Mock<ICategoryRepository>();
        _mockLogger = new Mock<ILogger<CategoryService>>();
        _categoryService = new CategoryService(_mockCategoryRepository.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task CreateCategoryAsync_ValidCategory_CreatesSuccessfully()
    {
        // Arrange
        var categoryData = new CategoryFormData
        {
            Name = "Test Category",
            FolderPath = "/test/path",
            FileExtensions = new List<string> { "test", "tst" },
            MimeTypes = new List<string> { "application/test" },
            Color = "#ff0000",
            Icon = "test-icon"
        };

        var expectedCategory = new Category
        {
            Id = 1,
            Name = categoryData.Name,
            FolderPath = categoryData.FolderPath,
            FileExtensions = JsonSerializer.Serialize(categoryData.FileExtensions),
            MimeTypes = JsonSerializer.Serialize(categoryData.MimeTypes),
            Color = categoryData.Color,
            Icon = categoryData.Icon,
            IsSystem = false
        };

        _mockCategoryRepository.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _mockCategoryRepository.Setup(r => r.CreateAsync(It.IsAny<Category>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedCategory);

        // Act
        var result = await _categoryService.CreateCategoryAsync(
            new Category
            {
                Name = categoryData.Name,
                FolderPath = categoryData.FolderPath,
                FileExtensions = JsonSerializer.Serialize(categoryData.FileExtensions),
                MimeTypes = JsonSerializer.Serialize(categoryData.MimeTypes),
                Color = categoryData.Color,
                Icon = categoryData.Icon
            });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedCategory.Name, result.Name);
        Assert.False(result.IsSystem);
    }

    [Fact]
    public async Task CreateCategoryAsync_DuplicateName_ThrowsException()
    {
        // Arrange
        var category = new Category
        {
            Name = "Existing Category",
            FolderPath = "/test/path",
            FileExtensions = "[]",
            MimeTypes = "[]"
        };

        _mockCategoryRepository.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _categoryService.CreateCategoryAsync(category));
    }

    [Fact]
    public async Task DetectCategoryForFileAsync_CustomCategoryPriority_ReturnsCustomCategory()
    {
        // Arrange
        var categories = new List<Category>
        {
            new Category
            {
                Id = 1,
                Name = "System Documents",
                FolderPath = "/downloads/documents",
                FileExtensions = "[\"pdf\"]",
                IsSystem = true
            },
            new Category
            {
                Id = 2,
                Name = "Custom PDFs",
                FolderPath = "/downloads/custom-pdfs",
                FileExtensions = "[\"pdf\"]",
                IsSystem = false
            },
            new Category
            {
                Id = 3,
                Name = "Other",
                FolderPath = "/downloads/other",
                FileExtensions = "[]",
                IsSystem = true
            }
        };

        _mockCategoryRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(categories);

        // Act
        var result = await _categoryService.DetectCategoryForFileAsync("document.pdf");

        // Assert - Custom category should have priority
        Assert.Equal("Custom PDFs", result);
    }

    [Fact]
    public async Task UpdateCategoryAsync_SystemCategory_OnlyUpdatesAllowedFields()
    {
        // Arrange
        var existingCategory = new Category
        {
            Id = 1,
            Name = "Documents",
            FolderPath = "/old/path",
            FileExtensions = "[\"pdf\"]",
            IsSystem = true,
            Color = "#000000"
        };

        var updatedCategory = new Category
        {
            Id = 1,
            Name = "Modified Documents", // Should not change
            FolderPath = "/new/path",
            FileExtensions = "[\"pdf\",\"doc\"]", // Should not change
            IsSystem = true,
            Color = "#ff0000"
        };

        _mockCategoryRepository.Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingCategory);
        _mockCategoryRepository.Setup(r => r.UpdateAsync(It.IsAny<Category>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Category c, CancellationToken ct) => c);

        // Act
        var result = await _categoryService.UpdateCategoryAsync(updatedCategory);

        // Assert - Only folder path and color should be updated for system categories
        Assert.Equal("/new/path", result.FolderPath);
        Assert.Equal("#ff0000", result.Color);
        Assert.Equal("Documents", result.Name); // Name should not change
    }

    [Fact]
    public async Task DeleteCategoryAsync_SystemCategory_ThrowsException()
    {
        // Arrange
        var systemCategory = new Category
        {
            Id = 1,
            Name = "Documents",
            FolderPath = "/downloads/documents",
            IsSystem = true
        };

        _mockCategoryRepository.Setup(r => r.DeleteAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Cannot delete system categories"));

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _categoryService.DeleteCategoryAsync(1));
    }

    [Fact]
    public async Task DetectCategoryForFileAsync_CaseInsensitive_MatchesCorrectly()
    {
        // Arrange
        var categories = new List<Category>
        {
            new Category
            {
                Id = 1,
                Name = "Documents",
                FolderPath = "/downloads/documents",
                FileExtensions = "[\"pdf\",\"doc\"]",
                IsSystem = true
            },
            new Category
            {
                Id = 2,
                Name = "Other",
                FolderPath = "/downloads/other",
                FileExtensions = "[]",
                IsSystem = true
            }
        };

        _mockCategoryRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(categories);

        // Act - Test with uppercase extension
        var result = await _categoryService.DetectCategoryForFileAsync("DOCUMENT.PDF");

        // Assert
        Assert.Equal("Documents", result);
    }
}

public class CategoryFormData
{
    public string Name { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public List<string> FileExtensions { get; set; } = new();
    public List<string> MimeTypes { get; set; } = new();
    public string Color { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}
