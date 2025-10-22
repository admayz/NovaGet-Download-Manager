using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using DownloadManager.Core.Services;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Repositories;
using DownloadManager.Shared.Models;

namespace DownloadManager.Tests;

public class PauseResumeStateTests : IDisposable
{
    private readonly DownloadManagerDbContext _dbContext;
    private readonly Mock<ILogger<DownloadEngine>> _mockLogger;
    private readonly Mock<IDownloadRepository> _mockRepository;
    private readonly Mock<ISegmentDownloader> _mockSegmentDownloader;
    private readonly Mock<IConnectionManager> _mockConnectionManager;
    private readonly Mock<IChecksumValidator> _mockChecksumValidator;
    private readonly DownloadEngine _downloadEngine;

    public PauseResumeStateTests()
    {
        // Create in-memory database with a fixed name so all contexts share the same database
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<DownloadManagerDbContext>()
            .UseInMemoryDatabase(databaseName: databaseName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _dbContext = new DownloadManagerDbContext(options);

        // Create mock factory that returns a NEW context each time, but using the same database
        var mockFactory = new Mock<IDbContextFactory<DownloadManagerDbContext>>();
        mockFactory.Setup(f => f.CreateDbContextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new DownloadManagerDbContext(options));

        _mockLogger = new Mock<ILogger<DownloadEngine>>();
        
        // Use real repository
        var mockRepoLogger = new Mock<ILogger<DownloadRepository>>();
        var realRepository = new DownloadRepository(mockFactory.Object, mockRepoLogger.Object);
        _mockRepository = new Mock<IDownloadRepository>();
        
        // Setup mock to delegate to real repository
        _mockRepository.Setup(r => r.GetByIdWithSegmentsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns<Guid, CancellationToken>((id, ct) => realRepository.GetByIdWithSegmentsAsync(id, ct));
        _mockRepository.Setup(r => r.UpdateStatusAsync(It.IsAny<Guid>(), It.IsAny<DownloadStatus>(), It.IsAny<CancellationToken>()))
            .Returns<Guid, DownloadStatus, CancellationToken>((id, status, ct) => realRepository.UpdateStatusAsync(id, status, ct));
        
        _mockSegmentDownloader = new Mock<ISegmentDownloader>();
        _mockConnectionManager = new Mock<IConnectionManager>();
        _mockChecksumValidator = new Mock<IChecksumValidator>();
        
        // Setup connection manager to return true for range support
        _mockConnectionManager.Setup(c => c.SupportsRangeRequestsAsync(It.IsAny<Uri>()))
            .ReturnsAsync(true);

        var mockMirrorManager = new Mock<IMirrorManager>();
        var mockSegmentMirrorAssigner = new Mock<ISegmentMirrorAssigner>();
        var mockMirrorFailoverHandler = new Mock<IMirrorFailoverHandler>();

        _downloadEngine = new DownloadEngine(
            _mockLogger.Object,
            mockFactory.Object,
            _mockRepository.Object,
            _mockSegmentDownloader.Object,
            _mockConnectionManager.Object,
            _mockChecksumValidator.Object,
            mockMirrorManager.Object,
            mockSegmentMirrorAssigner.Object,
            mockMirrorFailoverHandler.Object
        );
    }

    [Fact]
    public async Task StartDownloadAsync_ShouldCreateDownload_WithPendingStatus()
    {
        // Arrange
        var request = new DownloadRequest
        {
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            StartImmediately = false
        };

        // Act
        var downloadId = await _downloadEngine.StartDownloadAsync(request);

        // Assert
        var download = await _dbContext.Downloads.FindAsync(downloadId);
        download.Should().NotBeNull();
        download!.Status.Should().Be(DownloadStatus.Pending);
        download.Url.Should().Be(request.Url);
        download.Filename.Should().Be(request.Filename);
    }

    [Fact]
    public async Task PauseDownloadAsync_ShouldChangeStatus_FromDownloadingToPaused()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Downloading,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act
        await _downloadEngine.PauseDownloadAsync(download.Id);

        // Assert - Detach and query again to get fresh data from database
        _dbContext.Entry(download).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
        var updatedDownload = await _dbContext.Downloads.FindAsync(download.Id);
        updatedDownload.Should().NotBeNull();
        updatedDownload!.Status.Should().Be(DownloadStatus.Paused);
    }

    [Fact]
    public async Task ResumeDownloadAsync_ShouldChangeStatus_FromPausedToPending()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Paused,
            Priority = 5,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Mock repository to return download with segments
        _mockRepository.Setup(r => r.GetByIdWithSegmentsAsync(download.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(download);

        // Act
        await _downloadEngine.ResumeDownloadAsync(download.Id);

        // Assert - Reload from database to get updated status
        _dbContext.Entry(download).Reload();
        download.Status.Should().Be(DownloadStatus.Pending);
    }

    [Fact]
    public async Task ResumeDownloadAsync_ShouldNotResume_IfNotPaused()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act
        await _downloadEngine.ResumeDownloadAsync(download.Id);

        // Assert
        var updatedDownload = await _dbContext.Downloads.FindAsync(download.Id);
        updatedDownload.Should().NotBeNull();
        updatedDownload!.Status.Should().Be(DownloadStatus.Completed); // Should remain completed
    }

    [Fact]
    public async Task CancelDownloadAsync_ShouldChangeStatus_ToCancelled()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Downloading,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act
        await _downloadEngine.CancelDownloadAsync(download.Id);

        // Assert - Reload from database to get updated status
        _dbContext.Entry(download).Reload();
        download.Status.Should().Be(DownloadStatus.Cancelled);
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReturnCurrentStatus()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Downloading,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act
        var status = await _downloadEngine.GetStatusAsync(download.Id);

        // Assert
        status.Should().Be(DownloadStatus.Downloading);
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReturnFailed_ForNonExistentDownload()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var status = await _downloadEngine.GetStatusAsync(nonExistentId);

        // Assert
        status.Should().Be(DownloadStatus.Failed);
    }

    [Fact]
    public async Task StateTransition_ShouldFollowValidFlow_PendingToDownloadingToPaused()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act & Assert - Pending
        var status1 = await _downloadEngine.GetStatusAsync(download.Id);
        status1.Should().Be(DownloadStatus.Pending);

        // Simulate download starting (would normally happen in ExecuteDownloadAsync)
        download.Status = DownloadStatus.Downloading;
        await _dbContext.SaveChangesAsync();

        // Act & Assert - Downloading
        var status2 = await _downloadEngine.GetStatusAsync(download.Id);
        status2.Should().Be(DownloadStatus.Downloading);

        // Pause
        await _downloadEngine.PauseDownloadAsync(download.Id);
        _dbContext.Entry(download).Reload();

        // Act & Assert - Paused
        var status3 = await _downloadEngine.GetStatusAsync(download.Id);
        status3.Should().Be(DownloadStatus.Paused);
    }

    [Fact]
    public async Task StateTransition_ShouldFollowValidFlow_PausedToResumedToCompleted()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Paused,
            Priority = 1,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Mock repository to return download with segments
        _mockRepository.Setup(r => r.GetByIdWithSegmentsAsync(download.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(download);

        // Act & Assert - Paused
        var status1 = await _downloadEngine.GetStatusAsync(download.Id);
        status1.Should().Be(DownloadStatus.Paused);

        // Resume
        await _downloadEngine.ResumeDownloadAsync(download.Id);
        _dbContext.Entry(download).Reload();

        // Act & Assert - Pending (ready to download)
        var status2 = await _downloadEngine.GetStatusAsync(download.Id);
        status2.Should().Be(DownloadStatus.Pending);

        // Simulate completion
        download.Status = DownloadStatus.Completed;
        await _dbContext.SaveChangesAsync();

        // Act & Assert - Completed
        var status3 = await _downloadEngine.GetStatusAsync(download.Id);
        status3.Should().Be(DownloadStatus.Completed);
    }

    [Fact]
    public async Task StateTransition_ShouldAllowCancellation_FromAnyState()
    {
        // Test cancellation from different states
        var states = new[]
        {
            DownloadStatus.Pending,
            DownloadStatus.Downloading,
            DownloadStatus.Paused
        };

        foreach (var initialState in states)
        {
            // Arrange
            var download = new DownloadTask
            {
                Id = Guid.NewGuid(),
                Url = "https://example.com/file.zip",
                Filename = $"file_{initialState}.zip",
                Status = initialState,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Downloads.Add(download);
            await _dbContext.SaveChangesAsync();

            // Act
            await _downloadEngine.CancelDownloadAsync(download.Id);

            // Assert
            var status = await _downloadEngine.GetStatusAsync(download.Id);
            status.Should().Be(DownloadStatus.Cancelled, 
                $"should be able to cancel from {initialState} state");
        }
    }

    [Fact]
    public async Task PauseDownloadAsync_ShouldBeIdempotent()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Downloading,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Act - Pause multiple times
        await _downloadEngine.PauseDownloadAsync(download.Id);
        _dbContext.Entry(download).Reload();
        await _downloadEngine.PauseDownloadAsync(download.Id);
        _dbContext.Entry(download).Reload();
        await _downloadEngine.PauseDownloadAsync(download.Id);

        // Assert
        var status = await _downloadEngine.GetStatusAsync(download.Id);
        status.Should().Be(DownloadStatus.Paused);
    }

    [Fact]
    public async Task ResumeDownloadAsync_ShouldBeIdempotent_WhenAlreadyPending()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Paused,
            Priority = 1,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Downloads.Add(download);
        await _dbContext.SaveChangesAsync();

        // Mock repository to return download with segments
        _mockRepository.Setup(r => r.GetByIdWithSegmentsAsync(download.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(download);

        // Act - Resume multiple times
        await _downloadEngine.ResumeDownloadAsync(download.Id);
        _dbContext.Entry(download).Reload();
        await _downloadEngine.ResumeDownloadAsync(download.Id);

        // Assert
        var status = await _downloadEngine.GetStatusAsync(download.Id);
        status.Should().Be(DownloadStatus.Pending);
    }

    [Fact]
    public async Task DownloadWithSegments_ShouldPersistSegmentState()
    {
        // Arrange
        var download = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = "https://example.com/file.zip",
            Filename = "file.zip",
            Status = DownloadStatus.Downloading,
            TotalSize = 1024 * 1024,
            CreatedAt = DateTime.UtcNow
        };

        var segments = new List<DownloadSegment>
        {
            new() { DownloadId = download.Id, SegmentIndex = 0, StartByte = 0, EndByte = 511999, 
                    Status = SegmentStatus.Downloading, DownloadedBytes = 256000 },
            new() { DownloadId = download.Id, SegmentIndex = 1, StartByte = 512000, EndByte = 1048575, 
                    Status = SegmentStatus.Pending, DownloadedBytes = 0 }
        };

        _dbContext.Downloads.Add(download);
        _dbContext.DownloadSegments.AddRange(segments);
        await _dbContext.SaveChangesAsync();

        // Act - Pause download
        await _downloadEngine.PauseDownloadAsync(download.Id);

        // Assert - Segments should still exist with their state
        var savedSegments = await _dbContext.DownloadSegments
            .Where(s => s.DownloadId == download.Id)
            .OrderBy(s => s.SegmentIndex)
            .ToListAsync();

        savedSegments.Should().HaveCount(2);
        savedSegments[0].DownloadedBytes.Should().Be(256000);
        savedSegments[1].DownloadedBytes.Should().Be(0);
    }

    public void Dispose()
    {
        _dbContext?.Dispose();
    }
}
