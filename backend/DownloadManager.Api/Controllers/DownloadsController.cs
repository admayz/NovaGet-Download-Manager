using Microsoft.AspNetCore.Mvc;
using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Services;
using DownloadManager.Shared.Models;

namespace DownloadManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DownloadsController : ControllerBase
{
    private readonly ILogger<DownloadsController> _logger;
    private readonly IDownloadEngine _downloadEngine;
    private readonly IDownloadRepository _downloadRepository;
    private readonly GlobalSpeedLimiter _globalSpeedLimiter;

    public DownloadsController(
        ILogger<DownloadsController> logger,
        IDownloadEngine downloadEngine,
        IDownloadRepository downloadRepository,
        GlobalSpeedLimiter globalSpeedLimiter)
    {
        _logger = logger;
        _downloadEngine = downloadEngine;
        _downloadRepository = downloadRepository;
        _globalSpeedLimiter = globalSpeedLimiter;
    }

    /// <summary>
    /// Create a new download
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateDownload([FromBody] DownloadRequest request, CancellationToken ct)
    {
        try
        {
            var downloadId = await _downloadEngine.StartDownloadAsync(request, ct);
            return Ok(new { downloadId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create download");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get all downloads with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<DownloadTask>>> GetDownloads(
        [FromQuery] string? status = null,
        [FromQuery] string? category = null,
        CancellationToken ct = default)
    {
        try
        {
            var filter = new DownloadFilter
            {
                Status = status != null ? Enum.Parse<DownloadStatus>(status, true) : null,
                Category = category
            };

            var downloads = await _downloadRepository.GetAllAsync(filter, ct);
            return Ok(downloads);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get downloads");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get download details by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DownloadTask>> GetDownload(Guid id, CancellationToken ct)
    {
        try
        {
            var download = await _downloadRepository.GetByIdWithSegmentsAsync(id, ct);
            if (download == null)
            {
                return NotFound(new { error = "Download not found" });
            }
            return Ok(download);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get download {DownloadId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Pause a download
    /// </summary>
    [HttpPost("{id}/pause")]
    public async Task<ActionResult> PauseDownload(Guid id, CancellationToken ct)
    {
        try
        {
            await _downloadEngine.PauseDownloadAsync(id, ct);
            return Ok(new { message = "Download paused successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to pause download {DownloadId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Resume a download
    /// </summary>
    [HttpPost("{id}/resume")]
    public async Task<ActionResult> ResumeDownload(Guid id, CancellationToken ct)
    {
        try
        {
            await _downloadEngine.ResumeDownloadAsync(id, ct);
            return Ok(new { message = "Download resumed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resume download {DownloadId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Cancel/delete a download
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> CancelDownload(Guid id, CancellationToken ct)
    {
        try
        {
            await _downloadEngine.CancelDownloadAsync(id, ct);
            return Ok(new { message = "Download cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel download {DownloadId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update speed limit for a specific download
    /// </summary>
    [HttpPut("{id}/speed-limit")]
    public async Task<ActionResult> UpdateDownloadSpeedLimit(
        Guid id, 
        [FromBody] UpdateSpeedLimitRequest request, 
        CancellationToken ct)
    {
        try
        {
            var download = await _downloadRepository.GetByIdAsync(id, ct);
            if (download == null)
            {
                return NotFound(new { error = "Download not found" });
            }

            download.SpeedLimit = request.SpeedLimit;
            await _downloadRepository.UpdateAsync(download, ct);

            _logger.LogInformation(
                "Updated speed limit for download {DownloadId} to {SpeedLimit} bytes/sec",
                id,
                request.SpeedLimit?.ToString() ?? "unlimited");

            return Ok(new { message = "Speed limit updated successfully", speedLimit = request.SpeedLimit });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update speed limit for download {DownloadId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Set global speed limit for all downloads
    /// </summary>
    [HttpPut("global-speed-limit")]
    public ActionResult SetGlobalSpeedLimit([FromBody] UpdateSpeedLimitRequest request)
    {
        try
        {
            _globalSpeedLimiter.SetGlobalSpeedLimit(request.SpeedLimit);

            _logger.LogInformation(
                "Updated global speed limit to {SpeedLimit} bytes/sec",
                request.SpeedLimit?.ToString() ?? "unlimited");

            return Ok(new { message = "Global speed limit updated successfully", speedLimit = request.SpeedLimit });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update global speed limit");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get current global speed limit
    /// </summary>
    [HttpGet("global-speed-limit")]
    public ActionResult<long> GetGlobalSpeedLimit()
    {
        var speedLimit = _globalSpeedLimiter.SpeedLimit;
        return Ok(new { speedLimit = speedLimit > 0 ? speedLimit : (long?)null });
    }

    /// <summary>
    /// Stream real-time progress updates for a download using Server-Sent Events
    /// </summary>
    [HttpGet("{id}/progress")]
    public async Task StreamProgress(Guid id, CancellationToken ct)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        try
        {
            // Verify download exists
            var download = await _downloadRepository.GetByIdAsync(id, ct);
            if (download == null)
            {
                await WriteSSEAsync("error", new { message = "Download not found" }, ct);
                return;
            }

            _logger.LogInformation("Starting SSE stream for download {DownloadId}", id);

            // Subscribe to progress updates
            using var subscription = _downloadEngine.ObserveProgress(id).Subscribe(
                async progress =>
                {
                    try
                    {
                        await WriteSSEAsync("progress", progress, ct);
                        await Response.Body.FlushAsync(ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send progress update for download {DownloadId}", id);
                    }
                },
                error =>
                {
                    _logger.LogError(error, "Error in progress stream for download {DownloadId}", id);
                },
                () =>
                {
                    _logger.LogInformation("Progress stream completed for download {DownloadId}", id);
                });

            // Keep connection alive and send periodic heartbeats
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    // Send heartbeat every 15 seconds
                    await Task.Delay(15000, ct);
                    await WriteSSEAsync("heartbeat", new { timestamp = DateTime.UtcNow }, ct);
                    await Response.Body.FlushAsync(ct);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error sending heartbeat for download {DownloadId}", id);
                    break;
                }
            }

            _logger.LogInformation("SSE stream closed for download {DownloadId}", id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SSE stream for download {DownloadId}", id);
            await WriteSSEAsync("error", new { message = "Stream error occurred" }, ct);
        }
    }

    private async Task WriteSSEAsync(string eventType, object data, CancellationToken ct)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        });

        var message = $"event: {eventType}\ndata: {json}\n\n";
        var bytes = System.Text.Encoding.UTF8.GetBytes(message);
        await Response.Body.WriteAsync(bytes, ct);
    }
}

public class UpdateSpeedLimitRequest
{
    /// <summary>
    /// Speed limit in bytes per second. Null or 0 for unlimited.
    /// </summary>
    public long? SpeedLimit { get; set; }
}
