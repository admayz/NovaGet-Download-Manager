using Xunit;
using FluentAssertions;
using DownloadManager.Core.Services;
using System.Reflection;

namespace DownloadManager.Tests;

public class SegmentCalculationTests
{
    [Theory]
    [InlineData(1024 * 1024, 8)] // 1MB file -> 8 segments
    [InlineData(10 * 1024 * 1024, 8)] // 10MB file -> 8 segments
    [InlineData(100 * 1024 * 1024, 8)] // 100MB file -> 8 segments
    [InlineData(1024 * 1024 * 1024, 8)] // 1GB file -> 8 segments
    public void CalculateSegments_ShouldReturn8Segments_ForVariousFileSizes(long fileSize, int expectedSegmentCount)
    {
        // Arrange
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        segments.Should().HaveCount(expectedSegmentCount);
    }

    [Fact]
    public void CalculateSegments_ShouldHaveCorrectByteRanges()
    {
        // Arrange
        var fileSize = 8 * 1024 * 1024; // 8MB
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        segments.Should().HaveCount(8);
        
        // First segment should start at 0
        segments[0].StartByte.Should().Be(0);
        
        // Last segment should end at fileSize - 1
        segments[^1].EndByte.Should().Be(fileSize - 1);
        
        // Segments should be contiguous
        for (int i = 0; i < segments.Count - 1; i++)
        {
            segments[i].EndByte.Should().Be(segments[i + 1].StartByte - 1);
        }
    }

    [Fact]
    public void CalculateSegments_ShouldHaveEqualSizedSegments_ExceptLast()
    {
        // Arrange
        var fileSize = 10 * 1024 * 1024; // 10MB
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        var segmentSize = fileSize / 8;
        
        // First 7 segments should have equal size
        for (int i = 0; i < 7; i++)
        {
            var actualSize = segments[i].EndByte - segments[i].StartByte + 1;
            actualSize.Should().Be(segmentSize);
        }
        
        // Last segment may be different to account for remainder
        var lastSegmentSize = segments[7].EndByte - segments[7].StartByte + 1;
        lastSegmentSize.Should().BeGreaterThanOrEqualTo(segmentSize);
    }

    [Fact]
    public void CalculateSegments_ShouldSetCorrectDownloadId()
    {
        // Arrange
        var fileSize = 5 * 1024 * 1024;
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        segments.Should().AllSatisfy(s => s.DownloadId.Should().Be(downloadId));
    }

    [Fact]
    public void CalculateSegments_ShouldSetCorrectSegmentIndices()
    {
        // Arrange
        var fileSize = 8 * 1024 * 1024;
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        for (int i = 0; i < segments.Count; i++)
        {
            segments[i].SegmentIndex.Should().Be(i);
        }
    }

    [Fact]
    public void CalculateSegments_ShouldInitializeSegmentsAsPending()
    {
        // Arrange
        var fileSize = 5 * 1024 * 1024;
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        segments.Should().AllSatisfy(s =>
        {
            s.Status.Should().Be(DownloadManager.Shared.Models.SegmentStatus.Pending);
            s.DownloadedBytes.Should().Be(0);
            s.RetryCount.Should().Be(0);
        });
    }

    [Theory]
    [InlineData(1000, 8)] // Small file
    [InlineData(999999, 8)] // Just under 1MB
    public void CalculateSegments_ShouldHandleSmallFiles(long fileSize, int expectedSegmentCount)
    {
        // Arrange
        var downloadId = Guid.NewGuid();

        // Act
        var segments = InvokeCalculateSegments(fileSize, downloadId);

        // Assert
        segments.Should().HaveCount(expectedSegmentCount);
        
        // Total coverage should equal file size
        var totalCoverage = segments.Sum(s => s.EndByte - s.StartByte + 1);
        totalCoverage.Should().Be(fileSize);
    }

    // Helper method to invoke private CalculateSegments method using reflection
    private List<DownloadManager.Shared.Models.DownloadSegment> InvokeCalculateSegments(long fileSize, Guid downloadId)
    {
        var engineType = typeof(DownloadEngine);
        var method = engineType.GetMethod("CalculateSegments", BindingFlags.NonPublic | BindingFlags.Instance);
        
        if (method == null)
        {
            throw new InvalidOperationException("CalculateSegments method not found");
        }

        // Create a minimal instance for testing (we'll need to mock dependencies)
        var mockLogger = new Moq.Mock<Microsoft.Extensions.Logging.ILogger<DownloadEngine>>();
        var mockDbContextFactory = new Moq.Mock<Microsoft.EntityFrameworkCore.IDbContextFactory<DownloadManager.Core.Data.DownloadManagerDbContext>>();
        var mockRepository = new Moq.Mock<DownloadManager.Core.Interfaces.IDownloadRepository>();
        var mockSegmentDownloader = new Moq.Mock<DownloadManager.Core.Interfaces.ISegmentDownloader>();
        var mockConnectionManager = new Moq.Mock<DownloadManager.Core.Interfaces.IConnectionManager>();
        var mockChecksumValidator = new Moq.Mock<DownloadManager.Core.Interfaces.IChecksumValidator>();
        var mockMirrorManager = new Moq.Mock<DownloadManager.Core.Interfaces.IMirrorManager>();
        var mockSegmentMirrorAssigner = new Moq.Mock<DownloadManager.Core.Interfaces.ISegmentMirrorAssigner>();
        var mockMirrorFailoverHandler = new Moq.Mock<DownloadManager.Core.Interfaces.IMirrorFailoverHandler>();

        var engine = new DownloadEngine(
            mockLogger.Object,
            mockDbContextFactory.Object,
            mockRepository.Object,
            mockSegmentDownloader.Object,
            mockConnectionManager.Object,
            mockChecksumValidator.Object,
            mockMirrorManager.Object,
            mockSegmentMirrorAssigner.Object,
            mockMirrorFailoverHandler.Object
        );

        var result = method.Invoke(engine, new object[] { fileSize, downloadId });
        return (List<DownloadManager.Shared.Models.DownloadSegment>)result!;
    }
}
