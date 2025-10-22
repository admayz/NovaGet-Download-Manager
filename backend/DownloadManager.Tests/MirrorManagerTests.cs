using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using DownloadManager.Core.Services;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Tests;

public class MirrorManagerTests : IDisposable
{
    private readonly DownloadManagerDbContext _dbContext;
    private readonly Mock<ILogger<MirrorManager>> _mockLogger;
    private readonly Mock<IConnectionManager> _mockConnectionManager;
    private readonly MirrorManager _mirrorManager;

    public MirrorManagerTests()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<DownloadManagerDbContext>()
            .UseInMemoryDatabase(databaseName: databaseName)
            .Options;

        _dbContext = new DownloadManagerDbContext(options);

        var mockFactory = new Mock<IDbContextFactory<DownloadManagerDbContext>>();
        mockFactory.Setup(f => f.CreateDbContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new DownloadManagerDbContext(options));

        _mockLogger = new Mock<ILogger<MirrorManager>>();
        _mockConnectionManager = new Mock<IConnectionManager>();

        _mirrorManager = new MirrorManager(
            _mockLogger.Object,
            mockFactory.Object,
            _mockConnectionManager.Object
        );
    }

    [Fact]
    public async Task GetHealthyMirrorsAsync_ShouldReturnOnlyHealthyMirrors()
    {
        // Arrange
        var downloadId = Guid.NewGuid();
        var download = new DownloadTask
        {
            Id = downloadId,
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var mirrors = new List<MirrorUrl>
        {
            new() { DownloadId = downloadId, Url = "https://mirror1.com/file.zip", Priority = 0, IsHealthy = true, ResponseTimeMs = 100 },
            new() { DownloadId = downloadId, Url = "https://mirror2.com/file.zip", Priority = 1, IsHealthy = false, ResponseTimeMs = 500 },
            new() { DownloadId = downloadId, Url = "https://mirror3.com/file.zip", Priority = 2, IsHealthy = true, ResponseTimeMs = 200 }
        };

        _dbContext.Downloads.Add(download);
        _dbContext.MirrorUrls.AddRange(mirrors);
        await _dbContext.SaveChangesAsync();

        // Act
        var healthyMirrors = await _mirrorManager.GetHealthyMirrorsAsync(downloadId);

        // Assert
        healthyMirrors.Should().HaveCount(2);
        healthyMirrors.Should().AllSatisfy(m => m.IsHealthy.Should().BeTrue());
        healthyMirrors[0].Url.Should().Be("https://mirror1.com/file.zip");
        healthyMirrors[1].Url.Should().Be("https://mirror3.com/file.zip");
    }

    [Fact]
    public async Task GetBestMirrorAsync_ShouldReturnFastestHealthyMirror()
    {
        // Arrange
        var downloadId = Guid.NewGuid();
        var download = new DownloadTask
        {
            Id = downloadId,
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var mirrors = new List<MirrorUrl>
        {
            new() { DownloadId = downloadId, Url = "https://mirror1.com/file.zip", Priority = 2, IsHealthy = true, ResponseTimeMs = 300 },
            new() { DownloadId = downloadId, Url = "https://mirror2.com/file.zip", Priority = 0, IsHealthy = true, ResponseTimeMs = 100 },
            new() { DownloadId = downloadId, Url = "https://mirror3.com/file.zip", Priority = 1, IsHealthy = true, ResponseTimeMs = 200 }
        };

        _dbContext.Downloads.Add(download);
        _dbContext.MirrorUrls.AddRange(mirrors);
        await _dbContext.SaveChangesAsync();

        // Act
        var bestMirror = await _mirrorManager.GetBestMirrorAsync(downloadId);

        // Assert
        bestMirror.Should().NotBeNull();
        bestMirror!.Url.Should().Be("https://mirror2.com/file.zip");
        bestMirror.Priority.Should().Be(0);
    }

    [Fact]
    public async Task UpdateMirrorHealthAsync_ShouldUpdateMirrorStatus()
    {
        // Arrange
        var downloadId = Guid.NewGuid();
        var download = new DownloadTask
        {
            Id = downloadId,
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var mirror = new MirrorUrl
        {
            DownloadId = downloadId,
            Url = "https://mirror1.com/file.zip",
            Priority = 0,
            IsHealthy = true,
            ResponseTimeMs = 100
        };

        _dbContext.Downloads.Add(download);
        _dbContext.MirrorUrls.Add(mirror);
        await _dbContext.SaveChangesAsync();

        // Act
        await _mirrorManager.UpdateMirrorHealthAsync(mirror.Id, false, 5000, "Connection timeout");

        // Assert - Detach and reload to get fresh data
        _dbContext.Entry(mirror).State = EntityState.Detached;
        var updatedMirror = await _dbContext.MirrorUrls.FindAsync(mirror.Id);
        updatedMirror.Should().NotBeNull();
        updatedMirror!.IsHealthy.Should().BeFalse();
        updatedMirror.ResponseTimeMs.Should().Be(5000);
        updatedMirror.ErrorMessage.Should().Be("Connection timeout");
        updatedMirror.LastChecked.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    public void Dispose()
    {
        _dbContext?.Dispose();
    }
}
