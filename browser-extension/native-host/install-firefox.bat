@echo off
echo Installing Download Manager Native Messaging Host for Firefox/Zen...

set MANIFEST_PATH=%~dp0com.downloadmanager.host.firefox.json

REG ADD "HKCU\Software\Mozilla\NativeMessagingHosts\com.downloadmanager.host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %ERRORLEVEL% EQU 0 (
    echo Installation successful for Firefox!
    echo.
    echo The native messaging host has been registered.
    echo You can now use the extension with Firefox or Zen Browser.
) else (
    echo Installation failed!
)

pause
