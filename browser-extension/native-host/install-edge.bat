@echo off
echo Installing Download Manager Native Messaging Host for Edge...

set MANIFEST_PATH=%~dp0com.downloadmanager.host.json

REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.downloadmanager.host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %ERRORLEVEL% EQU 0 (
    echo Installation successful!
    echo.
    echo IMPORTANT: You need to update the EXTENSION_ID_HERE in the manifest file
    echo with your actual Edge extension ID.
    echo.
    echo Your extension ID can be found at edge://extensions/
) else (
    echo Installation failed!
)

pause
