namespace DownloadManager.Core.Interfaces;

public interface IRetryPolicy
{
    Task ExecuteAsync(Func<Task> operation, CancellationToken ct = default);
    Task<T> ExecuteAsync<T>(Func<Task<T>> operation, CancellationToken ct = default);
}
