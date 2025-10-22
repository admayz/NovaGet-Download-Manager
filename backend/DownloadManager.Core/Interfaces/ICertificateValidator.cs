using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using DownloadManager.Shared.Models;

namespace DownloadManager.Core.Interfaces;

public interface ICertificateValidator
{
    bool ValidateServerCertificate(
        object sender,
        X509Certificate? certificate,
        X509Chain? chain,
        SslPolicyErrors sslPolicyErrors);
    
    CertificateValidationResult ValidateCertificate(
        X509Certificate2 certificate,
        X509Chain? chain,
        SslPolicyErrors sslPolicyErrors);
    
    void AddPinnedCertificate(string hostname, string thumbprint);
    void RemovePinnedCertificate(string hostname);
    bool IsCertificatePinned(string hostname, string thumbprint);
}
