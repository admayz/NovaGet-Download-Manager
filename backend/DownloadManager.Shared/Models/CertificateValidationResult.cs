using System.Security.Cryptography.X509Certificates;

namespace DownloadManager.Shared.Models;

public class CertificateValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public X509Certificate2? Certificate { get; set; }
    public string? Issuer { get; set; }
    public string? Subject { get; set; }
    public DateTime? NotBefore { get; set; }
    public DateTime? NotAfter { get; set; }
    public string? Thumbprint { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
}
