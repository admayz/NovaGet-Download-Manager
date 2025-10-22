# PowerShell script to uninstall native messaging host for Download Manager
# Run as Administrator

Write-Host "Uninstalling Download Manager Native Messaging Host..." -ForegroundColor Yellow

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}

# Remove Chrome registry entry
$chromeRegPath = "HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.downloadmanager.host"
if (Test-Path $chromeRegPath) {
    Remove-Item -Path $chromeRegPath -Force
    Write-Host "Removed Chrome registry entry" -ForegroundColor Green
}

# Remove Edge registry entry
$edgeRegPath = "HKLM:\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.downloadmanager.host"
if (Test-Path $edgeRegPath) {
    Remove-Item -Path $edgeRegPath -Force
    Write-Host "Removed Edge registry entry" -ForegroundColor Green
}

# Remove Firefox registry entry
$firefoxRegPath = "HKCU:\SOFTWARE\Mozilla\NativeMessagingHosts\com.downloadmanager.host"
if (Test-Path $firefoxRegPath) {
    Remove-Item -Path $firefoxRegPath -Force
    Write-Host "Removed Firefox registry entry" -ForegroundColor Green
}

Write-Host "`nNative messaging host uninstalled successfully!" -ForegroundColor Green
