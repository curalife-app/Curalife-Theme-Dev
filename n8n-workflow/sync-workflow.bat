@echo off
echo Syncing n8n workflow to server...

REM Check if N8N_API_KEY is set
if "%N8N_API_KEY%"=="" (
    echo Error: N8N_API_KEY environment variable is not set.
    echo Please set it first with: setx N8N_API_KEY "your-api-key"
    echo After setting the key, please restart your command prompt for the changes to take effect.
    exit /b 1
)

REM Run the PowerShell sync script
powershell -ExecutionPolicy Bypass -File "%~dp0sync-to-server.ps1"

pause