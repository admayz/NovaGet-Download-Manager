using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Services;

public class MissedScheduleHandler
{
    private readonly IScheduleRepository _scheduleRepository;
    private readonly RecurrenceCalculator _recurrenceCalculator;
    private readonly ILogger<MissedScheduleHandler> _logger;

    public MissedScheduleHandler(
        IScheduleRepository scheduleRepository,
        RecurrenceCalculator recurrenceCalculator,
        ILogger<MissedScheduleHandler> logger)
    {
        _scheduleRepository = scheduleRepository;
        _recurrenceCalculator = recurrenceCalculator;
        _logger = logger;
    }

    public async Task<List<ScheduledDownload>> DetectMissedSchedulesAsync(CancellationToken cancellationToken = default)
    {
        var currentTime = DateTime.UtcNow;
        var missedSchedules = await _scheduleRepository.GetMissedSchedulesAsync(currentTime, cancellationToken);

        if (missedSchedules.Any())
        {
            _logger.LogWarning("Detected {Count} missed schedules", missedSchedules.Count);
        }

        return missedSchedules;
    }

    public async Task HandleMissedScheduleAsync(
        ScheduledDownload schedule, 
        MissedScheduleAction action,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Handling missed schedule {ScheduleId} with action {Action}", 
            schedule.Id, action);

        switch (action)
        {
            case MissedScheduleAction.RunNow:
                await RunMissedScheduleNowAsync(schedule, cancellationToken);
                break;

            case MissedScheduleAction.Skip:
                await SkipMissedScheduleAsync(schedule, cancellationToken);
                break;

            case MissedScheduleAction.Cancel:
                await CancelMissedScheduleAsync(schedule, cancellationToken);
                break;

            default:
                _logger.LogWarning("Unknown missed schedule action: {Action}", action);
                break;
        }
    }

    private async Task RunMissedScheduleNowAsync(ScheduledDownload schedule, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running missed schedule {ScheduleId} immediately", schedule.Id);

        // Mark as last run now
        schedule.LastRun = DateTime.UtcNow;

        // Calculate next run if recurring
        if (!string.IsNullOrEmpty(schedule.RecurrencePattern))
        {
            schedule.NextRun = _recurrenceCalculator.CalculateNextRunTime(
                schedule.RecurrencePattern,
                schedule.RecurrenceData,
                schedule.LastRun.Value);

            _logger.LogInformation("Next run for schedule {ScheduleId} calculated: {NextRun}", 
                schedule.Id, schedule.NextRun);
        }
        else
        {
            // One-time schedule, deactivate after running
            schedule.IsActive = false;
            _logger.LogInformation("One-time missed schedule {ScheduleId} will be deactivated after execution", 
                schedule.Id);
        }

        await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
    }

    private async Task SkipMissedScheduleAsync(ScheduledDownload schedule, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Skipping missed schedule {ScheduleId}", schedule.Id);

        if (!string.IsNullOrEmpty(schedule.RecurrencePattern))
        {
            // For recurring schedules, calculate next run from the missed time
            var missedTime = schedule.NextRun ?? schedule.ScheduledTime;
            schedule.NextRun = _recurrenceCalculator.CalculateNextRunTime(
                schedule.RecurrencePattern,
                schedule.RecurrenceData,
                missedTime);

            _logger.LogInformation("Next run for skipped schedule {ScheduleId} calculated: {NextRun}", 
                schedule.Id, schedule.NextRun);

            await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
        }
        else
        {
            // One-time schedule, deactivate it
            schedule.IsActive = false;
            await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
            _logger.LogInformation("One-time missed schedule {ScheduleId} deactivated", schedule.Id);
        }
    }

    private async Task CancelMissedScheduleAsync(ScheduledDownload schedule, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Cancelling missed schedule {ScheduleId}", schedule.Id);

        schedule.IsActive = false;
        await _scheduleRepository.UpdateAsync(schedule, cancellationToken);
    }

    public async Task ProcessMissedSchedulesOnStartupAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing missed schedules on application startup");

        var missedSchedules = await DetectMissedSchedulesAsync(cancellationToken);

        if (!missedSchedules.Any())
        {
            _logger.LogInformation("No missed schedules detected");
            return;
        }

        _logger.LogInformation("Found {Count} missed schedules. Applying catch-up logic", missedSchedules.Count);

        foreach (var schedule in missedSchedules)
        {
            try
            {
                // Apply default catch-up logic based on schedule type
                if (!string.IsNullOrEmpty(schedule.RecurrencePattern))
                {
                    // For recurring schedules, skip to next occurrence
                    await HandleMissedScheduleAsync(schedule, MissedScheduleAction.Skip, cancellationToken);
                }
                else
                {
                    // For one-time schedules, keep them active for user decision
                    // They will appear in the missed schedules list
                    _logger.LogInformation("One-time missed schedule {ScheduleId} kept active for user decision", 
                        schedule.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing missed schedule {ScheduleId}", schedule.Id);
            }
        }
    }

    public async Task<int> GetMissedScheduleCountAsync(CancellationToken cancellationToken = default)
    {
        var missedSchedules = await DetectMissedSchedulesAsync(cancellationToken);
        return missedSchedules.Count;
    }
}

public enum MissedScheduleAction
{
    RunNow,
    Skip,
    Cancel
}
