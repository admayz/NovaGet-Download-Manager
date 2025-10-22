using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class MirrorFailoverHandler : IMirrorFailoverHandler
{
    private readonly ILogger<MirrorFailoverHandler> _logger;
    private readonly IDbContextFactory<DownloadManagerDbContext> _dbContextFactory;
    private readonly ISegmentMirrorAssigner _segmentMirrorAssigner;
    private readonly IMirrorManager _mirrorManager;

    public MirrorFailoverHandler(
        ILogger<MirrorFailoverHandler> logger,
        IDbContextFactory<DownloadManagerDbContext> dbContextFactory,
        ISegmentMirrorAssigner segmentMirrorAssigner,
        IMirrorManager mirrorManager)
    {
        _logger = logger;
        _dbContextFactory = dbContextFactory;
        _segmentMirrorAssigner = segmentMirrorAssigner;
        _mirrorManager = mirrorManager;
    }

    public async Task<bool> HandleSegmentFailureAsync(int segmentId, string errorMessage, CancellationToken ct = default)
    {
        _logger.LogWarning("Handling segment failure: {SegmentId}, Error: {Error}", segmentId, errorMessage);

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var segment = await dbContext.DownloadSegments
            .Include(s => s.Download)
            .ThenInclude(d => d.MirrorUrls)
            .FirstOrDefaultAsync(s => s.Id == segmentId, ct);

        if (segment == null)
        {
            _logger.LogWarning("Segment not found: {SegmentId}", segmentId);
            return false;
        }

        var oldMirrorId = segment.AssignedMirrorId;
        var oldMirrorUrl = segment.MirrorUrl;

        // Mark current mirror as unhealthy if it was assigned
        if (oldMirrorId.HasValue)
        {
            await _mirrorManager.UpdateMirrorHealthAsync(
                oldMirrorId.Value,
                false,
                0,
                errorMessage,
                ct);

            _logger.LogInformation("Marked mirror {MirrorId} as unhealthy", oldMirrorId.Value);
        }

        // Try to reassign to a different mirror
        await _segmentMirrorAssigner.ReassignSegmentMirrorAsync(segmentId, ct);

        // Reload segment to get new assignment
        await dbContext.Entry(segment).ReloadAsync(ct);

        var newMirrorId = segment.AssignedMirrorId;
        var newMirrorUrl = segment.MirrorUrl;

        // Check if failover was successful
        bool failoverSuccessful = newMirrorUrl != oldMirrorUrl || 
                                   (newMirrorId.HasValue && newMirrorId != oldMirrorId);

        if (failoverSuccessful)
        {
            _logger.LogInformation(
                "Failover successful for segment {SegmentId}: {OldUrl} -> {NewUrl}",
                segmentId, oldMirrorUrl ?? "primary", newMirrorUrl ?? "primary");

            // Log failover event
            await LogFailoverEventAsync(
                segmentId,
                oldMirrorId,
                newMirrorId,
                $"Automatic failover due to error: {errorMessage}",
                ct);

            // Reset segment status to pending for retry
            segment.Status = SegmentStatus.Pending;
            segment.ErrorMessage = null;
            await dbContext.SaveChangesAsync(ct);

            return true;
        }
        else
        {
            _logger.LogWarning(
                "Failover failed for segment {SegmentId}: No alternative mirrors available",
                segmentId);

            // Update segment with error
            segment.Status = SegmentStatus.Failed;
            segment.ErrorMessage = $"All mirrors failed. Last error: {errorMessage}";
            await dbContext.SaveChangesAsync(ct);

            return false;
        }
    }

    public async Task LogFailoverEventAsync(
        int segmentId,
        int? oldMirrorId,
        int? newMirrorId,
        string reason,
        CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);

        var segment = await dbContext.DownloadSegments
            .Include(s => s.AssignedMirror)
            .FirstOrDefaultAsync(s => s.Id == segmentId, ct);

        if (segment == null)
        {
            _logger.LogWarning("Cannot log failover event: Segment not found: {SegmentId}", segmentId);
            return;
        }

        string? oldMirrorUrl = null;
        string? newMirrorUrl = null;

        if (oldMirrorId.HasValue)
        {
            var oldMirror = await dbContext.MirrorUrls.FindAsync(new object[] { oldMirrorId.Value }, ct);
            oldMirrorUrl = oldMirror?.Url;
        }

        if (newMirrorId.HasValue)
        {
            var newMirror = await dbContext.MirrorUrls.FindAsync(new object[] { newMirrorId.Value }, ct);
            newMirrorUrl = newMirror?.Url;
        }

        var failoverEvent = new MirrorFailoverEvent
        {
            SegmentId = segmentId,
            OldMirrorId = oldMirrorId,
            NewMirrorId = newMirrorId,
            OldMirrorUrl = oldMirrorUrl,
            NewMirrorUrl = newMirrorUrl,
            Reason = reason,
            OccurredAt = DateTime.UtcNow
        };

        dbContext.MirrorFailoverEvents.Add(failoverEvent);
        await dbContext.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Logged failover event for segment {SegmentId}: {OldMirror} -> {NewMirror}",
            segmentId, oldMirrorUrl ?? "primary", newMirrorUrl ?? "primary");
    }
}
