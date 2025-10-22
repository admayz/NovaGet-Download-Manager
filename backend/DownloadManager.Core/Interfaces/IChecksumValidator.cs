using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IChecksumValidator
{
    Task<string> ComputeChecksumAsync(
        string filePath,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default);

    Task<string> ComputeChecksumAsync(
        Stream stream,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default);

    Task<bool> ValidateAsync(
        string filePath,
        string expectedChecksum,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default);

    Task<bool> ValidateAsync(
        Stream stream,
        string expectedChecksum,
        ChecksumAlgorithm algorithm,
        CancellationToken ct = default);
}
