using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace DownloadManager.Core.Services;

public class HlsDownloader : IHlsDownloader
{
    private readonly ILogger<HlsDownloader> _logger;
    private readonly IConnectionManager _connectionManager;

    public HlsDownloader(ILogger<HlsDownloader> logger, IConnectionManager connectionManager)
    {
        _logger = logger;
        _connectionManager = connectionManager;
    }

    public async Task<HlsPlaylist> ParsePlaylistAsync(string url, Dictionary<string, string>? headers = null)
    {
        _logger.LogInformation("Parsing HLS playlist: {Url}", url);

        var client = await _connectionManager.GetClientAsync(new Uri(url));
        
        if (headers != null)
        {
            foreach (var header in headers)
            {
                client.DefaultRequestHeaders.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        var content = await client.GetStringAsync(url);
        var playlist = new HlsPlaylist { Url = url };

        var lines = content.Split('\n').Select(l => l.Trim()).ToList();

        // Check if it's a master playlist
        if (content.Contains("#EXT-X-STREAM-INF"))
        {
            playlist.IsMasterPlaylist = true;
            ParseMasterPlaylist(lines, url, playlist);
        }
        else
        {
            playlist.IsMasterPlaylist = false;
            ParseMediaPlaylist(lines, url, playlist);
        }

        _logger.LogInformation("Parsed HLS playlist: Master={IsMaster}, Variants={Variants}, Segments={Segments}", 
            playlist.IsMasterPlaylist, playlist.Variants.Count, playlist.Segments.Count);

        return playlist;
    }

    public async Task<string> DownloadStreamAsync(string playlistUrl, string outputPath, IProgress<DownloadProgress>? progress = null, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Downloading HLS stream from: {Url} to {Output}", playlistUrl, outputPath);

        var playlist = await ParsePlaylistAsync(playlistUrl);

        // If master playlist, select best variant
        if (playlist.IsMasterPlaylist && playlist.Variants.Any())
        {
            var bestVariant = playlist.Variants
                .OrderByDescending(v => v.Bandwidth ?? 0)
                .First();
            
            _logger.LogInformation("Selected variant with bandwidth: {Bandwidth}", bestVariant.Bandwidth);
            playlist = await ParsePlaylistAsync(bestVariant.Url);
        }

        if (!playlist.Segments.Any())
        {
            throw new InvalidOperationException("No segments found in playlist");
        }

        // Get decryption key if encrypted
        byte[]? decryptionKey = null;
        if (playlist.IsEncrypted && playlist.Encryption != null)
        {
            decryptionKey = await GetDecryptionKeyAsync(playlist.Encryption);
            _logger.LogInformation("Retrieved decryption key for encrypted stream");
        }

        // Download all segments
        var tempDir = Path.Combine(Path.GetTempPath(), $"hls_{Guid.NewGuid()}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var segmentFiles = new List<string>();
            var totalSegments = playlist.Segments.Count;
            var downloadedSegments = 0;

            foreach (var segment in playlist.Segments)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var segmentPath = Path.Combine(tempDir, $"segment_{segment.Sequence}.ts");
                await DownloadSegmentAsync(segment.Url, segmentPath, decryptionKey, playlist.Encryption?.Iv, cancellationToken);
                
                segmentFiles.Add(segmentPath);
                downloadedSegments++;

                // Report progress
                progress?.Report(new DownloadProgress
                {
                    DownloadId = Guid.Empty,
                    PercentComplete = (double)downloadedSegments / totalSegments * 100,
                    DownloadedBytes = downloadedSegments,
                    TotalBytes = totalSegments
                });

                _logger.LogDebug("Downloaded segment {Current}/{Total}", downloadedSegments, totalSegments);
            }

            // Merge segments
            _logger.LogInformation("Merging {Count} segments into output file", segmentFiles.Count);
            await MergeSegmentsAsync(segmentFiles, outputPath, cancellationToken);

            _logger.LogInformation("HLS stream download completed: {Output}", outputPath);
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

    public async Task<byte[]?> GetDecryptionKeyAsync(HlsEncryption encryption, Dictionary<string, string>? headers = null)
    {
        if (string.IsNullOrEmpty(encryption.KeyUrl))
        {
            return null;
        }

        try
        {
            var client = await _connectionManager.GetClientAsync(new Uri(encryption.KeyUrl));
            
            if (headers != null)
            {
                foreach (var header in headers)
                {
                    client.DefaultRequestHeaders.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            var key = await client.GetByteArrayAsync(encryption.KeyUrl);
            encryption.Key = key;
            
            _logger.LogInformation("Retrieved decryption key from: {KeyUrl}", encryption.KeyUrl);
            return key;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve decryption key from: {KeyUrl}", encryption.KeyUrl);
            throw;
        }
    }

    private void ParseMasterPlaylist(List<string> lines, string baseUrl, HlsPlaylist playlist)
    {
        for (int i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            
            if (line.StartsWith("#EXT-X-STREAM-INF:"))
            {
                var variant = new HlsVariant();
                
                // Parse attributes
                var bandwidthMatch = Regex.Match(line, @"BANDWIDTH=(\d+)");
                if (bandwidthMatch.Success)
                {
                    variant.Bandwidth = int.Parse(bandwidthMatch.Groups[1].Value);
                }

                var resolutionMatch = Regex.Match(line, @"RESOLUTION=(\d+x\d+)");
                if (resolutionMatch.Success)
                {
                    variant.Resolution = resolutionMatch.Groups[1].Value;
                }

                var codecsMatch = Regex.Match(line, @"CODECS=""([^""]+)""");
                if (codecsMatch.Success)
                {
                    variant.Codecs = codecsMatch.Groups[1].Value;
                }

                // Next line should be the URL
                if (i + 1 < lines.Count && !lines[i + 1].StartsWith("#"))
                {
                    variant.Url = ResolveUrl(baseUrl, lines[i + 1]);
                    playlist.Variants.Add(variant);
                }
            }
        }
    }

    private void ParseMediaPlaylist(List<string> lines, string baseUrl, HlsPlaylist playlist)
    {
        int sequence = 0;
        double duration = 0;
        HlsEncryption? currentEncryption = null;

        for (int i = 0; i < lines.Count; i++)
        {
            var line = lines[i];

            if (line.StartsWith("#EXT-X-TARGETDURATION:"))
            {
                playlist.TargetDuration = int.Parse(line.Split(':')[1]);
            }
            else if (line.StartsWith("#EXT-X-MEDIA-SEQUENCE:"))
            {
                playlist.MediaSequence = int.Parse(line.Split(':')[1]);
                sequence = playlist.MediaSequence.Value;
            }
            else if (line.StartsWith("#EXT-X-KEY:"))
            {
                currentEncryption = ParseEncryption(line, baseUrl);
                playlist.IsEncrypted = true;
                playlist.Encryption = currentEncryption;
            }
            else if (line.StartsWith("#EXTINF:"))
            {
                var durationStr = line.Split(':')[1].TrimEnd(',');
                duration = double.Parse(durationStr);
            }
            else if (!line.StartsWith("#") && !string.IsNullOrWhiteSpace(line))
            {
                var segment = new HlsSegment
                {
                    Url = ResolveUrl(baseUrl, line),
                    Duration = duration,
                    Sequence = sequence++
                };
                playlist.Segments.Add(segment);
            }
        }
    }

    private HlsEncryption ParseEncryption(string line, string baseUrl)
    {
        var encryption = new HlsEncryption();

        var methodMatch = Regex.Match(line, @"METHOD=([^,]+)");
        if (methodMatch.Success)
        {
            encryption.Method = methodMatch.Groups[1].Value;
        }

        var uriMatch = Regex.Match(line, @"URI=""([^""]+)""");
        if (uriMatch.Success)
        {
            encryption.KeyUrl = ResolveUrl(baseUrl, uriMatch.Groups[1].Value);
        }

        var ivMatch = Regex.Match(line, @"IV=0x([0-9A-Fa-f]+)");
        if (ivMatch.Success)
        {
            encryption.Iv = ivMatch.Groups[1].Value;
        }

        return encryption;
    }

    private string ResolveUrl(string baseUrl, string relativeUrl)
    {
        if (Uri.IsWellFormedUriString(relativeUrl, UriKind.Absolute))
        {
            return relativeUrl;
        }

        var baseUri = new Uri(baseUrl);
        var resolvedUri = new Uri(baseUri, relativeUrl);
        return resolvedUri.ToString();
    }

    private async Task DownloadSegmentAsync(string url, string outputPath, byte[]? key, string? iv, CancellationToken cancellationToken)
    {
        var client = await _connectionManager.GetClientAsync(new Uri(url));
        var data = await client.GetByteArrayAsync(url, cancellationToken);

        // Decrypt if necessary
        if (key != null)
        {
            data = DecryptSegment(data, key, iv);
        }

        await File.WriteAllBytesAsync(outputPath, data, cancellationToken);
    }

    private byte[] DecryptSegment(byte[] encryptedData, byte[] key, string? ivHex)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        // Parse IV or use default
        if (!string.IsNullOrEmpty(ivHex))
        {
            aes.IV = Convert.FromHexString(ivHex);
        }
        else
        {
            aes.IV = new byte[16]; // Default IV of zeros
        }

        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(encryptedData, 0, encryptedData.Length);
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
}
