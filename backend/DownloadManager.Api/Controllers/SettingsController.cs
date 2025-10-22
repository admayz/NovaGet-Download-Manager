using Microsoft.AspNetCore.Mvc;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ILogger<SettingsController> _logger;
    private readonly ISettingsRepository _settingsRepository;

    public SettingsController(
        ILogger<SettingsController> logger,
        ISettingsRepository settingsRepository)
    {
        _logger = logger;
        _settingsRepository = settingsRepository;
    }

    /// <summary>
    /// Get all settings
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<Dictionary<string, object>>> GetAllSettings(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsRepository.GetAllAsync(ct);
            
            // Convert settings list to dictionary for easier consumption
            var settingsDict = settings.ToDictionary(
                s => s.Key,
                s => ParseSettingValue(s)
            );

            return Ok(settingsDict);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all settings");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific setting by key
    /// </summary>
    [HttpGet("{key}")]
    public async Task<ActionResult<object>> GetSetting(string key, CancellationToken ct)
    {
        try
        {
            var setting = await _settingsRepository.GetByKeyAsync(key, ct);
            if (setting == null)
            {
                return NotFound(new { error = $"Setting '{key}' not found" });
            }

            var value = ParseSettingValue(setting);
            return Ok(new { key = setting.Key, value, type = setting.Type });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get setting {Key}", key);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update settings (bulk update)
    /// </summary>
    [HttpPut]
    public async Task<ActionResult> UpdateSettings(
        [FromBody] Dictionary<string, object> settings,
        CancellationToken ct)
    {
        try
        {
            foreach (var kvp in settings)
            {
                var setting = await _settingsRepository.GetByKeyAsync(kvp.Key, ct);
                
                if (setting == null)
                {
                    // Create new setting
                    setting = new Setting
                    {
                        Key = kvp.Key,
                        Type = DetermineSettingType(kvp.Value),
                        Value = SerializeSettingValue(kvp.Value),
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _settingsRepository.CreateAsync(setting, ct);
                }
                else
                {
                    // Update existing setting
                    setting.Value = SerializeSettingValue(kvp.Value);
                    setting.Type = DetermineSettingType(kvp.Value);
                    setting.UpdatedAt = DateTime.UtcNow;
                    await _settingsRepository.UpdateAsync(setting, ct);
                }
            }

            _logger.LogInformation("Updated {Count} settings", settings.Count);

            return Ok(new { message = "Settings updated successfully", count = settings.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update settings");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update a single setting
    /// </summary>
    [HttpPut("{key}")]
    public async Task<ActionResult> UpdateSetting(
        string key,
        [FromBody] UpdateSettingRequest request,
        CancellationToken ct)
    {
        try
        {
            var setting = await _settingsRepository.GetByKeyAsync(key, ct);

            if (setting == null)
            {
                // Create new setting
                setting = new Setting
                {
                    Key = key,
                    Type = DetermineSettingType(request.Value),
                    Value = SerializeSettingValue(request.Value),
                    UpdatedAt = DateTime.UtcNow
                };
                await _settingsRepository.CreateAsync(setting, ct);
                
                _logger.LogInformation("Created new setting {Key}", key);
                
                return CreatedAtAction(nameof(GetSetting), new { key }, new { key, value = request.Value });
            }
            else
            {
                // Update existing setting
                setting.Value = SerializeSettingValue(request.Value);
                setting.Type = DetermineSettingType(request.Value);
                setting.UpdatedAt = DateTime.UtcNow;
                await _settingsRepository.UpdateAsync(setting, ct);

                _logger.LogInformation("Updated setting {Key}", key);

                return Ok(new { message = "Setting updated successfully", key, value = request.Value });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update setting {Key}", key);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Delete a setting
    /// </summary>
    [HttpDelete("{key}")]
    public async Task<ActionResult> DeleteSetting(string key, CancellationToken ct)
    {
        try
        {
            var setting = await _settingsRepository.GetByKeyAsync(key, ct);
            if (setting == null)
            {
                return NotFound(new { error = $"Setting '{key}' not found" });
            }

            await _settingsRepository.DeleteAsync(key, ct);

            _logger.LogInformation("Deleted setting {Key}", key);

            return Ok(new { message = "Setting deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete setting {Key}", key);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Reset all settings to defaults
    /// </summary>
    [HttpPost("reset")]
    public async Task<ActionResult> ResetSettings(CancellationToken ct)
    {
        try
        {
            // Get all settings
            var settings = await _settingsRepository.GetAllAsync(ct);

            // Delete all non-system settings
            foreach (var setting in settings)
            {
                await _settingsRepository.DeleteAsync(setting.Key, ct);
            }

            // Reinitialize default settings
            await InitializeDefaultSettingsAsync(ct);

            _logger.LogInformation("Reset all settings to defaults");

            return Ok(new { message = "Settings reset to defaults successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reset settings");
            return BadRequest(new { error = ex.Message });
        }
    }

    private static object ParseSettingValue(Setting setting)
    {
        return setting.Type switch
        {
            SettingType.Number => long.TryParse(setting.Value, out var num) ? num : 0,
            SettingType.Boolean => bool.TryParse(setting.Value, out var b) && b,
            SettingType.Json => System.Text.Json.JsonSerializer.Deserialize<object>(setting.Value) ?? setting.Value,
            _ => setting.Value
        };
    }

    private static string SerializeSettingValue(object value)
    {
        return value switch
        {
            string s => s,
            bool b => b.ToString().ToLower(),
            int or long or double or float => value.ToString() ?? "0",
            _ => System.Text.Json.JsonSerializer.Serialize(value)
        };
    }

    private static SettingType DetermineSettingType(object value)
    {
        return value switch
        {
            string => SettingType.String,
            bool => SettingType.Boolean,
            int or long or double or float => SettingType.Number,
            _ => SettingType.Json
        };
    }

    private async Task InitializeDefaultSettingsAsync(CancellationToken ct)
    {
        var defaultSettings = new Dictionary<string, (string value, SettingType type)>
        {
            { "MaxConcurrentDownloads", ("5", SettingType.Number) },
            { "DefaultDownloadPath", (Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads"), SettingType.String) },
            { "AutoResumeOnStartup", ("false", SettingType.Boolean) },
            { "EnableClipboardWatcher", ("false", SettingType.Boolean) },
            { "EnableMalwareScanning", ("false", SettingType.Boolean) },
            { "DefaultSegmentSize", ("1048576", SettingType.Number) }, // 1MB
            { "MaxRetries", ("5", SettingType.Number) },
            { "ConnectionTimeout", ("30", SettingType.Number) }, // seconds
            { "EnableNotifications", ("true", SettingType.Boolean) },
            { "Theme", ("light", SettingType.String) }
        };

        foreach (var (key, (value, type)) in defaultSettings)
        {
            var existing = await _settingsRepository.GetByKeyAsync(key, ct);
            if (existing == null)
            {
                await _settingsRepository.CreateAsync(new Setting
                {
                    Key = key,
                    Value = value,
                    Type = type,
                    UpdatedAt = DateTime.UtcNow
                }, ct);
            }
        }
    }
}

public class UpdateSettingRequest
{
    public object Value { get; set; } = null!;
}
