using System.Collections.Concurrent;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Logging;
using DownloadManager.Core.Interfaces;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Services;

public class CertificateValidator : ICertificateValidator
{
    private readonly ILogger<CertificateValidator> _logger;
    private readonly ConcurrentDictionary<string, string> _pinnedCertificates = new();
    private readonly bool _strictValidation;

    public CertificateValidator(ILogger<CertificateValidator> logger, bool strictValidation = true)
    {
        _logger = logger;
        _strictValidation = strictValidation;
    }

    public bool ValidateServerCertificate(
        object sender,
        X509Certificate? certificate,
        X509Chain? chain,
        SslPolicyErrors sslPolicyErrors)
    {
        if (certificate == null)
        {
            _logger.LogError("Certificate is null");
            return false;
        }

        var cert2 = new X509Certificate2(certificate);
        var result = ValidateCertificate(cert2, chain, sslPolicyErrors);

        if (!result.IsValid)
        {
            _logger.LogWarning("Certificate validation failed for {Subject}: {Errors}",
                result.Subject,
                string.Join(", ", result.ValidationErrors));
        }

        return result.IsValid;
    }

    public CertificateValidationResult ValidateCertificate(
        X509Certificate2 certificate,
        X509Chain? chain,
        SslPolicyErrors sslPolicyErrors)
    {
        var result = new CertificateValidationResult
        {
            Certificate = certificate,
            Issuer = certificate.Issuer,
            Subject = certificate.Subject,
            NotBefore = certificate.NotBefore,
            NotAfter = certificate.NotAfter,
            Thumbprint = certificate.Thumbprint
        };

        // If no errors, certificate is valid
        if (sslPolicyErrors == SslPolicyErrors.None)
        {
            result.IsValid = true;
            _logger.LogDebug("Certificate validation successful for {Subject}", certificate.Subject);
            return result;
        }

        // Check for specific errors
        if ((sslPolicyErrors & SslPolicyErrors.RemoteCertificateNotAvailable) != 0)
        {
            result.ValidationErrors.Add("Remote certificate not available");
        }

        if ((sslPolicyErrors & SslPolicyErrors.RemoteCertificateNameMismatch) != 0)
        {
            result.ValidationErrors.Add("Certificate name mismatch");
        }

        if ((sslPolicyErrors & SslPolicyErrors.RemoteCertificateChainErrors) != 0)
        {
            if (chain != null)
            {
                foreach (var status in chain.ChainStatus)
                {
                    result.ValidationErrors.Add($"Chain error: {status.StatusInformation}");
                }
            }
            else
            {
                result.ValidationErrors.Add("Certificate chain errors (chain not available)");
            }
        }

        // Check certificate expiration
        var now = DateTime.Now;
        if (certificate.NotBefore > now)
        {
            result.ValidationErrors.Add($"Certificate not yet valid (valid from {certificate.NotBefore})");
        }

        if (certificate.NotAfter < now)
        {
            result.ValidationErrors.Add($"Certificate expired (expired on {certificate.NotAfter})");
        }

        // Check certificate pinning
        var hostname = ExtractHostnameFromSubject(certificate.Subject);
        if (!string.IsNullOrEmpty(hostname) && _pinnedCertificates.TryGetValue(hostname, out var pinnedThumbprint))
        {
            if (!string.Equals(certificate.Thumbprint, pinnedThumbprint, StringComparison.OrdinalIgnoreCase))
            {
                result.ValidationErrors.Add($"Certificate thumbprint does not match pinned certificate for {hostname}");
                result.IsValid = false;
                result.ErrorMessage = string.Join("; ", result.ValidationErrors);
                return result;
            }
            else
            {
                _logger.LogInformation("Certificate pinning validation successful for {Hostname}", hostname);
                result.IsValid = true;
                return result;
            }
        }

        // In strict mode, any SSL policy error is a failure
        if (_strictValidation)
        {
            result.IsValid = false;
            result.ErrorMessage = string.Join("; ", result.ValidationErrors);
        }
        else
        {
            // In non-strict mode, we might allow some errors (e.g., self-signed certificates in development)
            // For production, this should always be true
            _logger.LogWarning("Certificate validation failed but continuing due to non-strict mode");
            result.IsValid = true;
        }

        return result;
    }

    public void AddPinnedCertificate(string hostname, string thumbprint)
    {
        _pinnedCertificates[hostname.ToLowerInvariant()] = thumbprint.ToUpperInvariant();
        _logger.LogInformation("Added certificate pinning for {Hostname} with thumbprint {Thumbprint}",
            hostname, thumbprint);
    }

    public void RemovePinnedCertificate(string hostname)
    {
        if (_pinnedCertificates.TryRemove(hostname.ToLowerInvariant(), out _))
        {
            _logger.LogInformation("Removed certificate pinning for {Hostname}", hostname);
        }
    }

    public bool IsCertificatePinned(string hostname, string thumbprint)
    {
        if (_pinnedCertificates.TryGetValue(hostname.ToLowerInvariant(), out var pinnedThumbprint))
        {
            return string.Equals(thumbprint, pinnedThumbprint, StringComparison.OrdinalIgnoreCase);
        }
        return false;
    }

    private string? ExtractHostnameFromSubject(string subject)
    {
        // Subject format: "CN=hostname, O=Organization, ..."
        var parts = subject.Split(',');
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.StartsWith("CN=", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed.Substring(3).Trim();
            }
        }
        return null;
    }
}
