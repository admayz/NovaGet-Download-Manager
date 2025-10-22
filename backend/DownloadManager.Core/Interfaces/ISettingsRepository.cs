using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ISettingsRepository
{
    Task<Setting?> GetByKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<List<Setting>> GetAllAsync(CancellationToken cancellationToken = default);
    Task CreateAsync(Setting setting, CancellationToken cancellationToken = default);
    Task UpdateAsync(Setting setting, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}
