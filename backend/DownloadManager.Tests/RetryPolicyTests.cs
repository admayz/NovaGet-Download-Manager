using Xunit;
using FluentAssertions;
using Moq;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Services;

namespace DownloadManager.Tests;

public class RetryPolicyTests
{
    private readonly Mock<ILogger<RetryPolicy>> _mockLogger;
    private readonly RetryPolicy _retryPolicy;

    public RetryPolicyTests()
    {
        _mockLogger = new Mock<ILogger<RetryPolicy>>();
        _retryPolicy = new RetryPolicy(_mockLogger.Object)
        {
            MaxRetries = 3,
            InitialDelay = TimeSpan.FromMilliseconds(10),
            BackoffMultiplier = 2.0,
            MaxDelay = TimeSpan.FromSeconds(1)
        };
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSucceed_OnFirstAttempt()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRetry_OnTransientError()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount < 3)
            {
                // Use 503 Service Unavailable which is transient
                throw new HttpRequestException(
                    "Transient error",
                    null,
                    System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(3);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldThrow_AfterMaxRetries()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            // Use TimeoutException which is always transient
            throw new TimeoutException("Persistent error");
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _retryPolicy.ExecuteAsync(operation));
        
        exception.InnerException.Should().BeOfType<TimeoutException>();
        callCount.Should().Be(4); // Initial attempt + 3 retries
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotRetry_OnNonTransientError()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            throw new InvalidOperationException("Non-transient error");
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _retryPolicy.ExecuteAsync(operation));
        
        callCount.Should().Be(1); // Only initial attempt, no retries
    }

    [Theory]
    [InlineData(typeof(TaskCanceledException))]
    [InlineData(typeof(TimeoutException))]
    [InlineData(typeof(IOException))]
    public async Task ExecuteAsync_ShouldRetry_OnSpecificTransientErrors(Type exceptionType)
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount < 2)
            {
                var exception = (Exception)Activator.CreateInstance(exceptionType, "Transient error")!;
                throw exception;
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRetry_OnTransientHttpRequestException()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount < 2)
            {
                // Use 503 Service Unavailable which is transient
                throw new HttpRequestException(
                    "Transient error",
                    null,
                    System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldApplyExponentialBackoff()
    {
        // Arrange
        var callCount = 0;
        var delays = new List<TimeSpan>();
        var lastCallTime = DateTime.UtcNow;

        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount > 1)
            {
                var currentTime = DateTime.UtcNow;
                delays.Add(currentTime - lastCallTime);
                lastCallTime = currentTime;
            }
            else
            {
                lastCallTime = DateTime.UtcNow;
            }

            if (callCount < 4)
            {
                // Use 503 Service Unavailable which is transient
                throw new HttpRequestException(
                    "Transient error",
                    null,
                    System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(4);
        delays.Should().HaveCount(3);

        // Verify exponential backoff (with some tolerance for timing)
        delays[0].TotalMilliseconds.Should().BeGreaterThanOrEqualTo(10); // Initial delay
        delays[1].TotalMilliseconds.Should().BeGreaterThanOrEqualTo(20); // 2x initial
        delays[2].TotalMilliseconds.Should().BeGreaterThanOrEqualTo(40); // 4x initial
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRespectMaxDelay()
    {
        // Arrange
        var retryPolicy = new RetryPolicy(_mockLogger.Object)
        {
            MaxRetries = 5,
            InitialDelay = TimeSpan.FromMilliseconds(100),
            BackoffMultiplier = 10.0, // Very high multiplier
            MaxDelay = TimeSpan.FromMilliseconds(200) // Cap at 200ms
        };

        var callCount = 0;
        var delays = new List<TimeSpan>();
        var lastCallTime = DateTime.UtcNow;

        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount > 1)
            {
                var currentTime = DateTime.UtcNow;
                delays.Add(currentTime - lastCallTime);
                lastCallTime = currentTime;
            }
            else
            {
                lastCallTime = DateTime.UtcNow;
            }

            if (callCount < 4)
            {
                // Use 503 Service Unavailable which is transient
                throw new HttpRequestException(
                    "Transient error",
                    null,
                    System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        
        // All delays should be capped at MaxDelay
        delays.Should().AllSatisfy(d => d.TotalMilliseconds.Should().BeLessThanOrEqualTo(250)); // Some tolerance
    }

    [Fact]
    public async Task ExecuteAsync_ShouldHandleCancellation()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        var callCount = 0;

        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount == 2)
            {
                cts.Cancel();
            }
            // Use 503 Service Unavailable which is transient
            throw new HttpRequestException(
                "Transient error",
                null,
                System.Net.HttpStatusCode.ServiceUnavailable);
        };

        // Act & Assert
        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            async () => await _retryPolicy.ExecuteAsync(operation, cts.Token));
    }

    [Fact]
    public async Task ExecuteAsync_VoidOverload_ShouldWork()
    {
        // Arrange
        var callCount = 0;
        Func<Task> operation = () =>
        {
            callCount++;
            if (callCount < 2)
            {
                // Use 503 Service Unavailable which is transient
                throw new HttpRequestException(
                    "Transient error",
                    null,
                    System.Net.HttpStatusCode.ServiceUnavailable);
            }
            return Task.CompletedTask;
        };

        // Act
        await _retryPolicy.ExecuteAsync(operation);

        // Assert
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRetry_On5xxHttpErrors()
    {
        // Arrange
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount < 2)
            {
                throw new HttpRequestException(
                    "Server error",
                    null,
                    System.Net.HttpStatusCode.InternalServerError);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRetry_OnSpecific4xxErrors()
    {
        // Arrange - Test 429 Too Many Requests
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            if (callCount < 2)
            {
                throw new HttpRequestException(
                    "Too many requests",
                    null,
                    System.Net.HttpStatusCode.TooManyRequests);
            }
            return Task.FromResult(42);
        };

        // Act
        var result = await _retryPolicy.ExecuteAsync(operation);

        // Assert
        result.Should().Be(42);
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotRetry_OnNonRetriable4xxErrors()
    {
        // Arrange - Test 404 Not Found (should not retry)
        var callCount = 0;
        Func<Task<int>> operation = () =>
        {
            callCount++;
            throw new HttpRequestException(
                "Not found",
                null,
                System.Net.HttpStatusCode.NotFound);
        };

        // Act & Assert
        await Assert.ThrowsAsync<HttpRequestException>(
            async () => await _retryPolicy.ExecuteAsync(operation));
        
        callCount.Should().Be(1); // No retries for 404
    }
}
