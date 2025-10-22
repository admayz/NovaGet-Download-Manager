using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DownloadManager.Core.Repositories;

public class SettingsRepository : ISettingsRepository
{
    private readonly DownloadManagerDbContext _context;
    private readonly ILogger<SettingsRepository> _logger;

    public SettingsRepository(DownloadManagerDbContext context, ILogger<SettingsRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Setting?> GetByKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.Settings
                .FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving setting with key {Key}", key);
            throw;
        }
    }

    public async Task<List<Setting>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.Settings.ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all settings");
            throw;
        }
    }

    public async Task CreateAsync(Setting setting, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.Settings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Created setting with key {Key}", setting.Key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating setting with key {Key}", setting.Key);
            throw;
        }
    }

    public async Task UpdateAsync(Setting setting, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.Settings.Update(setting);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Updated setting with key {Key}", setting.Key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating setting with key {Key}", setting.Key);
            throw;
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var setting = await GetByKeyAsync(key, cancellationToken);
            if (setting != null)
            {
                _context.Settings.Remove(setting);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Deleted setting with key {Key}", key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting setting with key {Key}", key);
            throw;
        }
    }
}
