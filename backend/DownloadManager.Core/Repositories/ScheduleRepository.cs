using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Repositories;

public class ScheduleRepository : IScheduleRepository
{
    private readonly DownloadManagerDbContext _context;
    private readonly ILogger<ScheduleRepository> _logger;

    public ScheduleRepository(DownloadManagerDbContext context, ILogger<ScheduleRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ScheduledDownload?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ScheduledDownloads
                .Include(s => s.Download)
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving schedule with ID {ScheduleId}", id);
            throw;
        }
    }

    public async Task<ScheduledDownload?> GetByDownloadIdAsync(Guid downloadId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ScheduledDownloads
                .Include(s => s.Download)
                .FirstOrDefaultAsync(s => s.DownloadId == downloadId, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving schedule for download ID {DownloadId}", downloadId);
            throw;
        }
    }

    public async Task<List<ScheduledDownload>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.ScheduledDownloads.Include(s => s.Download).AsQueryable();

            if (activeOnly)
            {
                query = query.Where(s => s.IsActive);
            }

            return await query.OrderBy(s => s.NextRun ?? s.ScheduledTime).ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all schedules");
            throw;
        }
    }

    public async Task<List<ScheduledDownload>> GetPendingSchedulesAsync(DateTime currentTime, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ScheduledDownloads
                .Include(s => s.Download)
                .Where(s => s.IsActive && 
                           (s.NextRun != null ? s.NextRun <= currentTime : s.ScheduledTime <= currentTime))
                .OrderBy(s => s.NextRun ?? s.ScheduledTime)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving pending schedules");
            throw;
        }
    }

    public async Task<List<ScheduledDownload>> GetMissedSchedulesAsync(DateTime currentTime, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.ScheduledDownloads
                .Include(s => s.Download)
                .Where(s => s.IsActive && 
                           s.LastRun == null &&
                           (s.NextRun != null ? s.NextRun < currentTime : s.ScheduledTime < currentTime))
                .OrderBy(s => s.NextRun ?? s.ScheduledTime)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving missed schedules");
            throw;
        }
    }

    public async Task AddAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default)
    {
        try
        {
            await _context.ScheduledDownloads.AddAsync(schedule, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Schedule {ScheduleId} created for download {DownloadId}", schedule.Id, schedule.DownloadId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding schedule for download {DownloadId}", schedule.DownloadId);
            throw;
        }
    }

    public async Task UpdateAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.ScheduledDownloads.Update(schedule);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Schedule {ScheduleId} updated", schedule.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating schedule {ScheduleId}", schedule.Id);
            throw;
        }
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var schedule = await _context.ScheduledDownloads.FindAsync(new object[] { id }, cancellationToken);
            if (schedule != null)
            {
                _context.ScheduledDownloads.Remove(schedule);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Schedule {ScheduleId} deleted", id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting schedule {ScheduleId}", id);
            throw;
        }
    }
}
