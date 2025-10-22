using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Repositories;

public class DownloadRepository : IDownloadRepository
{
    private readonly IDbContextFactory<DownloadManagerDbContext> _dbContextFactory;
    private readonly ILogger<DownloadRepository> _logger;

    public DownloadRepository(
        IDbContextFactory<DownloadManagerDbContext> dbContextFactory,
        ILogger<DownloadRepository> logger)
    {
        _dbContextFactory = dbContextFactory;
        _logger = logger;
    }

    public async Task<DownloadTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        return await dbContext.Downloads
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, ct);
    }

    public async Task<DownloadTask?> GetByIdWithSegmentsAsync(Guid id, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        return await dbContext.Downloads
            .AsNoTracking()
            .Include(d => d.Segments)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
    }

    public async Task<List<DownloadTask>> GetAllAsync(DownloadFilter? filter = null, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var query = dbContext.Downloads.AsNoTracking().AsQueryable();

        if (filter != null)
        {
            if (filter.Status.HasValue)
            {
                query = query.Where(d => d.Status == filter.Status.Value);
            }

            if (!string.IsNullOrEmpty(filter.Category))
            {
                query = query.Where(d => d.Category == filter.Category);
            }

            if (filter.FromDate.HasValue)
            {
                query = query.Where(d => d.CreatedAt >= filter.FromDate.Value);
            }

            if (filter.ToDate.HasValue)
            {
                query = query.Where(d => d.CreatedAt <= filter.ToDate.Value);
            }

            if (!string.IsNullOrEmpty(filter.SearchTerm))
            {
                query = query.Where(d => 
                    d.Filename.Contains(filter.SearchTerm) || 
                    d.Url.Contains(filter.SearchTerm));
            }

            if (filter.Skip.HasValue)
            {
                query = query.Skip(filter.Skip.Value);
            }

            if (filter.Take.HasValue)
            {
                query = query.Take(filter.Take.Value);
            }
        }

        return await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<List<DownloadTask>> GetIncompleteDownloadsAsync(CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        return await dbContext.Downloads
            .AsNoTracking()
            .Include(d => d.Segments)
            .Where(d => d.Status == DownloadStatus.Downloading || 
                       d.Status == DownloadStatus.Paused ||
                       d.Status == DownloadStatus.Pending)
            .OrderByDescending(d => d.Priority)
            .ThenBy(d => d.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task SaveAsync(DownloadTask task, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            dbContext.Downloads.Add(task);
            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            
            _logger.LogInformation("Saved download task: {DownloadId}", task.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to save download task: {DownloadId}", task.Id);
            throw;
        }
    }

    public async Task UpdateAsync(DownloadTask task, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            task.LastModified = DateTime.UtcNow;
            dbContext.Downloads.Update(task);
            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            
            _logger.LogDebug("Updated download task: {DownloadId}", task.Id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to update download task: {DownloadId}", task.Id);
            throw;
        }
    }

    public async Task UpdateProgressAsync(Guid id, long downloadedSize, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var download = await dbContext.Downloads.FindAsync(new object[] { id }, ct);
        if (download != null)
        {
            download.DownloadedSize = downloadedSize;
            download.LastModified = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task UpdateStatusAsync(Guid id, DownloadStatus status, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            var download = await dbContext.Downloads.FindAsync(new object[] { id }, ct);
            if (download != null)
            {
                download.Status = status;
                download.LastModified = DateTime.UtcNow;
                
                if (status == DownloadStatus.Downloading && !download.StartedAt.HasValue)
                {
                    download.StartedAt = DateTime.UtcNow;
                }
                else if (status == DownloadStatus.Completed)
                {
                    download.CompletedAt = DateTime.UtcNow;
                }
                
                await dbContext.SaveChangesAsync(ct);
                
                // Log to history
                dbContext.DownloadHistory.Add(new DownloadHistory
                {
                    DownloadId = id,
                    EventType = status.ToString(),
                    Timestamp = DateTime.UtcNow
                });
                await dbContext.SaveChangesAsync(ct);
            }
            
            await transaction.CommitAsync(ct);
            _logger.LogInformation("Updated download status: {DownloadId} -> {Status}", id, status);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to update download status: {DownloadId}", id);
            throw;
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            var download = await dbContext.Downloads.FindAsync(new object[] { id }, ct);
            if (download != null)
            {
                dbContext.Downloads.Remove(download);
                await dbContext.SaveChangesAsync(ct);
            }
            
            await transaction.CommitAsync(ct);
            _logger.LogInformation("Deleted download: {DownloadId}", id);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to delete download: {DownloadId}", id);
            throw;
        }
    }

    public async Task<List<DownloadSegment>> GetSegmentsAsync(Guid downloadId, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        return await dbContext.DownloadSegments
            .AsNoTracking()
            .Where(s => s.DownloadId == downloadId)
            .OrderBy(s => s.SegmentIndex)
            .ToListAsync(ct);
    }

    public async Task SaveSegmentAsync(DownloadSegment segment, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        dbContext.DownloadSegments.Add(segment);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateSegmentAsync(DownloadSegment segment, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        dbContext.DownloadSegments.Update(segment);
        await dbContext.SaveChangesAsync(ct);
    }

    public async Task UpdateSegmentProgressAsync(int segmentId, long downloadedBytes, SegmentStatus status, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        var segment = await dbContext.DownloadSegments.FindAsync(new object[] { segmentId }, ct);
        if (segment != null)
        {
            segment.DownloadedBytes = downloadedBytes;
            segment.Status = status;
            await dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task SaveSegmentsAsync(IEnumerable<DownloadSegment> segments, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            dbContext.DownloadSegments.AddRange(segments);
            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            
            _logger.LogInformation("Saved {Count} segments", segments.Count());
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to save segments");
            throw;
        }
    }
}
