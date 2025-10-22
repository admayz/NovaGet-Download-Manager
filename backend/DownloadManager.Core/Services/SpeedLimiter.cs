using System.Diagnostics;
using DownloadManager.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Services;

/// <summary>
/// Implements speed limiting using the token bucket algorithm
/// </summary>
public class SpeedLimiter : ISpeedLimiter
{
    private readonly ILogger<SpeedLimiter>? _logger;
    private readonly object _lock = new();
    private long _bytesPerSecond;
    private long _bucketCapacity;
    private long _availableTokens;
    private readonly Stopwatch _stopwatch;
    private DateTime _lastRefillTime;
    
    public long SpeedLimit => _bytesPerSecond;

    public SpeedLimiter(long bytesPerSecond, ILogger<SpeedLimiter>? logger = null)
    {
        if (bytesPerSecond <= 0)
            throw new ArgumentException("Speed limit must be greater than zero", nameof(bytesPerSecond));
        
        _logger = logger;
        _bytesPerSecond = bytesPerSecond;
        
        // Bucket capacity is 2 seconds worth of data to allow for burst transfers
        _bucketCapacity = bytesPerSecond * 2;
        _availableTokens = _bucketCapacity;
        
        _stopwatch = Stopwatch.StartNew();
        _lastRefillTime = DateTime.UtcNow;
    }

    public async Task ThrottleAsync(int bytesTransferred, CancellationToken ct = default)
    {
        if (bytesTransferred <= 0)
            return;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            
            long tokensNeeded;
            TimeSpan waitTime;
            
            lock (_lock)
            {
                // Refill tokens based on elapsed time
                RefillTokens();
                
                tokensNeeded = bytesTransferred;
                
                if (_availableTokens >= tokensNeeded)
                {
                    // Consume tokens and proceed
                    _availableTokens -= tokensNeeded;
                    return;
                }
                
                // Calculate how long to wait for enough tokens
                var tokensShortage = tokensNeeded - _availableTokens;
                var secondsToWait = (double)tokensShortage / _bytesPerSecond;
                waitTime = TimeSpan.FromSeconds(secondsToWait);
            }
            
            // Wait outside the lock to allow other threads to proceed
            if (waitTime > TimeSpan.Zero)
            {
                _logger?.LogTrace(
                    "Throttling: waiting {WaitMs}ms for {Bytes} bytes at {SpeedLimit} bytes/sec",
                    waitTime.TotalMilliseconds,
                    bytesTransferred,
                    _bytesPerSecond);
                
                await Task.Delay(waitTime, ct);
            }
        }
    }

    public void UpdateSpeedLimit(long bytesPerSecond)
    {
        if (bytesPerSecond <= 0)
            throw new ArgumentException("Speed limit must be greater than zero", nameof(bytesPerSecond));
        
        lock (_lock)
        {
            _logger?.LogInformation(
                "Updating speed limit from {OldLimit} to {NewLimit} bytes/sec",
                _bytesPerSecond,
                bytesPerSecond);
            
            // Refill tokens before changing the rate
            RefillTokens();
            
            _bytesPerSecond = bytesPerSecond;
            _bucketCapacity = bytesPerSecond * 2;
            
            // Adjust available tokens to not exceed new capacity
            if (_availableTokens > _bucketCapacity)
            {
                _availableTokens = _bucketCapacity;
            }
        }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _availableTokens = _bucketCapacity;
            _lastRefillTime = DateTime.UtcNow;
            _stopwatch.Restart();
            
            _logger?.LogDebug("Speed limiter reset");
        }
    }

    private void RefillTokens()
    {
        // Must be called within lock
        var now = DateTime.UtcNow;
        var elapsed = now - _lastRefillTime;
        
        if (elapsed.TotalSeconds > 0)
        {
            // Calculate tokens to add based on elapsed time
            var tokensToAdd = (long)(elapsed.TotalSeconds * _bytesPerSecond);
            
            if (tokensToAdd > 0)
            {
                _availableTokens = Math.Min(_availableTokens + tokensToAdd, _bucketCapacity);
                _lastRefillTime = now;
            }
        }
    }
}

/// <summary>
/// Global speed limiter that manages bandwidth across all downloads
/// </summary>
public class GlobalSpeedLimiter : ISpeedLimiter
{
    private readonly ILogger<GlobalSpeedLimiter>? _logger;
    private readonly object _lock = new();
    private SpeedLimiter? _limiter;
    private long? _globalSpeedLimit;
    
    public long SpeedLimit => _globalSpeedLimit ?? 0;

    public GlobalSpeedLimiter(ILogger<GlobalSpeedLimiter>? logger = null)
    {
        _logger = logger;
    }

    public void SetGlobalSpeedLimit(long? bytesPerSecond)
    {
        lock (_lock)
        {
            _globalSpeedLimit = bytesPerSecond;
            
            if (bytesPerSecond.HasValue && bytesPerSecond.Value > 0)
            {
                if (_limiter == null)
                {
                    _limiter = new SpeedLimiter(bytesPerSecond.Value);
                    _logger?.LogInformation("Global speed limit enabled: {Limit} bytes/sec", bytesPerSecond.Value);
                }
                else
                {
                    _limiter.UpdateSpeedLimit(bytesPerSecond.Value);
                }
            }
            else
            {
                _limiter = null;
                _logger?.LogInformation("Global speed limit disabled");
            }
        }
    }

    public async Task ThrottleAsync(int bytesTransferred, CancellationToken ct = default)
    {
        SpeedLimiter? limiter;
        
        lock (_lock)
        {
            limiter = _limiter;
        }
        
        if (limiter != null)
        {
            await limiter.ThrottleAsync(bytesTransferred, ct);
        }
    }

    public void UpdateSpeedLimit(long bytesPerSecond)
    {
        SetGlobalSpeedLimit(bytesPerSecond);
    }

    public void Reset()
    {
        lock (_lock)
        {
            _limiter?.Reset();
        }
    }
}
