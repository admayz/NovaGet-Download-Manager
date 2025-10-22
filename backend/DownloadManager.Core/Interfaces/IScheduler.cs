using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface IScheduler
{
    Task<ScheduledDownload> CreateScheduleAsync(Guid downloadId, DateTime scheduledTime, string? recurrencePattern = null, string? recurrenceData = null, CancellationToken cancellationToken = default);
    Task<ScheduledDownload?> GetScheduleByIdAsync(Guid scheduleId, CancellationToken cancellationToken = default);
    Task<List<ScheduledDownload>> GetAllSchedulesAsync(bool activeOnly = false, CancellationToken cancellationToken = default);
    Task<List<ScheduledDownload>> GetPendingSchedulesAsync(CancellationToken cancellationToken = default);
    Task<ScheduledDownload?> GetScheduleByDownloadIdAsync(Guid downloadId, CancellationToken cancellationToken = default);
    Task UpdateScheduleAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default);
    Task CancelScheduleAsync(Guid scheduleId, CancellationToken cancellationToken = default);
    Task DeleteScheduleAsync(Guid scheduleId, CancellationToken cancellationToken = default);
    Task<bool> ValidateScheduleAsync(DateTime scheduledTime, string? recurrencePattern = null, CancellationToken cancellationToken = default);
}
