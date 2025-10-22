using System.Collections.Concurrent;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Core.Data;
using DownloadManager.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace DownloadManager.Core.Services;

public class DownloadEngine : IDownloadEngine
{
    private readonly ILogger<DownloadEngine> _logger;
    private readonly IDbContextFactory<DownloadManagerDbContext> _dbContextFactory;
    private readonly IDownloadRepository _downloadRepository;
    private readonly ISegmentDownloader _segmentDownloader;
    private readonly IConnectionManager _connectionManager;
    private readonly IChecksumValidator _checksumValidator;
    private readonly IMirrorManager _mirrorManager;
    private readonly ISegmentMirrorAssigner _segmentMirrorAssigner;
    private readonly IMirrorFailoverHandler _mirrorFailoverHandler;
    
    private readonly ConcurrentDictionary<Guid, DownloadContext> _activeDownloads = new();
    private readonly ConcurrentDictionary<Guid, Subject<DownloadProgress>> _progressSubjects = new();
    private readonly SemaphoreSlim _concurrencyLimiter = new(5, 5); // Max 5 simultaneous downloads
    private readonly PriorityQueue<Guid, int> _downloadQueue = new();
    private readonly object _queueLock = new();

    public DownloadEngine(
        ILogger<DownloadEngine> logger,
        IDbContextFactory<DownloadManagerDbContext> dbContextFactory,
        IDownloadRepository downloadRepository,
        ISegmentDownloader segmentDownloader,
        IConnectionManager connectionManager,
        IChecksumValidator checksumValidator,
        IMirrorManager mirrorManager,
        ISegmentMirrorAssigner segmentMirrorAssigner,
        IMirrorFailoverHandler mirrorFailoverHandler)
    {
        _logger = logger;
        _dbContextFactory = dbContextFactory;
        _downloadRepository = downloadRepository;
        _segmentDownloader = segmentDownloader;
        _connectionManager = connectionManager;
        _checksumValidator = checksumValidator;
        _mirrorManager = mirrorManager;
        _segmentMirrorAssigner = segmentMirrorAssigner;
        _mirrorFailoverHandler = mirrorFailoverHandler;
    }

    public async Task<Guid> StartDownloadAsync(DownloadRequest request, CancellationToken ct = default)
    {
        _logger.LogInformation("Starting download for URL: {Url}", request.Url);

        // Create download task
        var downloadTask = new DownloadTask
        {
            Id = Guid.NewGuid(),
            Url = request.Url,
            Filename = request.Filename ?? Path.GetFileName(new Uri(request.Url).LocalPath),
            Status = DownloadStatus.Pending,
            Category = request.Category,
            SpeedLimit = request.SpeedLimit,
            Priority = request.Priority,
            Referrer = request.Referrer,
            UserAgent = request.Headers.GetValueOrDefault("User-Agent"),
            CreatedAt = DateTime.UtcNow,
            RetryCount = 0
        };

        // Save to database
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        dbContext.Downloads.Add(downloadTask);
        await dbContext.SaveChangesAsync(ct);

        // Add mirror URLs if provided
        if (request.MirrorUrls != null && request.MirrorUrls.Count > 0)
        {
            var mirrorUrls = request.MirrorUrls.Select((url, index) => new MirrorUrl
            {
                DownloadId = downloadTask.Id,
                Url = url,
                Priority = index,
                IsHealthy = true,
                ResponseTimeMs = 0
            }).ToList();

            dbContext.MirrorUrls.AddRange(mirrorUrls);
            await dbContext.SaveChangesAsync(ct);

            _logger.LogInformation("Added {Count} mirror URLs for download: {DownloadId}", 
                mirrorUrls.Count, downloadTask.Id);
        }

        // Add to queue
        lock (_queueLock)
        {
            _downloadQueue.Enqueue(downloadTask.Id, -request.Priority); // Negative for higher priority first
        }

        // Start processing if requested
        if (request.StartImmediately)
        {
            _ = ProcessDownloadQueueAsync(ct);
        }

        return downloadTask.Id;
    }

    public async Task PauseDownloadAsync(Guid downloadId, CancellationToken ct = default)
    {
        _logger.LogInformation("Pausing download: {DownloadId}", downloadId);

        if (_activeDownloads.TryGetValue(downloadId, out var context))
        {
            // Cancel all active segment downloads gracefully
            context.CancellationTokenSource.Cancel();
            
            // Wait for all segment tasks to complete
            try
            {
                await Task.WhenAll(context.SegmentTasks.Values);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancelling
            }
            
            // Save current progress and segment states to database
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
            await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
            
            try
            {
                var download = await dbContext.Downloads
                    .Include(d => d.Segments)
                    .FirstOrDefaultAsync(d => d.Id == downloadId, ct);
                
                if (download != null)
                {
                    // Update download status to Paused
                    download.Status = DownloadStatus.Paused;
                    download.LastModified = DateTime.UtcNow;
                    
                    // Save segment states with current progress
                    foreach (var segment in download.Segments)
                    {
                        if (context.SegmentProgress.TryGetValue(segment.SegmentIndex, out var progress))
                        {
                            segment.DownloadedBytes = progress;
                            segment.Status = segment.DownloadedBytes >= (segment.EndByte - segment.StartByte + 1) 
                                ? SegmentStatus.Completed 
                                : SegmentStatus.Pending;
                        }
                    }
                    
                    // Calculate total downloaded size
                    download.DownloadedSize = download.Segments.Sum(s => s.DownloadedBytes);
                    
                    await dbContext.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    
                    _logger.LogInformation("Download paused successfully: {DownloadId}, Downloaded: {Downloaded}/{Total} bytes", 
                        downloadId, download.DownloadedSize, download.TotalSize);
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                _logger.LogError(ex, "Failed to pause download: {DownloadId}", downloadId);
                throw;
            }
            
            // Release file handles and HTTP connections
            if (context.FileStream != null)
            {
                await context.FileStream.FlushAsync(ct);
                await context.FileStream.DisposeAsync();
                context.FileStream = null;
            }
            
            // Remove from active downloads
            _activeDownloads.TryRemove(downloadId, out _);
        }
        else
        {
            // Download not active, just update status in database
            await _downloadRepository.UpdateStatusAsync(downloadId, DownloadStatus.Paused, ct);
        }
    }

    public async Task ResumeDownloadAsync(Guid downloadId, CancellationToken ct = default)
    {
        _logger.LogInformation("Resuming download: {DownloadId}", downloadId);

        // Load download and segment states from database
        var download = await _downloadRepository.GetByIdWithSegmentsAsync(downloadId, ct);
        
        if (download == null)
        {
            _logger.LogWarning("Download not found: {DownloadId}", downloadId);
            return;
        }
        
        if (download.Status != DownloadStatus.Paused)
        {
            _logger.LogWarning("Download is not in paused state: {DownloadId}, Status: {Status}", 
                downloadId, download.Status);
            return;
        }

        // Verify server still supports range requests
        try
        {
            var supportsRange = await _connectionManager.SupportsRangeRequestsAsync(new Uri(download.Url));
            
            if (!supportsRange && download.Segments.Any(s => s.DownloadedBytes > 0))
            {
                _logger.LogWarning("Server no longer supports range requests, cannot resume: {DownloadId}", downloadId);
                
                await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
                var dbDownload = await dbContext.Downloads.FindAsync(new object[] { downloadId }, ct);
                if (dbDownload != null)
                {
                    dbDownload.ErrorMessage = "Server does not support resume. Please restart the download.";
                    await dbContext.SaveChangesAsync(ct);
                }
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify server capabilities for resume: {DownloadId}", downloadId);
            return;
        }

        // Update download status to Downloading
        await _downloadRepository.UpdateStatusAsync(downloadId, DownloadStatus.Pending, ct);

        // Add to download queue
        lock (_queueLock)
        {
            _downloadQueue.Enqueue(downloadId, -download.Priority);
        }

        // Start processing queue
        _ = ProcessDownloadQueueAsync(ct);
        
        _logger.LogInformation("Download queued for resume: {DownloadId}, Segments: {SegmentCount}, Progress: {Downloaded}/{Total} bytes",
            downloadId, download.Segments.Count, download.DownloadedSize, download.TotalSize);
    }

    public async Task CancelDownloadAsync(Guid downloadId, CancellationToken ct = default)
    {
        _logger.LogInformation("Cancelling download: {DownloadId}", downloadId);

        if (_activeDownloads.TryGetValue(downloadId, out var context))
        {
            context.CancellationTokenSource.Cancel();
        }

        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        var download = await dbContext.Downloads.FindAsync(new object[] { downloadId }, ct);
        if (download != null)
        {
            download.Status = DownloadStatus.Cancelled;
            await dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task<DownloadStatus> GetStatusAsync(Guid downloadId, CancellationToken ct = default)
    {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
        var download = await dbContext.Downloads.FindAsync(new object[] { downloadId }, ct);
        return download?.Status ?? DownloadStatus.Failed;
    }

    public IObservable<DownloadProgress> ObserveProgress(Guid downloadId)
    {
        return _progressSubjects.GetOrAdd(downloadId, _ => new Subject<DownloadProgress>());
    }

    private async Task ProcessDownloadQueueAsync(CancellationToken ct)
    {
        while (true)
        {
            Guid downloadId;
            lock (_queueLock)
            {
                if (!_downloadQueue.TryDequeue(out downloadId, out _))
                {
                    break;
                }
            }

            await _concurrencyLimiter.WaitAsync(ct);

            _ = Task.Run(async () =>
            {
                try
                {
                    await ExecuteDownloadAsync(downloadId, ct);
                }
                finally
                {
                    _concurrencyLimiter.Release();
                }
            }, ct);
        }
    }

    private async Task ExecuteDownloadAsync(Guid downloadId, CancellationToken ct)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var context = new DownloadContext { CancellationTokenSource = cts };
        _activeDownloads.TryAdd(downloadId, context);

        try
        {
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cts.Token);
            var download = await dbContext.Downloads
                .Include(d => d.Segments)
                .FirstOrDefaultAsync(d => d.Id == downloadId, cts.Token);

            if (download == null)
            {
                _logger.LogWarning("Download not found: {DownloadId}", downloadId);
                return;
            }

            download.Status = DownloadStatus.Downloading;
            download.StartedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cts.Token);

            // Get file size and check range support
            var supportsRange = await _connectionManager.SupportsRangeRequestsAsync(new Uri(download.Url));
            var fileSize = await GetFileSizeAsync(download.Url, cts.Token);
            download.TotalSize = fileSize;
            await dbContext.SaveChangesAsync(cts.Token);

            // Create segments if not exist
            if (download.Segments.Count == 0 && supportsRange && fileSize > 1024 * 1024) // > 1MB
            {
                var segments = CalculateSegments(fileSize, downloadId);
                dbContext.DownloadSegments.AddRange(segments);
                await dbContext.SaveChangesAsync(cts.Token);
                download.Segments = segments.ToList();
            }
            else if (download.Segments.Count == 0)
            {
                // Single segment download
                var segment = new DownloadSegment
                {
                    DownloadId = downloadId,
                    SegmentIndex = 0,
                    StartByte = 0,
                    EndByte = fileSize - 1,
                    Status = SegmentStatus.Pending
                };
                dbContext.DownloadSegments.Add(segment);
                await dbContext.SaveChangesAsync(cts.Token);
                download.Segments.Add(segment);
            }
            else
            {
                // Resuming download - reset failed segments to pending
                foreach (var segment in download.Segments.Where(s => s.Status == SegmentStatus.Failed))
                {
                    segment.Status = SegmentStatus.Pending;
                }
                await dbContext.SaveChangesAsync(cts.Token);
            }

            // Check mirror health and assign mirrors to segments
            if (download.MirrorUrls.Count > 0)
            {
                await _mirrorManager.CheckMirrorHealthAsync(downloadId, cts.Token);
                await _segmentMirrorAssigner.AssignMirrorsToSegmentsAsync(downloadId, cts.Token);
                
                // Reload segments with mirror assignments
                await dbContext.Entry(download).Collection(d => d.Segments).LoadAsync(cts.Token);
            }

            // Download segments
            var tempFilePath = Path.Combine(Path.GetTempPath(), $"{downloadId}.tmp");
            var fileStream = new FileStream(tempFilePath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None);
            
            // Pre-allocate file if new download
            if (fileStream.Length == 0)
            {
                fileStream.SetLength(fileSize);
            }
            
            context.FileStream = fileStream;

            var downloadTasks = download.Segments
                .Where(s => s.Status != SegmentStatus.Completed)
                .Select(segment =>
                {
                    var task = DownloadSegmentAsync(download, segment, fileStream, context, cts.Token);
                    context.SegmentTasks.TryAdd(segment.SegmentIndex, task);
                    return task;
                });

            await Task.WhenAll(downloadTasks);

            // Verify checksum if provided
            if (!string.IsNullOrEmpty(download.Checksum))
            {
                var isValid = await _checksumValidator.ValidateAsync(
                    tempFilePath, 
                    download.Checksum, 
                    download.ChecksumAlgorithm ?? Shared.Models.ChecksumAlgorithm.SHA256,
                    cts.Token);

                if (!isValid)
                {
                    throw new InvalidOperationException("Checksum validation failed");
                }
            }

            // Move to final location
            var finalPath = download.FilePath ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads",
                download.Filename);

            Directory.CreateDirectory(Path.GetDirectoryName(finalPath)!);
            File.Move(tempFilePath, finalPath, true);

            download.Status = DownloadStatus.Completed;
            download.CompletedAt = DateTime.UtcNow;
            download.FilePath = finalPath;
            await dbContext.SaveChangesAsync(cts.Token);

            _logger.LogInformation("Download completed: {DownloadId}", downloadId);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Download cancelled: {DownloadId}", downloadId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Download failed: {DownloadId}", downloadId);
            
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
            var download = await dbContext.Downloads.FindAsync(new object[] { downloadId }, ct);
            if (download != null)
            {
                download.Status = DownloadStatus.Failed;
                download.ErrorMessage = ex.Message;
                await dbContext.SaveChangesAsync(ct);
            }
        }
        finally
        {
            // Clean up file stream if still open
            if (context.FileStream != null)
            {
                await context.FileStream.DisposeAsync();
            }
            
            _activeDownloads.TryRemove(downloadId, out _);
            
            if (_progressSubjects.TryRemove(downloadId, out var subject))
            {
                subject.OnCompleted();
                subject.Dispose();
            }
        }
    }

    private async Task DownloadSegmentAsync(
        DownloadTask download,
        DownloadSegment segment,
        FileStream fileStream,
        DownloadContext context,
        CancellationToken ct)
    {
        const int maxFailoverAttempts = 3;
        int failoverAttempt = 0;

        while (failoverAttempt < maxFailoverAttempts)
        {
            try
            {
                var progress = new Progress<long>(bytesDownloaded =>
                {
                    segment.DownloadedBytes = bytesDownloaded;
                    context.SegmentProgress[segment.SegmentIndex] = bytesDownloaded;
                    PublishProgress(download);
                });

                // Use assigned mirror URL or fallback to primary URL
                var segmentUrl = await _segmentMirrorAssigner.GetSegmentUrlAsync(segment, ct) ?? download.Url;

                await _segmentDownloader.DownloadSegmentAsync(
                    new SegmentInfo
                    {
                        Url = segmentUrl,
                        SegmentIndex = segment.SegmentIndex,
                        StartByte = segment.StartByte + segment.DownloadedBytes,
                        EndByte = segment.EndByte,
                        SpeedLimit = download.SpeedLimit,
                        MirrorId = segment.AssignedMirrorId
                    },
                    fileStream,
                    progress,
                    ct);

                segment.Status = SegmentStatus.Completed;
                context.SegmentProgress[segment.SegmentIndex] = segment.EndByte - segment.StartByte + 1;
                
                await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
                dbContext.DownloadSegments.Update(segment);
                await dbContext.SaveChangesAsync(ct);

                // Success - exit retry loop
                break;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, 
                    "Segment download failed: {SegmentId}, Attempt: {Attempt}/{MaxAttempts}", 
                    segment.Id, failoverAttempt + 1, maxFailoverAttempts);

                segment.RetryCount++;
                segment.ErrorMessage = ex.Message;

                // Try automatic failover if mirrors are available
                if (download.MirrorUrls.Count > 0)
                {
                    var failoverSuccessful = await _mirrorFailoverHandler.HandleSegmentFailureAsync(
                        segment.Id,
                        ex.Message,
                        ct);

                    if (failoverSuccessful)
                    {
                        _logger.LogInformation(
                            "Failover successful for segment {SegmentId}, retrying download",
                            segment.Id);

                        // Reload segment with new mirror assignment
                        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
                        var reloadedSegment = await dbContext.DownloadSegments
                            .FirstOrDefaultAsync(s => s.Id == segment.Id, ct);
                        
                        if (reloadedSegment != null)
                        {
                            segment.MirrorUrl = reloadedSegment.MirrorUrl;
                            segment.AssignedMirrorId = reloadedSegment.AssignedMirrorId;
                        }

                        failoverAttempt++;
                        continue;
                    }
                }

                // No failover available or failover failed
                segment.Status = SegmentStatus.Failed;
                
                await using var failDbContext = await _dbContextFactory.CreateDbContextAsync(ct);
                failDbContext.DownloadSegments.Update(segment);
                await failDbContext.SaveChangesAsync(ct);

                throw;
            }
        }

        if (failoverAttempt >= maxFailoverAttempts)
        {
            _logger.LogError(
                "Segment download failed after {MaxAttempts} failover attempts: {SegmentId}",
                maxFailoverAttempts, segment.Id);
            
            segment.Status = SegmentStatus.Failed;
            segment.ErrorMessage = $"Failed after {maxFailoverAttempts} failover attempts";
            
            await using var dbContext = await _dbContextFactory.CreateDbContextAsync(ct);
            dbContext.DownloadSegments.Update(segment);
            await dbContext.SaveChangesAsync(ct);
        }
    }

    private void PublishProgress(DownloadTask download)
    {
        if (_progressSubjects.TryGetValue(download.Id, out var subject) && 
            _activeDownloads.TryGetValue(download.Id, out var context))
        {
            var totalDownloaded = download.Segments.Sum(s => s.DownloadedBytes);
            
            // Calculate current speed (bytes per second)
            var now = DateTime.UtcNow;
            var timeSinceLastCalc = (now - context.LastSpeedCalculation).TotalSeconds;
            
            if (timeSinceLastCalc >= 0.5) // Update speed every 500ms
            {
                var bytesSinceLastCalc = totalDownloaded - context.LastDownloadedBytes;
                context.CurrentSpeed = timeSinceLastCalc > 0 
                    ? (long)(bytesSinceLastCalc / timeSinceLastCalc) 
                    : 0;
                context.LastDownloadedBytes = totalDownloaded;
                context.LastSpeedCalculation = now;
            }
            
            // Calculate ETA
            var remainingBytes = download.TotalSize - totalDownloaded;
            var eta = context.CurrentSpeed > 0 
                ? TimeSpan.FromSeconds(remainingBytes / (double)context.CurrentSpeed)
                : TimeSpan.Zero;
            
            var progress = new DownloadProgress
            {
                DownloadId = download.Id,
                TotalBytes = download.TotalSize,
                DownloadedBytes = totalDownloaded,
                PercentComplete = download.TotalSize > 0 ? (double)totalDownloaded / download.TotalSize * 100 : 0,
                CurrentSpeed = context.CurrentSpeed,
                EstimatedTimeRemaining = eta,
                SegmentProgress = download.Segments.Select(s => new SegmentProgress
                {
                    SegmentIndex = s.SegmentIndex,
                    StartByte = s.StartByte,
                    EndByte = s.EndByte,
                    DownloadedBytes = s.DownloadedBytes,
                    PercentComplete = (double)s.DownloadedBytes / (s.EndByte - s.StartByte + 1) * 100,
                    Status = s.Status
                }).ToList()
            };

            subject.OnNext(progress);
        }
    }

    private List<DownloadSegment> CalculateSegments(long fileSize, Guid downloadId)
    {
        const int segmentCount = 8;
        var segmentSize = fileSize / segmentCount;
        var segments = new List<DownloadSegment>();

        for (int i = 0; i < segmentCount; i++)
        {
            var startByte = i * segmentSize;
            var endByte = (i == segmentCount - 1) ? fileSize - 1 : (i + 1) * segmentSize - 1;

            segments.Add(new DownloadSegment
            {
                DownloadId = downloadId,
                SegmentIndex = i,
                StartByte = startByte,
                EndByte = endByte,
                Status = SegmentStatus.Pending,
                DownloadedBytes = 0,
                RetryCount = 0
            });
        }

        return segments;
    }

    private async Task<long> GetFileSizeAsync(string url, CancellationToken ct)
    {
        using var client = await _connectionManager.GetClientAsync(new Uri(url));
        using var response = await client.SendAsync(
            new HttpRequestMessage(HttpMethod.Head, url),
            HttpCompletionOption.ResponseHeadersRead,
            ct);

        response.EnsureSuccessStatusCode();
        return response.Content.Headers.ContentLength ?? 0;
    }

    private class DownloadContext
    {
        public CancellationTokenSource CancellationTokenSource { get; set; } = new();
        public ConcurrentDictionary<int, Task> SegmentTasks { get; set; } = new();
        public ConcurrentDictionary<int, long> SegmentProgress { get; set; } = new();
        public FileStream? FileStream { get; set; }
        
        // Speed tracking
        public System.Diagnostics.Stopwatch Stopwatch { get; set; } = System.Diagnostics.Stopwatch.StartNew();
        public long LastDownloadedBytes { get; set; }
        public DateTime LastSpeedCalculation { get; set; } = DateTime.UtcNow;
        public long CurrentSpeed { get; set; }
    }
}

public class SegmentInfo
{
    public string Url { get; set; } = string.Empty;
    public int SegmentIndex { get; set; }
    public long StartByte { get; set; }
    public long EndByte { get; set; }
    public long? SpeedLimit { get; set; }
    public int? MirrorId { get; set; }
}
