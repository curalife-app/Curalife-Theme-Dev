param(
    [string]$WorkflowFile = "./n8n-workflow/quiz-data-processor.json",
    [string]$ApiKey = $env:N8N_API_KEY
)

# Check if API key is provided
if (-not $ApiKey) {
    Write-Host "Error: N8N API key not found. Please set the N8N_API_KEY environment variable." -ForegroundColor Red
    Write-Host "Example: $env:N8N_API_KEY = 'your-api-key'" -ForegroundColor Yellow
    exit 1
}

# Check if workflow file exists
if (-not (Test-Path $WorkflowFile)) {
    Write-Host "Error: Workflow file not found at $WorkflowFile" -ForegroundColor Red
    exit 1
}

# Get the absolute path to the workflow file
$workflowPath = (Resolve-Path $WorkflowFile).Path

# Get the directory containing the sync script
$scriptPath = $PSScriptRoot
$syncScriptPath = Join-Path $scriptPath "sync-to-server.ps1"

# Initial sync to make sure we're up to date
Write-Host "Performing initial sync..." -ForegroundColor Cyan
& $syncScriptPath -WorkflowFile $workflowPath -ApiKey $ApiKey

# Create a file system watcher to monitor for changes
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = (Split-Path $workflowPath -Parent)
$watcher.Filter = (Split-Path $workflowPath -Leaf)
$watcher.EnableRaisingEvents = $true

# Define what happens when a change is detected
$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    $timeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Host "[$timeStamp] File $changeType detected in $path" -ForegroundColor Yellow

    # Give the file system a moment to complete the write
    Start-Sleep -Seconds 1

    # Sync the workflow to the server
    Write-Host "[$timeStamp] Syncing workflow to server..." -ForegroundColor Cyan
    & $using:syncScriptPath -WorkflowFile $path -ApiKey $using:ApiKey
}

# Register the events to watch for
$handlers = @()
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action

Write-Host "Watching for changes to $workflowPath" -ForegroundColor Green
Write-Host "Press CTRL+C to stop watching" -ForegroundColor Yellow

try {
    # Keep the script running
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    # Clean up when the script is stopped
    $handlers | ForEach-Object { Unregister-Event -SourceIdentifier $_.Name }
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Host "File watching stopped." -ForegroundColor Red
}