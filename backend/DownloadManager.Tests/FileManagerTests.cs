using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Services;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Tests;

public class FileManagerTests
{
    private readonly Mock<ICategoryRepository> _mockCategoryRepository;
    private readonly Mock<ILogger<FileManager>> _mockLogger;
    private readonly FileManager _fileManager;

    public FileManagerTests()
    {
        _mockCategoryRepository = new Mock<ICategoryRepository>();
        _mockLogger = new Mock<ILogger<FileManager>>();
        _fileManager = new FileManager(_mockCategoryRepository.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task HandleFileConflictAsync_NoConflict_ReturnsSamePath()
    {
        // Arrange
        var filePath = Path.Combine(Path.GetTempPath(), $"test_{Guid.NewGuid()}.txt");

        // Act
        var result = await _fileManager.HandleFileConflictAsync(filePath);

        // Assert
        Assert.Equal(filePath, result);
    }

    [Fact]
    public async Task HandleFileConflictAsync_WithConflict_ReturnsIncrementedPath()
    {
        // Arrange
        var tempDir = Path.GetTempPath();
        var fileName = $"test_{Guid.NewGuid()}.txt";
        var filePath = Path.Combine(tempDir, fileName);
        
        // Create the file to simulate conflict
        File.WriteAllText(filePath, "test");

        try
        {
            // Act
            var result = await _fileManager.HandleFileConflictAsync(filePath);

            // Assert
            Assert.NotEqual(filePath, result);
            Assert.Contains("(1)", result);
        }
        finally
        {
            // Cleanup
            if (File.Exists(filePath))
                File.Delete(filePath);
        }
    }

    [Fact]
    public async Task DetectCategoryAsync_MatchesByExtension_ReturnsCorrectCategory()
    {
        // Arrange
        var categories = new List<Category>
        {
            new Category
            {
                Id = 1,
                Name = "Documents",
                FolderPath = "/downloads/documents",
                FileExtensions = "[\"pdf\",\"doc\",\"docx\"]",
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

        // Act
        var result = await _fileManager.DetectCategoryAsync("document.pdf");

        // Assert
        Assert.Equal("Documents", result);
    }

    [Fact]
    public async Task DetectCategoryAsync_NoMatch_ReturnsOther()
    {
        // Arrange
        var categories = new List<Category>
        {
            new Category
            {
                Id = 1,
                Name = "Documents",
                FolderPath = "/downloads/documents",
                FileExtensions = "[\"pdf\",\"doc\",\"docx\"]",
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

        // Act
        var result = await _fileManager.DetectCategoryAsync("unknown.xyz");

        // Assert
        Assert.Equal("Other", result);
    }

    [Fact]
    public async Task DetectCategoryAsync_MatchesByMimeType_ReturnsCorrectCategory()
    {
        // Arrange
        var categories = new List<Category>
        {
            new Category
            {
                Id = 1,
                Name = "Documents",
                FolderPath = "/downloads/documents",
                FileExtensions = "[\"pdf\"]",
                MimeTypes = "[\"application/pdf\"]",
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

        // Act
        var result = await _fileManager.DetectCategoryAsync("document.unknown", "application/pdf");

        // Assert
        Assert.Equal("Documents", result);
    }

    [Fact]
    public async Task EnsureDirectoryExistsAsync_CreatesDirectory()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), $"test_{Guid.NewGuid()}");
        var filePath = Path.Combine(tempDir, "test.txt");

        try
        {
            // Act
            await _fileManager.EnsureDirectoryExistsAsync(filePath);

            // Assert
            Assert.True(Directory.Exists(tempDir));
        }
        finally
        {
            // Cleanup
            if (Directory.Exists(tempDir))
                Directory.Delete(tempDir, true);
        }
    }
}
