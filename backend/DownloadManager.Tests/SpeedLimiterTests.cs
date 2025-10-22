using Xunit;
using DownloadManager.Core.Services;
using System.Diagnostics;

namespace DownloadManager.Tests;

public class SpeedLimiterTests
{
    [Fact]
    public async Task ThrottleAsync_ShouldLimitSpeed()
    {
        // Arrange
        var speedLimit = 1024 * 1024; // 1 MB/s
        var limiter = new SpeedLimiter(speedLimit);
        
        // First exhaust the bucket capacity (2 seconds worth)
        await limiter.ThrottleAsync(2 * 1024 * 1024, CancellationToken.None);
        
        // Now test actual throttling
        var bytesToTransfer = 1024 * 1024; // 1 MB
        var stopwatch = Stopwatch.StartNew();

        // Act
        await limiter.ThrottleAsync(bytesToTransfer, CancellationToken.None);
        stopwatch.Stop();

        // Assert - Should take approximately 1 second (1 MB at 1 MB/s)
        Assert.True(stopwatch.Elapsed.TotalSeconds >= 0.8, 
            $"Expected at least 0.8 seconds, but took {stopwatch.Elapsed.TotalSeconds} seconds");
        Assert.True(stopwatch.Elapsed.TotalSeconds <= 1.3, 
            $"Expected at most 1.3 seconds, but took {stopwatch.Elapsed.TotalSeconds} seconds");
    }

    [Fact]
    public async Task ThrottleAsync_WithBurstCapacity_ShouldAllowInitialBurst()
    {
        // Arrange
        var speedLimit = 1024 * 1024; // 1 MB/s
        var limiter = new SpeedLimiter(speedLimit);
        var burstSize = 2 * 1024 * 1024; // 2 MB (within bucket capacity)
        var stopwatch = Stopwatch.StartNew();

        // Act - First burst should be fast due to bucket capacity
        await limiter.ThrottleAsync(burstSize, CancellationToken.None);
        stopwatch.Stop();

        // Assert - Should be relatively fast due to initial bucket capacity
        Assert.True(stopwatch.Elapsed.TotalSeconds <= 0.5, 
            $"Expected burst to complete quickly, but took {stopwatch.Elapsed.TotalSeconds} seconds");
    }

    [Fact]
    public async Task UpdateSpeedLimit_ShouldChangeSpeedDynamically()
    {
        // Arrange
        var initialLimit = 1024 * 1024; // 1 MB/s
        var limiter = new SpeedLimiter(initialLimit);
        
        // Act
        limiter.UpdateSpeedLimit(2 * 1024 * 1024); // Change to 2 MB/s

        // Assert
        Assert.Equal(2 * 1024 * 1024, limiter.SpeedLimit);
    }

    [Fact]
    public async Task GlobalSpeedLimiter_ShouldApplyGlobalLimit()
    {
        // Arrange
        var globalLimiter = new GlobalSpeedLimiter();
        globalLimiter.SetGlobalSpeedLimit(1024 * 1024); // 1 MB/s
        
        // First exhaust the bucket capacity
        await globalLimiter.ThrottleAsync(2 * 1024 * 1024, CancellationToken.None);
        
        // Now test actual throttling
        var bytesToTransfer = 1024 * 1024; // 1 MB
        var stopwatch = Stopwatch.StartNew();

        // Act
        await globalLimiter.ThrottleAsync(bytesToTransfer, CancellationToken.None);
        stopwatch.Stop();

        // Assert
        Assert.True(stopwatch.Elapsed.TotalSeconds >= 0.8, 
            $"Expected at least 0.8 seconds, but took {stopwatch.Elapsed.TotalSeconds} seconds");
    }

    [Fact]
    public async Task GlobalSpeedLimiter_WhenDisabled_ShouldNotThrottle()
    {
        // Arrange
        var globalLimiter = new GlobalSpeedLimiter();
        globalLimiter.SetGlobalSpeedLimit(null); // Disable
        var bytesToTransfer = 10 * 1024 * 1024; // 10 MB
        var stopwatch = Stopwatch.StartNew();

        // Act
        await globalLimiter.ThrottleAsync(bytesToTransfer, CancellationToken.None);
        stopwatch.Stop();

        // Assert - Should complete immediately
        Assert.True(stopwatch.Elapsed.TotalSeconds < 0.1, 
            $"Expected immediate completion, but took {stopwatch.Elapsed.TotalSeconds} seconds");
    }

    [Fact]
    public void Reset_ShouldResetLimiterState()
    {
        // Arrange
        var limiter = new SpeedLimiter(1024 * 1024);

        // Act
        limiter.Reset();

        // Assert - Should not throw and limiter should work after reset
        Assert.Equal(1024 * 1024, limiter.SpeedLimit);
    }

    [Fact]
    public async Task ThrottleAsync_WithCancellation_ShouldThrowTaskCanceledException()
    {
        // Arrange
        var limiter = new SpeedLimiter(1024); // Very slow: 1 KB/s
        
        // Exhaust bucket first
        await limiter.ThrottleAsync(2048, CancellationToken.None);
        
        var cts = new CancellationTokenSource();
        cts.CancelAfter(100); // Cancel after 100ms

        // Act & Assert - TaskCanceledException inherits from OperationCanceledException
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            await limiter.ThrottleAsync(10 * 1024 * 1024, cts.Token); // 10 MB
        });
    }

    [Fact]
    public async Task MultipleSegments_ShouldShareGlobalLimit()
    {
        // Arrange
        var globalLimiter = new GlobalSpeedLimiter();
        globalLimiter.SetGlobalSpeedLimit(1024 * 1024); // 1 MB/s total
        
        // Exhaust bucket first
        await globalLimiter.ThrottleAsync(2 * 1024 * 1024, CancellationToken.None);
        
        var stopwatch = Stopwatch.StartNew();

        // Act - Simulate 2 segments downloading 512 KB each (1 MB total)
        var tasks = new[]
        {
            Task.Run(async () => await globalLimiter.ThrottleAsync(512 * 1024, CancellationToken.None)),
            Task.Run(async () => await globalLimiter.ThrottleAsync(512 * 1024, CancellationToken.None))
        };

        await Task.WhenAll(tasks);
        stopwatch.Stop();

        // Assert - Should take approximately 1 second (1 MB total at 1 MB/s)
        Assert.True(stopwatch.Elapsed.TotalSeconds >= 0.8, 
            $"Expected at least 0.8 seconds for shared limit, but took {stopwatch.Elapsed.TotalSeconds} seconds");
    }
}
