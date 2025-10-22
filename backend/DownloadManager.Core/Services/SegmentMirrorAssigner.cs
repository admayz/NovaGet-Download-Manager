using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class SegmentMirrorAssigner : ISegmentMirrorAssigner
{
    private readonly ILogger<SegmentMirrorAssigner> _logger;
    private readonly IDbContextFactory<DownloadManagerDbContext> _dbContextFactory;
    private readonly IMirrorManager _mirrorManager;

    public SegmentMirrorAssigner(
        ILogger<SegmentMirrorAssigner> logger,
        IDbContextFactory<DownloadManagerDbContext> dbContextFactory,
        IMirrorManager mirrorManager)
    {
        _logger = logger;
        _dbContextFactory = dbContextFactory;
        _mirrorManager = mirrorManager;
    }

    public async Task AssignMirrorsToSegmentsAsync(Guid downloadId, CancellationToken ct = default)
    {
        _logger.LogInformation("Assigning mirrors to segments for download: {DownloadId}", downloadId);

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var download = await dbContext.Downloads
            .Include(d => d.Segments)
            .Include(d => d.MirrorUrls)
            .FirstOrDefaultAsync(d => d.Id == downloadId, ct);

        if (download == null)
        {
            _logger.LogWarning("Download not found: {DownloadId}", downloadId);
            return;
        }

        // If no mirrors, use primary URL for all segments
        if (download.MirrorUrls.Count == 0)
        {
            _logger.LogInformation("No mirrors configured, using primary URL for all segments");
            foreach (var segment in download.Segments)
            {
                segment.MirrorUrl = download.Url;
                segment.AssignedMirrorId = null;
            }
            await dbContext.SaveChangesAsync(ct);
            return;
        }

        // Check mirror health first
        var healthyMirrors = await _mirrorManager.GetHealthyMirrorsAsync(downloadId, ct);
        
        if (healthyMirrors.Count == 0)
        {
            _logger.LogWarning("No healthy mirrors available, using primary URL");
            foreach (var segment in download.Segments)
            {
                segment.MirrorUrl = download.Url;
                segment.AssignedMirrorId = null;
            }
            await dbContext.SaveChangesAsync(ct);
            return;
        }

        // Distribute segments across healthy mirrors using round-robin
        var pendingSegments = download.Segments
            .Where(s => s.Status == SegmentStatus.Pending || s.Status == SegmentStatus.Failed)
            .OrderBy(s => s.SegmentIndex)
            .ToList();

        for (int i = 0; i < pendingSegments.Count; i++)
        {
            var segment = pendingSegments[i];
            var mirror = healthyMirrors[i % healthyMirrors.Count];
            
            segment.MirrorUrl = mirror.Url;
            segment.AssignedMirrorId = mirror.Id;

            _logger.LogDebug(
                "Assigned segment {SegmentIndex} to mirror {MirrorId} ({Url})",
                segment.SegmentIndex, mirror.Id, mirror.Url);
        }

        await dbContext.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Assigned {SegmentCount} segments across {MirrorCount} mirrors for download: {DownloadId}",
            pendingSegments.Count, healthyMirrors.Count, downloadId);
    }

    public async Task<string?> GetSegmentUrlAsync(DownloadSegment segment, CancellationToken ct = default)
    {
        // If segment has assigned mirror, use it
        if (!string.IsNullOrEmpty(segment.MirrorUrl))
        {
            return segment.MirrorUrl;
        }

        // Otherwise, get from database
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var dbSegment = await dbContext.DownloadSegments
            .Include(s => s.Download)
            .Include(s => s.AssignedMirror)
            .FirstOrDefaultAsync(s => s.Id == segment.Id, ct);

        if (dbSegment == null)
        {
            _logger.LogWarning("Segment not found: {SegmentId}", segment.Id);
            return null;
        }

        // Return assigned mirror URL or primary download URL
        return dbSegment.MirrorUrl ?? dbSegment.Download.Url;
    }

    public async Task ReassignSegmentMirrorAsync(int segmentId, CancellationToken ct = default)
    {
        _logger.LogInformation("Reassigning mirror for segment: {SegmentId}", segmentId);

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var segment = await dbContext.DownloadSegments
            .Include(s => s.Download)
            .ThenInclude(d => d.MirrorUrls)
            .FirstOrDefaultAsync(s => s.Id == segmentId, ct);

        if (segment == null)
        {
            _logger.LogWarning("Segment not found: {SegmentId}", segmentId);
            return;
        }

        // Get healthy mirrors excluding the currently assigned one
        var healthyMirrors = await _mirrorManager.GetHealthyMirrorsAsync(segment.DownloadId, ct);
        
        if (segment.AssignedMirrorId.HasValue)
        {
            healthyMirrors = healthyMirrors
                .Where(m => m.Id != segment.AssignedMirrorId.Value)
                .ToList();
        }

        if (healthyMirrors.Count == 0)
        {
            _logger.LogWarning(
                "No alternative healthy mirrors available for segment: {SegmentId}, using primary URL",
                segmentId);
            
            segment.MirrorUrl = segment.Download.Url;
            segment.AssignedMirrorId = null;
        }
        else
        {
            // Assign the best available mirror
            var bestMirror = healthyMirrors.First();
            segment.MirrorUrl = bestMirror.Url;
            segment.AssignedMirrorId = bestMirror.Id;

            _logger.LogInformation(
                "Reassigned segment {SegmentId} to mirror {MirrorId} ({Url})",
                segmentId, bestMirror.Id, bestMirror.Url);
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
