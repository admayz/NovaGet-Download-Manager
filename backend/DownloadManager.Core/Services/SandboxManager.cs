using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class SandboxManager : ISandboxManager
{
    private readonly ISecurityScanner _securityScanner;
    private readonly ILogger<SandboxManager> _logger;
    private readonly string _sandboxFolder;
    private readonly HashSet<string> _untrustedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".vbs", ".js", ".jar",
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".iso", ".dmg"
    };

    public SandboxManager(
        ISecurityScanner securityScanner,
        ILogger<SandboxManager> logger)
    {
        _securityScanner = securityScanner;
        _logger = logger;
        _sandboxFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads",
            ".sandbox"
        );
        EnsureSandboxFolderExists();
    }

    public void EnsureSandboxFolderExists()
    {
        if (!Directory.Exists(_sandboxFolder))
        {
            Directory.CreateDirectory(_sandboxFolder);
            _logger.LogInformation("Created sandbox folder at {SandboxFolder}", _sandboxFolder);
            
            // Set folder as hidden
            try
            {
                var dirInfo = new DirectoryInfo(_sandboxFolder);
                dirInfo.Attributes |= FileAttributes.Hidden;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to set sandbox folder as hidden");
            }
        }
    }

    public Task<string> GetSandboxPathAsync(string filename, CancellationToken cancellationToken = default)
    {
        var sandboxPath = Path.Combine(_sandboxFolder, filename);
        
        // Handle file name conflicts in sandbox
        if (File.Exists(sandboxPath))
        {
            var fileNameWithoutExt = Path.GetFileNameWithoutExtension(filename);
            var extension = Path.GetExtension(filename);
            var counter = 1;
            
            do
            {
                sandboxPath = Path.Combine(_sandboxFolder, $"{fileNameWithoutExt}_{counter}{extension}");
                counter++;
            } while (File.Exists(sandboxPath));
        }
        
        return Task.FromResult(sandboxPath);
    }

    public Task<bool> ShouldUseSandboxAsync(string filename, string? mimeType = null, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(filename);
        
        // Check if file extension is in untrusted list
        if (_untrustedExtensions.Contains(extension))
        {
            _logger.LogInformation("File {Filename} should use sandbox (untrusted extension: {Extension})", filename, extension);
            return Task.FromResult(true);
        }
        
        // Check MIME type for executables
        if (!string.IsNullOrEmpty(mimeType))
        {
            var untrustedMimeTypes = new[]
            {
                "application/x-msdownload",
                "application/x-msi",
                "application/x-executable",
                "application/x-dosexec",
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed"
            };
            
            if (untrustedMimeTypes.Any(m => mimeType.Contains(m, StringComparison.OrdinalIgnoreCase)))
            {
                _logger.LogInformation("File {Filename} should use sandbox (untrusted MIME type: {MimeType})", filename, mimeType);
                return Task.FromResult(true);
            }
        }
        
        return Task.FromResult(false);
    }

    public async Task<ScanResult> ScanAndMoveFromSandboxAsync(string sandboxPath, string destinationPath, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!File.Exists(sandboxPath))
            {
                _logger.LogError("Sandbox file not found: {SandboxPath}", sandboxPath);
                return new ScanResult
                {
                    FilePath = sandboxPath,
                    IsSafe = false,
                    ErrorMessage = "File not found in sandbox",
                    ScannedAt = DateTime.UtcNow
                };
            }

            _logger.LogInformation("Scanning file in sandbox: {SandboxPath}", sandboxPath);
            
            // Scan the file
            var scanResult = await _securityScanner.ScanFileAsync(sandboxPath, cancellationToken);
            
            if (scanResult.IsSafe)
            {
                _logger.LogInformation("File {SandboxPath} is safe. Moving to destination: {DestinationPath}", sandboxPath, destinationPath);
                
                // Ensure destination directory exists
                var destinationDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destinationDir) && !Directory.Exists(destinationDir))
                {
                    Directory.CreateDirectory(destinationDir);
                }
                
                // Move file from sandbox to destination
                File.Move(sandboxPath, destinationPath, overwrite: true);
                scanResult.FilePath = destinationPath;
            }
            else
            {
                _logger.LogWarning("File {SandboxPath} is potentially malicious. Detections: {Detections}/{Total}",
                    sandboxPath, scanResult.PositiveDetections, scanResult.TotalScans);
                
                // File remains in sandbox
            }
            
            return scanResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning and moving file from sandbox");
            return new ScanResult
            {
                FilePath = sandboxPath,
                IsSafe = false,
                ErrorMessage = ex.Message,
                ScannedAt = DateTime.UtcNow
            };
        }
    }

    public Task<bool> PromptUserForScanResultAsync(ScanResult scanResult, CancellationToken cancellationToken = default)
    {
        // This method would typically trigger a UI notification/prompt
        // For now, we'll implement a simple logic based on detection threshold
        
        if (scanResult.IsSafe)
        {
            return Task.FromResult(true);
        }
        
        // If there are detections, we need user confirmation
        // In a real implementation, this would show a dialog to the user
        // For now, we'll reject files with any detections
        
        _logger.LogWarning("File has {Detections} positive detections. User prompt required.", scanResult.PositiveDetections);
        
        // Return false to indicate file should not be moved from sandbox
        // In production, this would wait for actual user input
        return Task.FromResult(false);
    }
}
