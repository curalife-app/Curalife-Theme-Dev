@echo off
echo Starting n8n workflow sync watcher...

REM Check if N8N_API_KEY is set
if "%N8N_API_KEY%"=="" (
    echo Error: N8N_API_KEY environment variable is not set.
    echo Please set it first with: setx N8N_API_KEY "your-api-key"
    echo After setting the key, please restart your command prompt for the changes to take effect.
    exit /b 1
)

REM Run the PowerShell watcher script
powershell -ExecutionPolicy Bypass -File "%~dp0watch-and-sync.ps1"