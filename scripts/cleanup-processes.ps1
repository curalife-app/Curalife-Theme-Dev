# Cleanup script for Curalife watch processes
# Run this if you have orphaned watch processes

Write-Host "🧹 Cleaning up Curalife watch processes..." -ForegroundColor Green

# Find Node.js processes related to Curalife
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
$curalifePids = @()

foreach ($process in $nodeProcesses) {
    try {
        $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -match "watch|tui|curalife|build-scripts" -and
            $commandLine -notmatch "vscode|editor|ide") {
            $curalifePids += $process.Id
            Write-Host "Found Curalife process: PID $($process.Id) - $($commandLine.Substring(0, [Math]::Min(80, $commandLine.Length)))" -ForegroundColor Yellow
        }
    } catch {
        # Ignore access denied errors
    }
}

if ($curalifePids.Count -eq 0) {
    Write-Host "✅ No Curalife watch processes found" -ForegroundColor Green
    exit 0
}

Write-Host "`nFound $($curalifePids.Count) processes to clean up" -ForegroundColor Yellow
$confirm = Read-Host "Do you want to terminate these processes? (y/N)"

if ($confirm -eq "y" -or $confirm -eq "Y") {
    foreach ($pid in $curalifePids) {
        try {
            # Try graceful shutdown first
            Stop-Process -Id $pid -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2

            # Force kill if still running
            if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "Terminated process: $pid" -ForegroundColor Red
            } else {
                Write-Host "Process $pid terminated gracefully" -ForegroundColor Green
            }
        } catch {
            Write-Host "Failed to terminate process $pid : $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Write-Host "`n✅ Process cleanup completed" -ForegroundColor Green
} else {
    Write-Host "Cleanup cancelled" -ForegroundColor Yellow
}

# Also check for npm processes that might be stuck
$npmProcesses = Get-Process -Name npm -ErrorAction SilentlyContinue
if ($npmProcesses.Count -gt 0) {
    Write-Host "`n⚠️ Found $($npmProcesses.Count) npm processes still running" -ForegroundColor Yellow
    Write-Host "You may want to check these manually with: Get-Process -Name npm | Format-Table" -ForegroundColor Yellow
}