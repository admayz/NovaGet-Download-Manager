using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Services;
using DownloadManager.Shared.Models;
using System.Text;

namespace DownloadManager.Tests;

public class ChecksumValidatorTests
{
    private readonly Mock<ILogger<ChecksumValidator>> _mockLogger;
    private readonly ChecksumValidator _checksumValidator;

    public ChecksumValidatorTests()
    {
        _mockLogger = new Mock<ILogger<ChecksumValidator>>();
        _checksumValidator = new ChecksumValidator(_mockLogger.Object);
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldComputeSHA256_ForKnownContent()
    {
        // Arrange
        var content = "Hello, World!";
        var expectedChecksum = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var actualChecksum = await _checksumValidator.ComputeChecksumAsync(
            stream,
            ChecksumAlgorithm.SHA256);

        // Assert
        actualChecksum.Should().Be(expectedChecksum);
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldComputeMD5_ForKnownContent()
    {
        // Arrange
        var content = "Hello, World!";
        var expectedChecksum = "65a8e27d8879283831b664bd8b7f0ad4";
        
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var actualChecksum = await _checksumValidator.ComputeChecksumAsync(
            stream,
            ChecksumAlgorithm.MD5);

        // Assert
        actualChecksum.Should().Be(expectedChecksum);
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldHandleEmptyContent()
    {
        // Arrange
        var expectedSHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        
        using var stream = new MemoryStream(Array.Empty<byte>());

        // Act
        var actualChecksum = await _checksumValidator.ComputeChecksumAsync(
            stream,
            ChecksumAlgorithm.SHA256);

        // Assert
        actualChecksum.Should().Be(expectedSHA256);
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldHandleLargeContent()
    {
        // Arrange - Create 10MB of data
        var largeData = new byte[10 * 1024 * 1024];
        new Random(42).NextBytes(largeData);
        
        using var stream = new MemoryStream(largeData);

        // Act
        var checksum = await _checksumValidator.ComputeChecksumAsync(
            stream,
            ChecksumAlgorithm.SHA256);

        // Assert
        checksum.Should().NotBeNullOrEmpty();
        checksum.Should().HaveLength(64); // SHA256 produces 64 hex characters
    }

    [Fact]
    public async Task ComputeChecksumAsync_FromFile_ShouldComputeCorrectly()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        var content = "Test file content for checksum validation";
        
        try
        {
            await File.WriteAllTextAsync(tempFile, content);

            // Act
            var actualChecksum = await _checksumValidator.ComputeChecksumAsync(
                tempFile,
                ChecksumAlgorithm.SHA256);

            // Assert
            actualChecksum.Should().NotBeNullOrEmpty();
            actualChecksum.Should().HaveLength(64);
            
            // Verify consistency - computing twice should give same result
            var secondChecksum = await _checksumValidator.ComputeChecksumAsync(
                tempFile,
                ChecksumAlgorithm.SHA256);
            
            secondChecksum.Should().Be(actualChecksum);
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                File.Delete(tempFile);
            }
        }
    }

    [Fact]
    public async Task ValidateAsync_ShouldReturnTrue_ForMatchingChecksum()
    {
        // Arrange
        var content = "Hello, World!";
        var expectedChecksum = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var isValid = await _checksumValidator.ValidateAsync(
            stream,
            expectedChecksum,
            ChecksumAlgorithm.SHA256);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_ShouldReturnFalse_ForMismatchedChecksum()
    {
        // Arrange
        var content = "Hello, World!";
        var wrongChecksum = "0000000000000000000000000000000000000000000000000000000000000000";
        
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var isValid = await _checksumValidator.ValidateAsync(
            stream,
            wrongChecksum,
            ChecksumAlgorithm.SHA256);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public async Task ValidateAsync_ShouldBeCaseInsensitive()
    {
        // Arrange
        var content = "Hello, World!";
        var checksumLower = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f";
        var checksumUpper = "DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F";
        
        using var stream1 = new MemoryStream(Encoding.UTF8.GetBytes(content));
        using var stream2 = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var isValidLower = await _checksumValidator.ValidateAsync(
            stream1,
            checksumLower,
            ChecksumAlgorithm.SHA256);
        
        var isValidUpper = await _checksumValidator.ValidateAsync(
            stream2,
            checksumUpper,
            ChecksumAlgorithm.SHA256);

        // Assert
        isValidLower.Should().BeTrue();
        isValidUpper.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_FromFile_ShouldValidateCorrectly()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        var content = "Test file content";
        
        try
        {
            await File.WriteAllTextAsync(tempFile, content);
            
            // First compute the checksum
            var expectedChecksum = await _checksumValidator.ComputeChecksumAsync(
                tempFile,
                ChecksumAlgorithm.SHA256);

            // Act
            var isValid = await _checksumValidator.ValidateAsync(
                tempFile,
                expectedChecksum,
                ChecksumAlgorithm.SHA256);

            // Assert
            isValid.Should().BeTrue();
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                File.Delete(tempFile);
            }
        }
    }

    [Fact]
    public async Task ValidateAsync_FromFile_ShouldDetectCorruption()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        var originalContent = "Original content";
        var modifiedContent = "Modified content";
        
        try
        {
            await File.WriteAllTextAsync(tempFile, originalContent);
            
            // Compute checksum for original content
            var originalChecksum = await _checksumValidator.ComputeChecksumAsync(
                tempFile,
                ChecksumAlgorithm.SHA256);
            
            // Modify the file
            await File.WriteAllTextAsync(tempFile, modifiedContent);

            // Act
            var isValid = await _checksumValidator.ValidateAsync(
                tempFile,
                originalChecksum,
                ChecksumAlgorithm.SHA256);

            // Assert
            isValid.Should().BeFalse();
        }
        finally
        {
            if (File.Exists(tempFile))
            {
                File.Delete(tempFile);
            }
        }
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldProduceDifferentHashes_ForDifferentAlgorithms()
    {
        // Arrange
        var content = "Test content";
        
        using var stream1 = new MemoryStream(Encoding.UTF8.GetBytes(content));
        using var stream2 = new MemoryStream(Encoding.UTF8.GetBytes(content));

        // Act
        var sha256Checksum = await _checksumValidator.ComputeChecksumAsync(
            stream1,
            ChecksumAlgorithm.SHA256);
        
        var md5Checksum = await _checksumValidator.ComputeChecksumAsync(
            stream2,
            ChecksumAlgorithm.MD5);

        // Assert
        sha256Checksum.Should().NotBe(md5Checksum);
        sha256Checksum.Should().HaveLength(64); // SHA256 = 32 bytes = 64 hex chars
        md5Checksum.Should().HaveLength(32); // MD5 = 16 bytes = 32 hex chars
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldBeConsistent()
    {
        // Arrange
        var content = "Consistency test";
        
        // Act - Compute checksum multiple times
        var checksums = new List<string>();
        for (int i = 0; i < 5; i++)
        {
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var checksum = await _checksumValidator.ComputeChecksumAsync(
                stream,
                ChecksumAlgorithm.SHA256);
            checksums.Add(checksum);
        }

        // Assert - All checksums should be identical
        checksums.Distinct().Should().HaveCount(1); // All should be the same, so only 1 unique
        checksums.Should().AllSatisfy(c => c.Should().Be(checksums[0]));
    }

    [Fact]
    public async Task ComputeChecksumAsync_ShouldHandleBinaryData()
    {
        // Arrange - Create binary data with all byte values
        var binaryData = Enumerable.Range(0, 256).Select(i => (byte)i).ToArray();
        
        using var stream = new MemoryStream(binaryData);

        // Act
        var checksum = await _checksumValidator.ComputeChecksumAsync(
            stream,
            ChecksumAlgorithm.SHA256);

        // Assert
        checksum.Should().NotBeNullOrEmpty();
        checksum.Should().HaveLength(64);
        checksum.Should().MatchRegex("^[0-9a-f]{64}$"); // Should be lowercase hex
    }
}
