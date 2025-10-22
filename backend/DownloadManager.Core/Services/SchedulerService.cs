using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace DownloadManager.Core.Services;

public class SchedulerService : IScheduler
{
    private readonly IScheduleRepository _scheduleRepository;
    private readonly IDownloadRepository _downloadRepository;
    private readonly RecurrenceCalculator _recurrenceCalculator;
    private readonly ILogger<SchedulerService> _logger;

    public SchedulerService(
        IScheduleRepository scheduleRepository,
        IDownloadRepository downloadRepository,
        RecurrenceCalculator recurrenceCalculator,
        ILogger<SchedulerService> logger)
    {
        _scheduleRepository = scheduleRepository;
        _downloadRepository = downloadRepository;
        _recurrenceCalculator = recurrenceCalculator;
        _logger = logger;
    }

    public async Task<ScheduledDownload> CreateScheduleAsync(
        Guid downloadId, 
        DateTime scheduledTime, 
        string? recurrencePattern = null, 
        string? recurrenceData = null, 
        CancellationToken cancellationToken = default)
    {
        // Validate download exists
        var download = await _downloadRepository.GetByIdAsync(downloadId, cancellationToken);
        if (download == null)
        {
            throw new ArgumentException($"Download with ID {downloadId} not found", nameof(downloadId));
        }

        // Validate schedule time
        if (!await ValidateScheduleAsync(scheduledTime, recurrencePattern, cancellationToken))
        {
            throw new ArgumentException("Invalid schedule time or recurrence pattern");
        }

        // Check if schedule already exists for this download
        var existingSchedule = await _scheduleRepository.GetByDownloadIdAsync(downloadId, cancellationToken);
        if (existingSchedule != null)
        {
            throw new InvalidOperationException($"Schedule already exists for download {downloadId}");
        }

        var schedule = new ScheduledDownload
        {
            Id = Guid.NewGuid(),
            DownloadId = downloadId,
            ScheduledTime = scheduledTime,
            RecurrencePattern = recurrencePattern,
            RecurrenceData = recurrenceData,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            NextRun = scheduledTime
        };

        await _scheduleRepository.AddAsync(schedule, cancellationToken);
        _logger.LogInformation("Created schedule {ScheduleId} for download {DownloadId} at {ScheduledTime}", 
            schedule.Id, downloadId, scheduledTime);

        return schedule;
    }

    public async Task<ScheduledDownload?> GetScheduleByIdAsync(Guid scheduleId, CancellationToken cancellationToken = default)
    {
        return await _scheduleRepository.GetByIdAsync(scheduleId, cancellationToken);
    }

    public async Task<List<ScheduledDownload>> GetAllSchedulesAsync(bool activeOnly = false, CancellationToken cancellationToken = default)
    {
        return await _scheduleRepository.GetAllAsync(activeOnly, cancellationToken);
    }

    public async Task<List<ScheduledDownload>> GetPendingSchedulesAsync(CancellationToken cancellationToken = default)
    {
        return await _scheduleRepository.GetPendingSchedulesAsync(DateTime.UtcNow, cancellationToken);
    }

    public async Task<ScheduledDownload?> GetScheduleByDownloadIdAsync(Guid downloadId, CancellationToken cancellationToken = default)
    {
        return await _scheduleRepository.GetByDownloadIdAsync(downloadId, cancellationToken);
    }

    public async Task UpdateScheduleAsync(ScheduledDownload schedule, CancellationToken cancellationToken = default)
    {
        var existing = await _scheduleRepository.GetByIdAsync(schedule.Id, cancellationToken);
        if (existing == null)
        {
            throw new ArgumentException($"Schedule with ID {schedule.Id} not found");
        }

        await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
        _logger.LogInformation("Updated schedule {ScheduleId}", schedule.Id);
    }

    public async Task CancelScheduleAsync(Guid scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await _scheduleRepository.GetByIdAsync(scheduleId, cancellationToken);
        if (schedule == null)
        {
            throw new ArgumentException($"Schedule with ID {scheduleId} not found");
        }

        schedule.IsActive = false;
        await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
        _logger.LogInformation("Cancelled schedule {ScheduleId}", scheduleId);
    }

    public async Task DeleteScheduleAsync(Guid scheduleId, CancellationToken cancellationToken = default)
    {
        await _scheduleRepository.DeleteAsync(scheduleId, cancellationToken);
        _logger.LogInformation("Deleted schedule {ScheduleId}", scheduleId);
    }

    public async Task<bool> ValidateScheduleAsync(DateTime scheduledTime, string? recurrencePattern = null, CancellationToken cancellationToken = default)
    {
        // Validate scheduled time is in the future
        if (scheduledTime <= DateTime.UtcNow)
        {
            _logger.LogWarning("Schedule time {ScheduledTime} is in the past", scheduledTime);
            return false;
        }

        // Validate recurrence pattern if provided
        if (!string.IsNullOrEmpty(recurrencePattern))
        {
            if (!_recurrenceCalculator.ValidateRecurrencePattern(recurrencePattern, null))
            {
                _logger.LogWarning("Invalid recurrence pattern: {RecurrencePattern}", recurrencePattern);
                return false;
            }
        }

        // Check for schedule conflicts
        var existingSchedules = await _scheduleRepository.GetAllAsync(activeOnly: true, cancellationToken);
        if (_recurrenceCalculator.HasScheduleConflict(scheduledTime, existingSchedules))
        {
            _logger.LogWarning("Schedule conflict detected for time {ScheduledTime}", scheduledTime);
            return false;
        }

        return true;
    }
}
