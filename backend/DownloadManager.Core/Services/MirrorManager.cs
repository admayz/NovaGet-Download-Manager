using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class MirrorManager : IMirrorManager
{
    private readonly ILogger<MirrorManager> _logger;
    private readonly IDbContextFactory<DownloadManagerDbContext> _dbContextFactory;
    private readonly IConnectionManager _connectionManager;

    public MirrorManager(
        ILogger<MirrorManager> logger,
        IDbContextFactory<DownloadManagerDbContext> dbContextFactory,
        IConnectionManager connectionManager)
    {
        _logger = logger;
        _dbContextFactory = dbContextFactory;
        _connectionManager = connectionManager;
    }

    public async Task<List<MirrorUrl>> CheckMirrorHealthAsync(Guid downloadId, CancellationToken ct = default)
    {
        _logger.LogInformation("Checking mirror health for download: {DownloadId}", downloadId);

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        var mirrors = await dbContext.MirrorUrls
            .Where(m => m.DownloadId == downloadId)
            .ToListAsync(ct);

        if (mirrors.Count == 0)
        {
            _logger.LogWarning("No mirrors found for download: {DownloadId}", downloadId);
            return mirrors;
        }

        // Check each mirror with HEAD request
        var healthCheckTasks = mirrors.Select(async mirror =>
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                using var client = await _connectionManager.GetClientAsync(new Uri(mirror.Url));
                using var request = new HttpRequestMessage(HttpMethod.Head, mirror.Url);
                
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
                stopwatch.Stop();

                mirror.IsHealthy = response.IsSuccessStatusCode;
                mirror.ResponseTimeMs = stopwatch.ElapsedMilliseconds;
                mirror.LastChecked = DateTime.UtcNow;
                mirror.ErrorMessage = null;

                _logger.LogInformation(
                    "Mirror health check: {Url} - Healthy: {IsHealthy}, Response time: {ResponseTime}ms",
                    mirror.Url, mirror.IsHealthy, mirror.ResponseTimeMs);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                mirror.IsHealthy = false;
                mirror.ResponseTimeMs = stopwatch.ElapsedMilliseconds;
                mirror.LastChecked = DateTime.UtcNow;
                mirror.ErrorMessage = ex.Message;

                _logger.LogWarning(ex, "Mirror health check failed: {Url}", mirror.Url);
            }
        });

        await Task.WhenAll(healthCheckTasks);

        // Update database with health check results
        dbContext.MirrorUrls.UpdateRange(mirrors);
        await dbContext.SaveChangesAsync(ct);

        // Rank mirrors by response time (healthy mirrors first)
        var rankedMirrors = mirrors
            .OrderByDescending(m => m.IsHealthy)
            .ThenBy(m => m.ResponseTimeMs)
            .ToList();

        // Update priorities based on ranking
        for (int i = 0; i < rankedMirrors.Count; i++)
        {
            rankedMirrors[i].Priority = i;
        }

        await dbContext.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Mirror health check completed for download: {DownloadId}. Healthy: {HealthyCount}/{TotalCount}",
            downloadId, rankedMirrors.Count(m => m.IsHealthy), rankedMirrors.Count);

        return rankedMirrors;
    }

    public async Task<MirrorUrl?> GetBestMirrorAsync(Guid downloadId, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var bestMirror = await dbContext.MirrorUrls
            .Where(m => m.DownloadId == downloadId && m.IsHealthy)
            .OrderBy(m => m.Priority)
            .ThenBy(m => m.ResponseTimeMs)
            .FirstOrDefaultAsync(ct);

        if (bestMirror == null)
        {
            _logger.LogWarning("No healthy mirrors found for download: {DownloadId}", downloadId);
        }
        else
        {
            _logger.LogDebug("Best mirror for download {DownloadId}: {Url} (Priority: {Priority}, Response time: {ResponseTime}ms)",
                downloadId, bestMirror.Url, bestMirror.Priority, bestMirror.ResponseTimeMs);
        }

        return bestMirror;
    }

    public async Task<List<MirrorUrl>> GetHealthyMirrorsAsync(Guid downloadId, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var healthyMirrors = await dbContext.MirrorUrls
            .Where(m => m.DownloadId == downloadId && m.IsHealthy)
            .OrderBy(m => m.Priority)
            .ThenBy(m => m.ResponseTimeMs)
            .ToListAsync(ct);

        _logger.LogDebug("Found {Count} healthy mirrors for download: {DownloadId}", 
            healthyMirrors.Count, downloadId);

        return healthyMirrors;
    }

    public async Task UpdateMirrorHealthAsync(
        int mirrorId, 
        bool isHealthy, 
        long responseTimeMs, 
        string? errorMessage = null, 
        CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var mirror = await dbContext.MirrorUrls.FindAsync(new object[] { mirrorId }, ct);
        if (mirror == null)
        {
            _logger.LogWarning("Mirror not found: {MirrorId}", mirrorId);
            return;
        }

        mirror.IsHealthy = isHealthy;
        mirror.ResponseTimeMs = responseTimeMs;
        mirror.LastChecked = DateTime.UtcNow;
        mirror.ErrorMessage = errorMessage;

        await dbContext.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Updated mirror health: {MirrorId} - Healthy: {IsHealthy}, Response time: {ResponseTime}ms",
            mirrorId, isHealthy, responseTimeMs);
    }
}
