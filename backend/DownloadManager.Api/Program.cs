using Microsoft.EntityFrameworkCore;
using DownloadManager.Core.Data;
using DownloadManager.Core.Extensions;
using DownloadManager.Shared.Extensions;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog with structured logging
builder.Host.ConfigureLogging();

// Add services to the container.
builder.Services.AddDbContextFactory<DownloadManagerDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Data Source=downloadmanager.db"));

builder.Services.AddDbContext<DownloadManagerDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Data Source=downloadmanager.db"));

// Add download engine services
builder.Services.AddDownloadEngine();

// Configure CORS for localhost only
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalhostOnly", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", // Vite dev server
                "http://localhost:3000", // Alternative dev port
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Apply migrations automatically
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DownloadManagerDbContext>();
    db.Database.Migrate();
}

// Initialize download recovery on startup
using (var scope = app.Services.CreateScope())
{
    var recoveryService = scope.ServiceProvider.GetRequiredService<DownloadManager.Core.Interfaces.IDownloadRecoveryService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    try
    {
        // Detect incomplete downloads
        var incompleteDownloads = await recoveryService.DetectIncompleteDownloadsAsync();
        
        if (incompleteDownloads.Any())
        {
            logger.LogInformation("Found {Count} incomplete downloads", incompleteDownloads.Count);
            
            // Check if auto-resume is enabled in settings
            var autoResume = configuration.GetValue<bool>("DownloadSettings:AutoResumeOnStartup", false);
            
            foreach (var download in incompleteDownloads)
            {
                await recoveryService.RecoverDownloadAsync(download.Id, autoResume);
            }
        }
        
        // Clean up orphaned temporary files
        await recoveryService.CleanupOrphanedFilesAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to initialize download recovery");
    }
}

// Add correlation ID middleware
app.UseCorrelationId();

// Add token authentication middleware
app.UseTokenAuthentication();

// Add global exception handler
app.UseGlobalExceptionHandler();

// Add Serilog request logging with enrichment
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();
        diagnosticContext.Set("UserAgent", !string.IsNullOrEmpty(userAgent) ? userAgent : "Unknown");
    };
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("LocalhostOnly");

app.MapControllers();

app.Run();
