# Script to safely backup and remove confirmed unused assets
# Targets: Careers assets, CuraEats assets, Legacy bundles, Unused CSS components

$buildFolder = "..\Curalife-Theme-Build"
$backupFolder = "..\backups\Safe-Assets-Backup"
$logFile = "safe-assets-backup-log.txt"
$assetsPath = "$buildFolder\assets"

# Create backup folder if it doesn't exist
if (-not (Test-Path -Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory -Force | Out-Null
    Write-Host "✅ Created backup folder: $backupFolder" -ForegroundColor Green
}

Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║                 SAFE ASSETS BACKUP & REMOVAL                     ║" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Define the patterns for safe-to-remove assets
$safePatterns = @{
    "Careers Assets" = "careers-*"
    "CuraEats Assets" = "curaeats-*"
    "Legacy JavaScript" = "*-legacy.js"
    "Unused CSS Components" = "component-*.css"
}

# Initialize tracking
$totalFilesFound = 0
$totalFilesBackedUp = 0
$totalFilesRemoved = 0
$totalSizeFreed = 0
$categoryResults = @{}

Write-Host "🔍 Scanning for safe-to-remove assets..." -ForegroundColor Yellow
Write-Host ""

# First, scan and categorize all matching files
foreach ($category in $safePatterns.Keys) {
    $pattern = $safePatterns[$category]
    $matchingFiles = Get-ChildItem -Path $assetsPath -Name $pattern -ErrorAction SilentlyContinue

    if ($matchingFiles) {
        $categorySize = 0
        foreach ($file in $matchingFiles) {
            $fileInfo = Get-Item "$assetsPath\$file" -ErrorAction SilentlyContinue
            if ($fileInfo) {
                $categorySize += $fileInfo.Length
            }
        }

        $categorySizeMB = [math]::Round($categorySize / 1MB, 2)
        $categoryResults[$category] = @{
            Files = $matchingFiles
            Count = $matchingFiles.Count
            SizeMB = $categorySizeMB
            SizeBytes = $categorySize
        }

        Write-Host "📁 " -NoNewline -ForegroundColor Blue
        Write-Host "$category" -NoNewline -ForegroundColor White
        Write-Host ": " -NoNewline
        Write-Host "$($matchingFiles.Count) files" -NoNewline -ForegroundColor Yellow
        Write-Host " ($categorySizeMB MB)" -ForegroundColor Green

        $totalFilesFound += $matchingFiles.Count
        $totalSizeFreed += $categorySize
    } else {
        Write-Host "📁 " -NoNewline -ForegroundColor Blue
        Write-Host "$category" -NoNewline -ForegroundColor White
        Write-Host ": " -NoNewline
        Write-Host "No files found" -ForegroundColor Gray

        $categoryResults[$category] = @{
            Files = @()
            Count = 0
            SizeMB = 0
            SizeBytes = 0
        }
    }
}

$totalSizeFreedMB = [math]::Round($totalSizeFreed / 1MB, 2)

Write-Host ""
Write-Host "📊 " -NoNewline -ForegroundColor Magenta
Write-Host "SUMMARY: " -NoNewline -ForegroundColor White
Write-Host "$totalFilesFound files found" -NoNewline -ForegroundColor Yellow
Write-Host " ($totalSizeFreedMB MB total)" -ForegroundColor Green
Write-Host ""

if ($totalFilesFound -eq 0) {
    Write-Host "ℹ️  No matching files found. The assets may have already been removed." -ForegroundColor Cyan
    exit 0
}

# Ask for confirmation
Write-Host "❓ " -NoNewline -ForegroundColor Yellow
Write-Host "Proceed with backup and removal? [Y/N] " -NoNewline -ForegroundColor White
$response = Read-Host

if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "❌ Operation cancelled by user." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "💾 Starting backup and removal process..." -ForegroundColor Blue
Write-Host ""

# Initialize log
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logContent = @"
SAFE ASSETS BACKUP & REMOVAL LOG
================================
Timestamp: $timestamp
Backup Location: $backupFolder
Assets Path: $assetsPath

CATEGORIES PROCESSED:
"@

# Process each category
foreach ($category in $categoryResults.Keys) {
    $result = $categoryResults[$category]

    if ($result.Count -gt 0) {
        Write-Host "🗂️  Processing " -NoNewline -ForegroundColor Blue
        Write-Host "$category" -NoNewline -ForegroundColor White
        Write-Host " ($($result.Count) files)..." -ForegroundColor Gray

        $logContent += "`n`n$category ($($result.Count) files, $($result.SizeMB) MB):`n"
        $logContent += "=" * ($category.Length + 20) + "`n"

        $categoryBackedUp = 0
        $categoryRemoved = 0

        foreach ($file in $result.Files) {
            $sourcePath = "$assetsPath\$file"
            $destPath = "$backupFolder\$file"

            try {
                # Backup file
                Copy-Item -Path $sourcePath -Destination $destPath -Force

                if (Test-Path -Path $destPath) {
                    # Remove original if backup successful
                    Remove-Item -Path $sourcePath -Force

                    if (-not (Test-Path -Path $sourcePath)) {
                        $logContent += "✅ $file`n"
                        $categoryBackedUp++
                        $categoryRemoved++
                        Write-Host "   ✅ " -NoNewline -ForegroundColor Green
                        Write-Host "$file" -ForegroundColor Gray
                    } else {
                        $logContent += "⚠️  $file (failed to remove)`n"
                        Write-Host "   ⚠️  " -NoNewline -ForegroundColor Yellow
                        Write-Host "$file (failed to remove)" -ForegroundColor Gray
                    }
                } else {
                    $logContent += "❌ $file (backup failed)`n"
                    Write-Host "   ❌ " -NoNewline -ForegroundColor Red
                    Write-Host "$file (backup failed)" -ForegroundColor Gray
                }
            } catch {
                $logContent += "❌ $file (error: $_)`n"
                Write-Host "   ❌ " -NoNewline -ForegroundColor Red
                Write-Host "$file (error: $_)" -ForegroundColor Gray
            }
        }

        $totalFilesBackedUp += $categoryBackedUp
        $totalFilesRemoved += $categoryRemoved

        Write-Host "   📈 " -NoNewline -ForegroundColor Cyan
        Write-Host "$categoryBackedUp backed up, $categoryRemoved removed" -ForegroundColor White
    }
}

# Add summary to log
$logContent += @"

OPERATION SUMMARY:
==================
Total files found: $totalFilesFound
Total files backed up: $totalFilesBackedUp
Total files removed: $totalFilesRemoved
Total space freed: $totalSizeFreedMB MB

BACKUP LOCATION:
All backed up files are stored in: $backupFolder
To restore any files, copy them back to: $assetsPath

CATEGORIES PROCESSED:
"@

foreach ($category in $categoryResults.Keys) {
    $result = $categoryResults[$category]
    $logContent += "`n- $category`: $($result.Count) files ($($result.SizeMB) MB)"
}

$logContent += "`n`nGenerated on $(Get-Date)"

# Write log to file
$logContent | Out-File -FilePath $logFile -Encoding UTF8

# Final summary
Write-Host ""
Write-Host "🎉 " -NoNewline -ForegroundColor Green
Write-Host "OPERATION COMPLETE!" -ForegroundColor White
Write-Host ""
Write-Host "📊 " -NoNewline -ForegroundColor Cyan
Write-Host "RESULTS:" -ForegroundColor White
Write-Host "   Files backed up: " -NoNewline -ForegroundColor Gray
Write-Host "$totalFilesBackedUp" -ForegroundColor Green
Write-Host "   Files removed: " -NoNewline -ForegroundColor Gray
Write-Host "$totalFilesRemoved" -ForegroundColor Green
Write-Host "   Space freed: " -NoNewline -ForegroundColor Gray
Write-Host "$totalSizeFreedMB MB" -ForegroundColor Green
Write-Host ""
Write-Host "📁 " -NoNewline -ForegroundColor Blue
Write-Host "Backup location: " -NoNewline -ForegroundColor Gray
Write-Host "$backupFolder" -ForegroundColor Cyan
Write-Host "📄 " -NoNewline -ForegroundColor Blue
Write-Host "Detailed log: " -NoNewline -ForegroundColor Gray
Write-Host "$logFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Your theme assets have been cleaned up!" -ForegroundColor Green
Write-Host "   If you need to restore any files, they're safely backed up." -ForegroundColor Gray
Write-Host ""