using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace DownloadManager.Core.Services;

public class ScheduleExecutorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly RecurrenceCalculator _recurrenceCalculator;
    private readonly ILogger<ScheduleExecutorService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public ScheduleExecutorService(
        IServiceProvider serviceProvider,
        RecurrenceCalculator recurrenceCalculator,
        ILogger<ScheduleExecutorService> logger)
    {
        _serviceProvider = serviceProvider;
        _recurrenceCalculator = recurrenceCalculator;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Schedule Executor Service started");

        // Process missed schedules on startup
        try
        {
            await ProcessMissedSchedulesOnStartupAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing missed schedules on startup");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndExecutePendingSchedulesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking pending schedules");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("Schedule Executor Service stopped");
    }

    private async Task ProcessMissedSchedulesOnStartupAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var missedScheduleHandler = scope.ServiceProvider.GetRequiredService<MissedScheduleHandler>();

        await missedScheduleHandler.ProcessMissedSchedulesOnStartupAsync(cancellationToken);
    }

    private async Task CheckAndExecutePendingSchedulesAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var scheduleRepository = scope.ServiceProvider.GetRequiredService<IScheduleRepository>();
        var downloadEngine = scope.ServiceProvider.GetRequiredService<IDownloadEngine>();

        var pendingSchedules = await scheduleRepository.GetPendingSchedulesAsync(DateTime.UtcNow, cancellationToken);

        if (pendingSchedules.Any())
        {
            _logger.LogInformation("Found {Count} pending schedules to execute", pendingSchedules.Count);
        }

        foreach (var schedule in pendingSchedules)
        {
            try
            {
                await ExecuteScheduledDownloadAsync(schedule, downloadEngine, scheduleRepository, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing schedule {ScheduleId} for download {DownloadId}", 
                    schedule.Id, schedule.DownloadId);
            }
        }
    }

    private async Task ExecuteScheduledDownloadAsync(
        ScheduledDownload schedule,
        IDownloadEngine downloadEngine,
        IScheduleRepository scheduleRepository,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Executing schedule {ScheduleId} for download {DownloadId}", 
            schedule.Id, schedule.DownloadId);

        try
        {
            // Check if download is already in progress
            var downloadStatus = await downloadEngine.GetStatusAsync(schedule.DownloadId);
            if (downloadStatus == DownloadStatus.Downloading)
            {
                _logger.LogWarning("Download {DownloadId} is already in progress, skipping scheduled execution", 
                    schedule.DownloadId);
                return;
            }

            // Start the download
            if (downloadStatus == DownloadStatus.Paused || downloadStatus == DownloadStatus.Pending)
            {
                await downloadEngine.ResumeDownloadAsync(schedule.DownloadId);
            }
            else
            {
                // Download might be completed or failed, log and skip
                _logger.LogInformation("Download {DownloadId} is in status {Status}, skipping scheduled execution", 
                    schedule.DownloadId, downloadStatus);
            }

            // Update schedule status
            schedule.LastRun = DateTime.UtcNow;

            // Calculate next run time if recurring
            if (!string.IsNullOrEmpty(schedule.RecurrencePattern))
            {
                schedule.NextRun = CalculateNextRunTime(schedule);
                _logger.LogInformation("Schedule {ScheduleId} next run calculated: {NextRun}", 
                    schedule.Id, schedule.NextRun);
            }
            else
            {
                // One-time schedule, deactivate it
                schedule.IsActive = false;
                _logger.LogInformation("One-time schedule {ScheduleId} completed and deactivated", schedule.Id);
            }

            await scheduleRepository.UpdateAsync(schedule, cancellationToken);

            // Send notification (placeholder for future notification service)
            _logger.LogInformation("Schedule {ScheduleId} executed successfully for download {DownloadId}", 
                schedule.Id, schedule.DownloadId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute schedule {ScheduleId}", schedule.Id);
            throw;
        }
    }

    private DateTime? CalculateNextRunTime(ScheduledDownload schedule)
    {
        if (string.IsNullOrEmpty(schedule.RecurrencePattern))
        {
            return null;
        }

        var lastRun = schedule.LastRun ?? schedule.ScheduledTime;
        return _recurrenceCalculator.CalculateNextRunTime(
            schedule.RecurrencePattern, 
            schedule.RecurrenceData, 
            lastRun);
    }
}
