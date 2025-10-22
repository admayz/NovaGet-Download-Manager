using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class ChecksumValidator : IChecksumValidator
{
    private readonly ILogger<ChecksumValidator> _logger;
    private const int BufferSize = 1024 * 1024; // 1MB buffer for streaming

    public ChecksumValidator(ILogger<ChecksumValidator> logger)
    {
        _logger = logger;
    }

    public async Task<string> ComputeChecksumAsync(
        string filePath,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Computing {Algorithm} checksum for file: {FilePath}",
            algorithm,
            filePath);

        await using var fileStream = new FileStream(
            filePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            BufferSize,
            useAsync: true);

        return await ComputeChecksumAsync(fileStream, algorithm, ct);
    }

    public async Task<string> ComputeChecksumAsync(
        Stream stream,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default)
    {
        using var hashAlgorithm = CreateHashAlgorithm(algorithm);
        
        var buffer = new byte[BufferSize];
        int bytesRead;

        while ((bytesRead = await stream.ReadAsync(buffer, ct)) > 0)
        {
            hashAlgorithm.TransformBlock(buffer, 0, bytesRead, null, 0);
        }

        hashAlgorithm.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
        
        var hash = hashAlgorithm.Hash!;
        var checksum = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();

        _logger.LogInformation(
            "Computed {Algorithm} checksum: {Checksum}",
            algorithm,
            checksum);

        return checksum;
    }

    public async Task<bool> ValidateAsync(
        string filePath,
        string expectedChecksum,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Validating {Algorithm} checksum for file: {FilePath}",
            algorithm,
            filePath);

        var actualChecksum = await ComputeChecksumAsync(filePath, algorithm, ct);
        var isValid = string.Equals(
            actualChecksum,
            expectedChecksum,
            StringComparison.OrdinalIgnoreCase);

        if (isValid)
        {
            _logger.LogInformation("Checksum validation successful");
        }
        else
        {
            _logger.LogWarning(
                "Checksum validation failed. Expected: {Expected}, Actual: {Actual}",
                expectedChecksum,
                actualChecksum);
        }

        return isValid;
    }

    public async Task<bool> ValidateAsync(
        Stream stream,
        string expectedChecksum,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default)
    {
        var actualChecksum = await ComputeChecksumAsync(stream, algorithm, ct);
        var isValid = string.Equals(
            actualChecksum,
            expectedChecksum,
            StringComparison.OrdinalIgnoreCase);

        if (isValid)
        {
            _logger.LogInformation("Checksum validation successful");
        }
        else
        {
            _logger.LogWarning(
                "Checksum validation failed. Expected: {Expected}, Actual: {Actual}",
                expectedChecksum,
                actualChecksum);
        }

        return isValid;
    }

    private static HashAlgorithm CreateHashAlgorithm(ChecksumAlgorithm algorithm)
    {
        return algorithm switch
        {
            ChecksumAlgorithm.MD5 => MD5.Create(),
            ChecksumAlgorithm.SHA256 => SHA256.Create(),
            _ => throw new ArgumentException($"Unsupported checksum algorithm: {algorithm}", nameof(algorithm))
        };
    }
}
