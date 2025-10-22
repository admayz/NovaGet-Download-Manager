using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Data;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class SecurityScanner : ISecurityScanner
{
    private readonly DownloadManagerDbContext _dbContext;
    private readonly ILogger<SecurityScanner> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _virusTotalApiKey;
    private const string VirusTotalApiUrl = "https://www.virustotal.com/api/v3";
    private const int CacheExpirationDays = 7;

    public SecurityScanner(
        DownloadManagerDbContext dbContext,
        ILogger<SecurityScanner> logger,
        string? virusTotalApiKey = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(5)
        };
        _virusTotalApiKey = virusTotalApiKey ?? Environment.GetEnvironmentVariable("VIRUSTOTAL_API_KEY");
    }

    public async Task<ScanResult> ScanFileAsync(string filePath, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!File.Exists(filePath))
            {
                _logger.LogError("File not found for scanning: {FilePath}", filePath);
                return new ScanResult
                {
                    FilePath = filePath,
                    IsSafe = false,
                    ErrorMessage = "File not found",
                    ScannedAt = DateTime.UtcNow
                };
            }

            // Calculate file hash
            var fileHash = await CalculateFileHashAsync(filePath, cancellationToken);
            _logger.LogInformation("Calculated hash for file {FilePath}: {Hash}", filePath, fileHash);

            // Check cache first
            var cachedResult = await GetCachedScanResultAsync(fileHash, cancellationToken);
            if (cachedResult != null)
            {
                _logger.LogInformation("Using cached scan result for hash {Hash}", fileHash);
                cachedResult.FilePath = filePath;
                return cachedResult;
            }

            // If no API key, return safe by default (or implement local scanning)
            if (string.IsNullOrEmpty(_virusTotalApiKey))
            {
                _logger.LogWarning("VirusTotal API key not configured. Skipping malware scan.");
                var defaultResult = new ScanResult
                {
                    FilePath = filePath,
                    FileHash = fileHash,
                    IsSafe = true,
                    PositiveDetections = 0,
                    TotalScans = 0,
                    ScannedAt = DateTime.UtcNow,
                    ErrorMessage = "VirusTotal API key not configured"
                };
                
                await CacheScanResultAsync(defaultResult, cancellationToken);
                return defaultResult;
            }

            // Scan with VirusTotal
            var scanResult = await ScanWithVirusTotalAsync(filePath, fileHash, cancellationToken);
            
            // Cache the result
            await CacheScanResultAsync(scanResult, cancellationToken);

            return scanResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning file {FilePath}", filePath);
            return new ScanResult
            {
                FilePath = filePath,
                IsSafe = false,
                ErrorMessage = ex.Message,
                ScannedAt = DateTime.UtcNow
            };
        }
    }

    public async Task<bool> IsFileSafeAsync(string filePath, CancellationToken cancellationToken = default)
    {
        var scanResult = await ScanFileAsync(filePath, cancellationToken);
        return scanResult.IsSafe;
    }

    public async Task<ScanResult?> GetCachedScanResultAsync(string fileHash, CancellationToken cancellationToken = default)
    {
        var cached = await _dbContext.Set<FileScanCache>()
            .FirstOrDefaultAsync(c => c.FileHash == fileHash && c.ExpiresAt > DateTime.UtcNow, cancellationToken);

        if (cached == null)
            return null;

        return new ScanResult
        {
            FileHash = fileHash,
            IsSafe = cached.IsSafe,
            PositiveDetections = cached.PositiveDetections,
            TotalScans = cached.TotalScans,
            ScannedAt = cached.ScannedAt,
            DetectionDetails = string.IsNullOrEmpty(cached.ScanResultJson)
                ? new Dictionary<string, string>()
                : JsonSerializer.Deserialize<Dictionary<string, string>>(cached.ScanResultJson) ?? new Dictionary<string, string>()
        };
    }

    private async Task<string> CalculateFileHashAsync(string filePath, CancellationToken cancellationToken)
    {
        using var sha256 = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        var hashBytes = await sha256.ComputeHashAsync(stream, cancellationToken);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    private async Task<ScanResult> ScanWithVirusTotalAsync(string filePath, string fileHash, CancellationToken cancellationToken)
    {
        try
        {
            // First, check if file hash already exists in VirusTotal
            var existingReport = await GetVirusTotalReportAsync(fileHash, cancellationToken);
            if (existingReport != null)
            {
                return existingReport;
            }

            // If not found, upload file for scanning
            return await UploadFileToVirusTotalAsync(filePath, fileHash, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning with VirusTotal");
            return new ScanResult
            {
                FilePath = filePath,
                FileHash = fileHash,
                IsSafe = false,
                ErrorMessage = $"VirusTotal scan failed: {ex.Message}",
                ScannedAt = DateTime.UtcNow
            };
        }
    }

    private async Task<ScanResult?> GetVirusTotalReportAsync(string fileHash, CancellationToken cancellationToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{VirusTotalApiUrl}/files/{fileHash}");
            request.Headers.Add("x-apikey", _virusTotalApiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null; // File not in VirusTotal database
            }

            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var jsonDoc = JsonDocument.Parse(content);

            return ParseVirusTotalResponse(jsonDoc, fileHash);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting VirusTotal report for hash {Hash}", fileHash);
            throw;
        }
    }

    private async Task<ScanResult> UploadFileToVirusTotalAsync(string filePath, string fileHash, CancellationToken cancellationToken)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            
            // VirusTotal has file size limits (32MB for free API)
            if (fileInfo.Length > 32 * 1024 * 1024)
            {
                _logger.LogWarning("File {FilePath} is too large for VirusTotal upload ({Size} bytes)", filePath, fileInfo.Length);
                return new ScanResult
                {
                    FilePath = filePath,
                    FileHash = fileHash,
                    IsSafe = true, // Assume safe if too large to scan
                    ErrorMessage = "File too large for VirusTotal scan",
                    ScannedAt = DateTime.UtcNow
                };
            }

            using var content = new MultipartFormDataContent();
            using var fileStream = File.OpenRead(filePath);
            using var streamContent = new StreamContent(fileStream);
            content.Add(streamContent, "file", Path.GetFileName(filePath));

            var request = new HttpRequestMessage(HttpMethod.Post, $"{VirusTotalApiUrl}/files");
            request.Headers.Add("x-apikey", _virusTotalApiKey);
            request.Content = content;

            var response = await _httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            var jsonDoc = JsonDocument.Parse(responseContent);

            // Get the analysis ID
            var analysisId = jsonDoc.RootElement.GetProperty("data").GetProperty("id").GetString();
            
            // Wait for analysis to complete (with timeout)
            return await WaitForAnalysisAsync(analysisId!, fileHash, filePath, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to VirusTotal");
            throw;
        }
    }

    private async Task<ScanResult> WaitForAnalysisAsync(string analysisId, string fileHash, string filePath, CancellationToken cancellationToken)
    {
        const int maxAttempts = 10;
        const int delaySeconds = 5;

        for (int i = 0; i < maxAttempts; i++)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds), cancellationToken);

                var request = new HttpRequestMessage(HttpMethod.Get, $"{VirusTotalApiUrl}/analyses/{analysisId}");
                request.Headers.Add("x-apikey", _virusTotalApiKey);

                var response = await _httpClient.SendAsync(request, cancellationToken);
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);

                var status = jsonDoc.RootElement.GetProperty("data").GetProperty("attributes").GetProperty("status").GetString();

                if (status == "completed")
                {
                    return ParseVirusTotalResponse(jsonDoc, fileHash, filePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking analysis status");
            }
        }

        // Timeout - return inconclusive result
        return new ScanResult
        {
            FilePath = filePath,
            FileHash = fileHash,
            IsSafe = false,
            ErrorMessage = "VirusTotal analysis timeout",
            ScannedAt = DateTime.UtcNow
        };
    }

    private ScanResult ParseVirusTotalResponse(JsonDocument jsonDoc, string fileHash, string? filePath = null)
    {
        var attributes = jsonDoc.RootElement.GetProperty("data").GetProperty("attributes");
        var stats = attributes.GetProperty("last_analysis_stats");

        var malicious = stats.GetProperty("malicious").GetInt32();
        var suspicious = stats.GetProperty("suspicious").GetInt32();
        var undetected = stats.GetProperty("undetected").GetInt32();
        var harmless = stats.GetProperty("harmless").GetInt32();

        var totalScans = malicious + suspicious + undetected + harmless;
        var positiveDetections = malicious + suspicious;

        var detectionDetails = new Dictionary<string, string>();
        if (attributes.TryGetProperty("last_analysis_results", out var results))
        {
            foreach (var result in results.EnumerateObject())
            {
                var category = result.Value.GetProperty("category").GetString();
                if (category == "malicious" || category == "suspicious")
                {
                    var resultValue = result.Value.GetProperty("result").GetString();
                    detectionDetails[result.Name] = resultValue ?? "detected";
                }
            }
        }

        return new ScanResult
        {
            FilePath = filePath ?? string.Empty,
            FileHash = fileHash,
            IsSafe = positiveDetections == 0,
            PositiveDetections = positiveDetections,
            TotalScans = totalScans,
            DetectionDetails = detectionDetails,
            ScannedAt = DateTime.UtcNow
        };
    }

    private async Task CacheScanResultAsync(ScanResult scanResult, CancellationToken cancellationToken)
    {
        try
        {
            var cache = new FileScanCache
            {
                FileHash = scanResult.FileHash,
                IsSafe = scanResult.IsSafe,
                PositiveDetections = scanResult.PositiveDetections,
                TotalScans = scanResult.TotalScans,
                ScanResultJson = JsonSerializer.Serialize(scanResult.DetectionDetails),
                ScannedAt = scanResult.ScannedAt,
                ExpiresAt = DateTime.UtcNow.AddDays(CacheExpirationDays)
            };

            _dbContext.Set<FileScanCache>().Add(cache);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Cached scan result for hash {Hash}", scanResult.FileHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching scan result");
        }
    }
}
