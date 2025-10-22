namespace DownloadManager.Core.Interfaces;

/// <summary>
/// Interface for speed limiting functionality using token bucket algorithm
/// </summary>
public interface ISpeedLimiter
{
    /// <summary>
    /// Throttles the data transfer to maintain the configured speed limit
    /// </summary>
    /// <param name="bytesTransferred">Number of bytes transferred</param>
    /// <param name="ct">Cancellation token</param>
    Task ThrottleAsync(int bytesTransferred, CancellationToken ct = default);
    
    /// <summary>
    /// Updates the speed limit dynamically during active downloads
    /// </summary>
    /// <param name="bytesPerSecond">New speed limit in bytes per second</param>
    void UpdateSpeedLimit(long bytesPerSecond);
    
    /// <summary>
    /// Gets the current speed limit in bytes per second
    /// </summary>
    long SpeedLimit { get; }
    
    /// <summary>
    /// Resets the speed limiter state
    /// </summary>
    void Reset();
}
