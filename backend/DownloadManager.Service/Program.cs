using DownloadManager.Service;
using DownloadManager.Shared.Extensions;
using Serilog;

try
{
    var host = Host.CreateDefaultBuilder(args)
        .ConfigureLogging()
        .ConfigureServices((hostContext, services) =>
        {
            services.AddHostedService<Worker>();
        })
        .Build();

    Log.Information("Starting Download Manager Service");
    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Download Manager Service terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
