using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Xml.Linq;

namespace DownloadManager.Core.Services;

public class DashDownloader : IDashDownloader
{
    private readonly ILogger<DashDownloader> _logger;
    private readonly IConnectionManager _connectionManager;

    public DashDownloader(ILogger<DashDownloader> logger, IConnectionManager connectionManager)
    {
        _logger = logger;
        _connectionManager = connectionManager;
    }

    public async Task<DashManifest> ParseManifestAsync(string url, Dictionary<string, string>? headers = null)
    {
        _logger.LogInformation("Parsing DASH manifest: {Url}", url);

        var client = await _connectionManager.GetClientAsync(new Uri(url));
        
        if (headers != null)
        {
            foreach (var header in headers)
            {
                client.DefaultRequestHeaders.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        var content = await client.GetStringAsync(url);
        var manifest = new DashManifest { Url = url };

        try
        {
            var doc = XDocument.Parse(content);
            var ns = doc.Root?.Name.Namespace ?? XNamespace.None;

            // Parse MPD attributes
            var mpdElement = doc.Root;
            if (mpdElement != null)
            {
                manifest.MediaPresentationDuration = mpdElement.Attribute("mediaPresentationDuration")?.Value;
                
                var minBufferTime = mpdElement.Attribute("minBufferTime")?.Value;
                if (!string.IsNullOrEmpty(minBufferTime))
                {
                    manifest.MinBufferTime = ParseDuration(minBufferTime);
                }
            }

            // Parse Period > AdaptationSet > Representation
            var periods = doc.Descendants(ns + "Period");
            foreach (var period in periods)
            {
                var adaptationSets = period.Elements(ns + "AdaptationSet");
                foreach (var adaptationSet in adaptationSets)
                {
                    var dashAdaptationSet = ParseAdaptationSet(adaptationSet, ns, url);
                    manifest.AdaptationSets.Add(dashAdaptationSet);
                }
            }

            _logger.LogInformation("Parsed DASH manifest: AdaptationSets={Count}", manifest.AdaptationSets.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse DASH manifest");
            throw;
        }

        return manifest;
    }

    public async Task<string> DownloadStreamAsync(string manifestUrl, string outputPath, IProgress<DownloadProgress>? progress = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Downloading DASH stream from: {Url} to {Output}", manifestUrl, outputPath);

        var manifest = await ParseManifestAsync(manifestUrl);

        // Select best video and audio representations
        var videoAdaptationSet = manifest.AdaptationSets
            .FirstOrDefault(a => a.ContentType == "video" || a.MimeType.Contains("video"));
        
        var audioAdaptationSet = manifest.AdaptationSets
            .FirstOrDefault(a => a.ContentType == "audio" || a.MimeType.Contains("audio"));

        if (videoAdaptationSet == null)
        {
            throw new InvalidOperationException("No video adaptation set found in manifest");
        }

        // Select best quality video
        var videoRepresentation = videoAdaptationSet.Representations
            .OrderByDescending(r => r.Bandwidth ?? 0)
            .First();

        // Select best quality audio
        DashRepresentation? audioRepresentation = null;
        if (audioAdaptationSet != null)
        {
            audioRepresentation = audioAdaptationSet.Representations
                .OrderByDescending(r => r.Bandwidth ?? 0)
                .FirstOrDefault();
        }

        var tempDir = Path.Combine(Path.GetTempPath(), $"dash_{Guid.NewGuid()}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var videoPath = Path.Combine(tempDir, "video.mp4");
            var audioPath = audioRepresentation != null ? Path.Combine(tempDir, "audio.mp4") : null;

            // Download video
            _logger.LogInformation("Downloading video representation: {Id}, Bandwidth: {Bandwidth}", 
                videoRepresentation.Id, videoRepresentation.Bandwidth);
            await DownloadRepresentationAsync(videoRepresentation, videoPath, progress, cancellationToken);

            // Download audio if separate
            if (audioRepresentation != null && audioPath != null)
            {
                _logger.LogInformation("Downloading audio representation: {Id}, Bandwidth: {Bandwidth}", 
                    audioRepresentation.Id, audioRepresentation.Bandwidth);
                await DownloadRepresentationAsync(audioRepresentation, audioPath, null, cancellationToken);

                // Merge video and audio
                _logger.LogInformation("Merging video and audio streams");
                await MergeVideoAudioAsync(videoPath, audioPath, outputPath, cancellationToken);
            }
            else
            {
                // Just move video file
                File.Move(videoPath, outputPath, true);
            }

            _logger.LogInformation("DASH stream download completed: {Output}", outputPath);
            return outputPath;
        }
        finally
        {
            // Cleanup temp directory
            try
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cleanup temp directory: {TempDir}", tempDir);
            }
        }
    }

    public async Task<string> MergeVideoAudioAsync(string videoPath, string audioPath, string outputPath, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Merging video and audio using FFmpeg");

        // Check if FFmpeg is available
        var ffmpegPath = FindFFmpeg();
        if (string.IsNullOrEmpty(ffmpegPath))
        {
            _logger.LogWarning("FFmpeg not found, copying video file without audio merge");
            File.Copy(videoPath, outputPath, true);
            return outputPath;
        }

        var arguments = $"-i \"{videoPath}\" -i \"{audioPath}\" -c:v copy -c:a aac -strict experimental \"{outputPath}\"";

        var processStartInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = processStartInfo };
        
        var outputBuilder = new System.Text.StringBuilder();
        var errorBuilder = new System.Text.StringBuilder();

        process.OutputDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                outputBuilder.AppendLine(e.Data);
            }
        };

        process.ErrorDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                errorBuilder.AppendLine(e.Data);
            }
        };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        await process.WaitForExitAsync(cancellationToken);

        if (process.ExitCode != 0)
        {
            _logger.LogError("FFmpeg failed with exit code {ExitCode}: {Error}", 
                process.ExitCode, errorBuilder.ToString());
            throw new InvalidOperationException($"FFmpeg merge failed: {errorBuilder}");
        }

        _logger.LogInformation("Successfully merged video and audio");
        return outputPath;
    }

    private DashAdaptationSet ParseAdaptationSet(XElement adaptationSet, XNamespace ns, string baseUrl)
    {
        var dashAdaptationSet = new DashAdaptationSet
        {
            Id = adaptationSet.Attribute("id")?.Value ?? Guid.NewGuid().ToString(),
            ContentType = adaptationSet.Attribute("contentType")?.Value ?? string.Empty,
            MimeType = adaptationSet.Attribute("mimeType")?.Value ?? string.Empty
        };

        // Infer content type from MIME type if not specified
        if (string.IsNullOrEmpty(dashAdaptationSet.ContentType))
        {
            if (dashAdaptationSet.MimeType.Contains("video"))
                dashAdaptationSet.ContentType = "video";
            else if (dashAdaptationSet.MimeType.Contains("audio"))
                dashAdaptationSet.ContentType = "audio";
        }

        var representations = adaptationSet.Elements(ns + "Representation");
        foreach (var representation in representations)
        {
            var dashRepresentation = ParseRepresentation(representation, ns, baseUrl);
            dashAdaptationSet.Representations.Add(dashRepresentation);
        }

        return dashAdaptationSet;
    }

    private DashRepresentation ParseRepresentation(XElement representation, XNamespace ns, string baseUrl)
    {
        var dashRepresentation = new DashRepresentation
        {
            Id = representation.Attribute("id")?.Value ?? string.Empty,
            Codecs = representation.Attribute("codecs")?.Value ?? string.Empty
        };

        if (int.TryParse(representation.Attribute("bandwidth")?.Value, out var bandwidth))
            dashRepresentation.Bandwidth = bandwidth;

        if (int.TryParse(representation.Attribute("width")?.Value, out var width))
            dashRepresentation.Width = width;

        if (int.TryParse(representation.Attribute("height")?.Value, out var height))
            dashRepresentation.Height = height;

        if (int.TryParse(representation.Attribute("audioSamplingRate")?.Value, out var samplingRate))
            dashRepresentation.AudioSamplingRate = samplingRate;

        // Parse BaseURL
        var baseUrlElement = representation.Element(ns + "BaseURL");
        if (baseUrlElement != null)
        {
            dashRepresentation.BaseUrl = ResolveUrl(baseUrl, baseUrlElement.Value);
        }

        // Parse SegmentTemplate or SegmentList
        var segmentTemplate = representation.Element(ns + "SegmentTemplate");
        if (segmentTemplate != null)
        {
            dashRepresentation.SegmentInfo = ParseSegmentTemplate(segmentTemplate, dashRepresentation.BaseUrl, baseUrl);
        }

        return dashRepresentation;
    }

    private DashSegmentInfo ParseSegmentTemplate(XElement segmentTemplate, string representationBaseUrl, string manifestBaseUrl)
    {
        var segmentInfo = new DashSegmentInfo();

        var initialization = segmentTemplate.Attribute("initialization")?.Value;
        if (!string.IsNullOrEmpty(initialization))
        {
            segmentInfo.InitializationUrl = ResolveUrl(representationBaseUrl ?? manifestBaseUrl, initialization);
        }

        var media = segmentTemplate.Attribute("media")?.Value;
        if (!string.IsNullOrEmpty(media))
        {
            segmentInfo.MediaUrlTemplate = media;
        }

        if (int.TryParse(segmentTemplate.Attribute("startNumber")?.Value, out var startNumber))
            segmentInfo.StartNumber = startNumber;

        if (int.TryParse(segmentTemplate.Attribute("timescale")?.Value, out var timescale))
            segmentInfo.Timescale = timescale;

        if (int.TryParse(segmentTemplate.Attribute("duration")?.Value, out var duration))
            segmentInfo.Duration = duration;

        return segmentInfo;
    }

    private async Task DownloadRepresentationAsync(DashRepresentation representation, string outputPath, IProgress<DownloadProgress>? progress, CancellationToken cancellationToken)
    {
        if (representation.SegmentInfo == null)
        {
            // Single file download
            if (!string.IsNullOrEmpty(representation.BaseUrl))
            {
                var client = await _connectionManager.GetClientAsync(new Uri(representation.BaseUrl));
                var data = await client.GetByteArrayAsync(representation.BaseUrl, cancellationToken);
                await File.WriteAllBytesAsync(outputPath, data, cancellationToken);
            }
            return;
        }

        var segmentInfo = representation.SegmentInfo;
        var tempDir = Path.GetDirectoryName(outputPath) ?? Path.GetTempPath();
        var segmentFiles = new List<string>();

        // Download initialization segment if present
        if (!string.IsNullOrEmpty(segmentInfo.InitializationUrl))
        {
            var initPath = Path.Combine(tempDir, "init.mp4");
            var client = await _connectionManager.GetClientAsync(new Uri(segmentInfo.InitializationUrl));
            var initData = await client.GetByteArrayAsync(segmentInfo.InitializationUrl, cancellationToken);
            await File.WriteAllBytesAsync(initPath, initData, cancellationToken);
            segmentFiles.Add(initPath);
        }

        // Generate segment URLs and download
        // For simplicity, assuming a fixed number of segments based on duration
        // In a real implementation, this would be calculated from the manifest
        var estimatedSegments = 100; // Placeholder
        
        for (int i = segmentInfo.StartNumber; i < segmentInfo.StartNumber + estimatedSegments; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var segmentUrl = segmentInfo.MediaUrlTemplate
                    .Replace("$Number$", i.ToString())
                    .Replace("$RepresentationID$", representation.Id);

                segmentUrl = ResolveUrl(representation.BaseUrl, segmentUrl);

                var segmentPath = Path.Combine(tempDir, $"segment_{i}.m4s");
                var client = await _connectionManager.GetClientAsync(new Uri(segmentUrl));
                var segmentData = await client.GetByteArrayAsync(segmentUrl, cancellationToken);
                await File.WriteAllBytesAsync(segmentPath, segmentData, cancellationToken);
                
                segmentFiles.Add(segmentPath);

                progress?.Report(new DownloadProgress
                {
                    DownloadId = Guid.Empty,
                    PercentComplete = (double)i / estimatedSegments * 100,
                    DownloadedBytes = i,
                    TotalBytes = estimatedSegments
                });
            }
            catch (HttpRequestException)
            {
                // Reached end of segments
                break;
            }
        }

        // Merge segments
        await MergeSegmentsAsync(segmentFiles, outputPath, cancellationToken);

        // Cleanup segment files
        foreach (var file in segmentFiles)
        {
            try { File.Delete(file); } catch { }
        }
    }

    private async Task MergeSegmentsAsync(List<string> segmentFiles, string outputPath, CancellationToken cancellationToken)
    {
        using var outputStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);

        foreach (var segmentFile in segmentFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            using var inputStream = new FileStream(segmentFile, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true);
            await inputStream.CopyToAsync(outputStream, 81920, cancellationToken);
        }

        await outputStream.FlushAsync(cancellationToken);
    }

    private string ResolveUrl(string baseUrl, string relativeUrl)
    {
        if (Uri.IsWellFormedUriString(relativeUrl, UriKind.Absolute))
        {
            return relativeUrl;
        }

        if (string.IsNullOrEmpty(baseUrl))
        {
            return relativeUrl;
        }

        var baseUri = new Uri(baseUrl);
        var resolvedUri = new Uri(baseUri, relativeUrl);
        return resolvedUri.ToString();
    }

    private int ParseDuration(string duration)
    {
        // Parse ISO 8601 duration format (e.g., PT10S = 10 seconds)
        if (duration.StartsWith("PT"))
        {
            duration = duration.Substring(2);
            if (duration.EndsWith("S"))
            {
                duration = duration.TrimEnd('S');
                if (int.TryParse(duration, out var seconds))
                {
                    return seconds;
                }
            }
        }
        return 0;
    }

    private string? FindFFmpeg()
    {
        // Try common locations
        var possiblePaths = new[]
        {
            "ffmpeg",
            "ffmpeg.exe",
            @"C:\ffmpeg\bin\ffmpeg.exe",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "ffmpeg", "bin", "ffmpeg.exe")
        };

        foreach (var path in possiblePaths)
        {
            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = path,
                    Arguments = "-version",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processStartInfo);
                if (process != null)
                {
                    process.WaitForExit(1000);
                    if (process.ExitCode == 0)
                    {
                        return path;
                    }
                }
            }
            catch
            {
                continue;
            }
        }

        return null;
    }
}
