using Microsoft.AspNetCore.Mvc;

namespace DownloadManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ILogger<HealthController> _logger;

    public HealthController(ILogger<HealthController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Get()
    {
        _logger.LogInformation("Health check endpoint called");
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    [HttpGet("error")]
    public IActionResult TestError()
    {
        _logger.LogWarning("Testing error handling");
        throw new InvalidOperationException("This is a test error to verify global exception handling");
    }

    [HttpGet("notfound")]
    public IActionResult TestNotFound()
    {
        _logger.LogWarning("Testing not found error");
        throw new KeyNotFoundException("Resource not found");
    }
}
