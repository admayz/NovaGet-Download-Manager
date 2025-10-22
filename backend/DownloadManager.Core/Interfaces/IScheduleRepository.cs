using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IScheduleRepository
{
    Task<ScheduledDownload?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ScheduledDownload?> GetByDownloadIdAsync(Guid downloadId, CancellationToken cancellationToken = default);
    Task<List<ScheduledDownload>> GetAllAsync(bool activeOnly = false, CancellationToken cancellationToken = default);
    Task<List<ScheduledDownload>> GetPendingSchedulesAsync(DateTime currentTime, CancellationToken cancellationToken = default);
    Task<List<ScheduledDownload>> GetMissedSchedulesAsync(DateTime currentTime, CancellationToken cancellationToken = default);
    Task AddAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default);
    Task UpdateAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
