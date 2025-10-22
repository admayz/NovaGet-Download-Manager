using Microsoft.AspNetCore.Mvc;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchedulerController : ControllerBase
{
    private readonly ILogger<SchedulerController> _logger;
    private readonly IScheduler _scheduler;
    private readonly IScheduleRepository _scheduleRepository;

    public SchedulerController(
        ILogger<SchedulerController> logger,
        IScheduler scheduler,
        IScheduleRepository scheduleRepository)
    {
        _logger = logger;
        _scheduler = scheduler;
        _scheduleRepository = scheduleRepository;
    }

    /// <summary>
    /// Create a new scheduled download
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateSchedule(
        [FromBody] CreateScheduleRequest request, 
        CancellationToken ct)
    {
        try
        {
            var schedule = await _scheduler.CreateScheduleAsync(
                request.DownloadId,
                request.ScheduledTime,
                request.RecurrencePattern,
                request.RecurrenceData,
                ct);

            var scheduleId = schedule.Id;

            _logger.LogInformation(
                "Created schedule {ScheduleId} for download {DownloadId} at {ScheduledTime}",
                scheduleId,
                request.DownloadId,
                request.ScheduledTime);

            return Ok(new { scheduleId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create schedule for download {DownloadId}", request.DownloadId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get all scheduled downloads
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ScheduledDownload>>> GetSchedules(
        [FromQuery] bool? activeOnly = null,
        CancellationToken ct = default)
    {
        try
        {
            List<ScheduledDownload> schedules;

            if (activeOnly == true)
            {
                schedules = await _scheduler.GetPendingSchedulesAsync(ct);
            }
            else
            {
                schedules = await _scheduleRepository.GetAllAsync(false, ct);
            }

            return Ok(schedules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get scheduled downloads");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific scheduled download by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ScheduledDownload>> GetSchedule(Guid id, CancellationToken ct)
    {
        try
        {
            var schedule = await _scheduleRepository.GetByIdAsync(id, ct);
            if (schedule == null)
            {
                return NotFound(new { error = "Schedule not found" });
            }

            return Ok(schedule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get schedule {ScheduleId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Cancel a scheduled download
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> CancelSchedule(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduler.CancelScheduleAsync(id, ct);

            _logger.LogInformation("Cancelled schedule {ScheduleId}", id);

            return Ok(new { message = "Schedule cancelled successfully" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Schedule not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel schedule {ScheduleId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update a scheduled download
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateSchedule(
        Guid id,
        [FromBody] UpdateScheduleRequest request,
        CancellationToken ct)
    {
        try
        {
            var schedule = await _scheduleRepository.GetByIdAsync(id, ct);
            if (schedule == null)
            {
                return NotFound(new { error = "Schedule not found" });
            }

            if (request.ScheduledTime.HasValue)
            {
                schedule.ScheduledTime = request.ScheduledTime.Value;
            }

            if (request.RecurrencePattern != null)
            {
                schedule.RecurrencePattern = request.RecurrencePattern;
            }

            if (request.RecurrenceData != null)
            {
                schedule.RecurrenceData = request.RecurrenceData;
            }

            if (request.IsActive.HasValue)
            {
                schedule.IsActive = request.IsActive.Value;
            }

            await _scheduleRepository.UpdateAsync(schedule, ct);

            _logger.LogInformation("Updated schedule {ScheduleId}", id);

            return Ok(new { message = "Schedule updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update schedule {ScheduleId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get pending schedules that are ready to execute
    /// </summary>
    [HttpGet("pending")]
    public async Task<ActionResult<List<ScheduledDownload>>> GetPendingSchedules(CancellationToken ct)
    {
        try
        {
            var pendingSchedules = await _scheduler.GetPendingSchedulesAsync(ct);
            return Ok(pendingSchedules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pending schedules");
            return BadRequest(new { error = ex.Message });
        }
    }
}

public class CreateScheduleRequest
{
    public Guid DownloadId { get; set; }
    public DateTime ScheduledTime { get; set; }
    public string? RecurrencePattern { get; set; }
    public string? RecurrenceData { get; set; }
}

public class UpdateScheduleRequest
{
    public DateTime? ScheduledTime { get; set; }
    public string? RecurrencePattern { get; set; }
    public string? RecurrenceData { get; set; }
    public bool? IsActive { get; set; }
}
