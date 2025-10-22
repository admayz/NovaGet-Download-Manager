using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Data;
using DownloadManager.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace DownloadManager.Core.Services;

public class RetryPolicy : IRetryPolicy
{
    private readonly ILogger<RetryPolicy> _logger;
    private readonly IDbContextFactory<DownloadManagerDbContext>? _dbContextFactory;
    
    public int MaxRetries { get; set; } = 5;
    public TimeSpan InitialDelay { get; set; } = TimeSpan.FromSeconds(1);
    public double BackoffMultiplier { get; set; } = 2.0;
    public TimeSpan MaxDelay { get; set; } = TimeSpan.FromMinutes(5);

    public RetryPolicy(ILogger<RetryPolicy> logger, IDbContextFactory<DownloadManagerDbContext>? dbContextFactory = null)
    {
        _logger = logger;
        _dbContextFactory = dbContextFactory;
    }

    public async Task ExecuteAsync(Func<Task> operation, CancellationToken ct = default)
    {
        await ExecuteAsync(async () =>
        {
            await operation();
            return true;
        }, ct);
    }

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation, CancellationToken ct = default)
    {
        int attempt = 0;
        TimeSpan delay = InitialDelay;
        Exception? lastException = null;

        while (attempt <= MaxRetries)
        {
            try
            {
                if (attempt > 0)
                {
                    _logger.LogInformation(
                        "Retry attempt {Attempt} of {MaxRetries} after {Delay}ms delay",
                        attempt,
                        MaxRetries,
                        delay.TotalMilliseconds);
                }

                return await operation();
            }
            catch (Exception ex) when (IsTransientError(ex))
            {
                lastException = ex;
                
                if (attempt < MaxRetries)
                {
                    attempt++;

                    _logger.LogWarning(
                        ex,
                        "Transient error occurred on attempt {Attempt}. Retrying after {Delay}ms",
                        attempt,
                        delay.TotalMilliseconds);

                    // Log retry attempt to database if available
                    await LogRetryAttemptAsync(ex, attempt, ct);

                    await Task.Delay(delay, ct);
                    
                    // Calculate next delay with exponential backoff
                    delay = TimeSpan.FromMilliseconds(
                        Math.Min(
                            delay.TotalMilliseconds * BackoffMultiplier,
                            MaxDelay.TotalMilliseconds));
                }
                else
                {
                    // Max retries reached
                    break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Non-transient error occurred. Not retrying.");
                throw;
            }
        }

        _logger.LogError(
            lastException,
            "Max retry attempts ({MaxRetries}) reached. Operation failed.",
            MaxRetries);

        throw new InvalidOperationException(
            $"Operation failed after {MaxRetries} retry attempts",
            lastException);
    }

    private bool IsTransientError(Exception ex)
    {
        return ex switch
        {
            HttpRequestException httpEx => IsTransientHttpError(httpEx),
            TaskCanceledException => true,
            TimeoutException => true,
            IOException => true,
            SocketException => true,
            _ => false
        };
    }

    private bool IsTransientHttpError(HttpRequestException ex)
    {
        // Check if it's a network-level error
        if (ex.InnerException is SocketException or IOException)
        {
            return true;
        }

        // Check HTTP status code if available
        if (ex.StatusCode.HasValue)
        {
            var statusCode = (int)ex.StatusCode.Value;
            
            // Retry on 5xx server errors
            if (statusCode >= 500 && statusCode < 600)
            {
                return true;
            }

            // Retry on specific 4xx errors
            if (statusCode == 408 || // Request Timeout
                statusCode == 429 || // Too Many Requests
                statusCode == 503 || // Service Unavailable
                statusCode == 504)   // Gateway Timeout
            {
                return true;
            }
            
            // Don't retry on other 4xx errors (client errors)
            if (statusCode >= 400 && statusCode < 500)
            {
                return false;
            }
        }

        // If no status code, don't retry (could be any HTTP error)
        return false;
    }

    private async Task LogRetryAttemptAsync(Exception ex, int attempt, CancellationToken ct)
    {
        if (_dbContextFactory == null)
        {
            return;
        }

        try
        {
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
            
            var historyEntry = new DownloadHistory
            {
                DownloadId = Guid.Empty, // Will be set by caller if needed
                EventType = "retry_attempt",
                EventData = System.Text.Json.JsonSerializer.Serialize(new
                {
                    attempt,
                    error = ex.Message,
                    errorType = ex.GetType().Name
                }),
                Timestamp = DateTime.UtcNow
            };

            dbContext.DownloadHistory.Add(historyEntry);
            await dbContext.SaveChangesAsync(ct);
        }
        catch (Exception logEx)
        {
            _logger.LogWarning(logEx, "Failed to log retry attempt to database");
        }
    }
}

public class SocketException : Exception
{
    public SocketException() { }
    public SocketException(string message) : base(message) { }
    public SocketException(string message, Exception inner) : base(message, inner) { }
}
