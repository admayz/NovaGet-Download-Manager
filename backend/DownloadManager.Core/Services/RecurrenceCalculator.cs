using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace DownloadManager.Core.Services;

public class RecurrenceCalculator
{
    private readonly ILogger<RecurrenceCalculator> _logger;

    public RecurrenceCalculator(ILogger<RecurrenceCalculator> logger)
    {
        _logger = logger;
    }

    public DateTime? CalculateNextRunTime(string? recurrencePattern, string? recurrenceData, DateTime lastRun)
    {
        if (string.IsNullOrEmpty(recurrencePattern))
        {
            return null;
        }

        try
        {
            RecurrenceInfo? recurrenceInfo = null;
            if (!string.IsNullOrEmpty(recurrenceData))
            {
                recurrenceInfo = JsonSerializer.Deserialize<RecurrenceInfo>(recurrenceData);
            }

            return recurrencePattern.ToLower() switch
            {
                "daily" => CalculateDailyNextRun(lastRun, recurrenceInfo),
                "weekly" => CalculateWeeklyNextRun(lastRun, recurrenceInfo),
                "monthly" => CalculateMonthlyNextRun(lastRun, recurrenceInfo),
                "custom" => CalculateCustomNextRun(lastRun, recurrenceInfo),
                _ => null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating next run time for pattern {Pattern}", recurrencePattern);
            return null;
        }
    }

    private DateTime CalculateDailyNextRun(DateTime lastRun, RecurrenceInfo? info)
    {
        var interval = info?.Interval ?? 1;
        var nextRun = lastRun.AddDays(interval);

        // If time of day is specified, set it
        if (info?.TimeOfDay.HasValue == true)
        {
            nextRun = nextRun.Date.Add(info.TimeOfDay.Value);
        }

        return nextRun;
    }

    private DateTime CalculateWeeklyNextRun(DateTime lastRun, RecurrenceInfo? info)
    {
        var interval = info?.Interval ?? 1;
        var daysOfWeek = info?.DaysOfWeek;

        if (daysOfWeek == null || !daysOfWeek.Any())
        {
            // Default to same day of week
            return lastRun.AddDays(7 * interval);
        }

        // Find next occurrence of specified days
        var nextRun = lastRun.AddDays(1);
        var weeksAdded = 0;

        while (true)
        {
            if (daysOfWeek.Contains(nextRun.DayOfWeek))
            {
                // Check if we've completed the required interval
                var weeksSinceLastRun = (nextRun - lastRun).Days / 7;
                if (weeksSinceLastRun >= interval || weeksAdded >= interval)
                {
                    break;
                }
            }

            nextRun = nextRun.AddDays(1);

            // Track when we've moved to a new week
            if (nextRun.DayOfWeek == DayOfWeek.Sunday && nextRun > lastRun.AddDays(7))
            {
                weeksAdded++;
            }

            // Safety check to prevent infinite loop
            if ((nextRun - lastRun).Days > 365)
            {
                _logger.LogWarning("Weekly recurrence calculation exceeded 365 days, returning default");
                return lastRun.AddDays(7 * interval);
            }
        }

        // Apply time of day if specified
        if (info?.TimeOfDay.HasValue == true)
        {
            nextRun = nextRun.Date.Add(info.TimeOfDay.Value);
        }

        return nextRun;
    }

    private DateTime CalculateMonthlyNextRun(DateTime lastRun, RecurrenceInfo? info)
    {
        var interval = info?.Interval ?? 1;
        var dayOfMonth = info?.DayOfMonth ?? lastRun.Day;

        var nextRun = lastRun.AddMonths(interval);

        // Handle day of month that doesn't exist in target month (e.g., Feb 31)
        var daysInMonth = DateTime.DaysInMonth(nextRun.Year, nextRun.Month);
        if (dayOfMonth > daysInMonth)
        {
            dayOfMonth = daysInMonth;
        }

        nextRun = new DateTime(nextRun.Year, nextRun.Month, dayOfMonth, 
            nextRun.Hour, nextRun.Minute, nextRun.Second, nextRun.Kind);

        // Apply time of day if specified
        if (info?.TimeOfDay.HasValue == true)
        {
            nextRun = nextRun.Date.Add(info.TimeOfDay.Value);
        }

        return nextRun;
    }

    private DateTime? CalculateCustomNextRun(DateTime lastRun, RecurrenceInfo? info)
    {
        if (info?.CronExpression == null)
        {
            _logger.LogWarning("Custom recurrence requires cron expression");
            return null;
        }

        // Placeholder for cron expression parsing
        // Would need a library like Cronos or NCrontab for full implementation
        _logger.LogWarning("Cron expression parsing not yet implemented: {Expression}", info.CronExpression);
        return null;
    }

    public bool ValidateRecurrencePattern(string pattern, string? recurrenceData)
    {
        if (string.IsNullOrEmpty(pattern))
        {
            return false;
        }

        var validPatterns = new[] { "daily", "weekly", "monthly", "custom" };
        if (!validPatterns.Contains(pattern.ToLower()))
        {
            return false;
        }

        // Validate recurrence data if provided
        if (!string.IsNullOrEmpty(recurrenceData))
        {
            try
            {
                var info = JsonSerializer.Deserialize<RecurrenceInfo>(recurrenceData);
                if (info == null)
                {
                    return false;
                }

                // Validate interval
                if (info.Interval < 1)
                {
                    return false;
                }

                // Pattern-specific validation
                if (pattern.ToLower() == "weekly" && info.DaysOfWeek != null)
                {
                    if (!info.DaysOfWeek.Any() || info.DaysOfWeek.Any(d => !Enum.IsDefined(typeof(DayOfWeek), d)))
                    {
                        return false;
                    }
                }

                if (pattern.ToLower() == "monthly" && info.DayOfMonth.HasValue)
                {
                    if (info.DayOfMonth < 1 || info.DayOfMonth > 31)
                    {
                        return false;
                    }
                }

                if (pattern.ToLower() == "custom" && string.IsNullOrEmpty(info.CronExpression))
                {
                    return false;
                }
            }
            catch (JsonException)
            {
                return false;
            }
        }

        return true;
    }

    public bool HasScheduleConflict(DateTime scheduledTime, List<ScheduledDownload> existingSchedules)
    {
        // Check if there's a schedule within 5 minutes of the proposed time
        var conflictWindow = TimeSpan.FromMinutes(5);

        foreach (var schedule in existingSchedules.Where(s => s.IsActive))
        {
            var scheduleTime = schedule.NextRun ?? schedule.ScheduledTime;
            var timeDifference = Math.Abs((scheduledTime - scheduleTime).TotalMinutes);

            if (timeDifference < conflictWindow.TotalMinutes)
            {
                return true;
            }
        }

        return false;
    }
}
