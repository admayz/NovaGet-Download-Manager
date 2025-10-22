using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Services;
using DownloadManager.Core.Repositories;

namespace DownloadManager.Core.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDownloadEngine(this IServiceCollection services)
    {
        services.AddScoped<IDownloadRepository, DownloadRepository>();
        services.AddScoped<IDownloadRecoveryService, DownloadRecoveryService>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IScheduleRepository, ScheduleRepository>();
        services.AddScoped<IScheduler, SchedulerService>();
        services.AddScoped<ISettingsRepository, SettingsRepository>();
        services.AddScoped<MissedScheduleHandler>();
        services.AddScoped<IFileManager, FileManager>();
        services.AddSingleton<ICookieHeaderManager, CookieHeaderManager>();
        services.AddSingleton<IConnectionManager, ConnectionManager>();
        services.AddSingleton<IRetryPolicy, RetryPolicy>();
        services.AddSingleton<IChecksumValidator, ChecksumValidator>();
        services.AddSingleton<GlobalSpeedLimiter>();
        services.AddSingleton<ISegmentDownloader, SegmentDownloader>();
        services.AddSingleton<IDownloadEngine, DownloadEngine>();
        services.AddSingleton<RecurrenceCalculator>();
        services.AddScoped<IVideoDetector, VideoDetector>();
        services.AddScoped<IHlsDownloader, HlsDownloader>();
        services.AddScoped<IDashDownloader, DashDownloader>();
        services.AddScoped<IVideoStreamDownloader, VideoStreamDownloader>();
        services.AddScoped<ISecurityScanner, SecurityScanner>();
        services.AddScoped<ISandboxManager, SandboxManager>();
        services.AddScoped<IQuarantineManager, QuarantineManager>();
        services.AddSingleton<ICertificateValidator>(sp => 
            new CertificateValidator(
                sp.GetRequiredService<ILogger<CertificateValidator>>(),
                strictValidation: true));
        services.AddHostedService<ScheduleExecutorService>();

        return services;
    }
}
