# PowerShell script to install native messaging host for Download Manager
# Run as Administrator

param(
    [string]$ExtensionId = "",
    [string]$InstallPath = "$env:ProgramFiles\DownloadManager"
)

Write-Host "Installing Download Manager Native Messaging Host..." -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

# Validate extension ID
if ([string]::IsNullOrEmpty($ExtensionId)) {
    Write-Host "Error: Extension ID is required" -ForegroundColor Red
    Write-Host "Usage: .\install-host.ps1 -ExtensionId <your-extension-id>" -ForegroundColor Yellow
    exit 1
}

# Create manifest file
$manifestPath = Join-Path $InstallPath "com.downloadmanager.host.json"
$hostExePath = Join-Path $InstallPath "native-host.exe"

$manifest = @{
    name = "com.downloadmanager.host"
    description = "Download Manager Native Messaging Host"
    path = $hostExePath
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://$ExtensionId/"
    )
} | ConvertTo-Json

# Ensure directory exists
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# Write manifest file
$manifest | Out-File -FilePath $manifestPath -Encoding ASCII

Write-Host "Manifest file created at: $manifestPath" -ForegroundColor Cyan

# Register for Chrome/Edge
$chromeRegPath = "HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.downloadmanager.host"
$edgeRegPath = "HKLM:\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.downloadmanager.host"

# Create Chrome registry entry
if (-not (Test-Path $chromeRegPath)) {
    New-Item -Path $chromeRegPath -Force | Out-Null
}
Set-ItemProperty -Path $chromeRegPath -Name "(Default)" -Value $manifestPath
Write-Host "Registered for Chrome" -ForegroundColor Green

# Create Edge registry entry
if (-not (Test-Path $edgeRegPath)) {
    New-Item -Path $edgeRegPath -Force | Out-Null
}
Set-ItemProperty -Path $edgeRegPath -Name "(Default)" -Value $manifestPath
Write-Host "Registered for Edge" -ForegroundColor Green

# Firefox uses a different location (per-user)
$firefoxRegPath = "HKCU:\SOFTWARE\Mozilla\NativeMessagingHosts\com.downloadmanager.host"
if (-not (Test-Path $firefoxRegPath)) {
    New-Item -Path $firefoxRegPath -Force | Out-Null
}
Set-ItemProperty -Path $firefoxRegPath -Name "(Default)" -Value $manifestPath
Write-Host "Registered for Firefox" -ForegroundColor Green

Write-Host "`nNative messaging host installed successfully!" -ForegroundColor Green
Write-Host "Manifest location: $manifestPath" -ForegroundColor Cyan
Write-Host "Host executable: $hostExePath" -ForegroundColor Cyan
Write-Host "`nMake sure the native-host.exe is present at the specified location." -ForegroundColor Yellow
