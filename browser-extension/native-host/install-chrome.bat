@echo off
echo Installing Download Manager Native Messaging Host for Chrome...

set MANIFEST_PATH=%~dp0com.downloadmanager.host.json

REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.downloadmanager.host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %ERRORLEVEL% EQU 0 (
    echo Installation successful!
    echo.
    echo IMPORTANT: You need to update the EXTENSION_ID_HERE in the manifest file
    echo with your actual Chrome extension ID.
    echo.
    echo Your extension ID can be found at chrome://extensions/
) else (
    echo Installation failed!
)

pause
