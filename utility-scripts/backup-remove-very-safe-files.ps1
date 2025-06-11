# Script to safely backup and remove very safe unused files
# These are files we're highly confident are not being used

$buildFolder = "..\Curalife-Theme-Build"
$backupFolder = "..\backups\Very-Safe-Files-Backup"
$logFile = "very-safe-files-backup-log.txt"

# Create backup folder if it doesn't exist
if (-not (Test-Path -Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory -Force | Out-Null
    Write-Host "✅ Created backup folder: $backupFolder" -ForegroundColor Green
}

Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║                 VERY SAFE FILES BACKUP & REMOVAL                 ║" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Define very safe files to remove
$safeFiles = @{
    "Assets" = @{
        Path = "$buildFolder\assets"
        Files = @(
            "template-giftcard.css",
            "section-blog-post.css",
            "product-aio-product-video-thumbnail.png",
            "rebrending-swoosh-text.png",
            "digital-7.ttf"
        )
    }
    "Snippets" = @{
        Path = "$buildFolder\snippets"
        Files = @(
            # Old A/B test versions (definitely safe)
            "buy-box-subscription-2-optimized.liquid",
            "buy-box-subscription-3-optimized.liquid",
            "buy-box-subscription-4-optimized.liquid",
            "buy-box-subscription-5-temp.liquid",

            # Unused components (very safe)
            "quiz-results-bars.liquid",
            "sale-banner.liquid",
            "floating-cta-btn.liquid",

            # Landing page components (safe if LPs not active)
            "lps-ingredients-slider.liquid",
            "lps-ingredients.liquid",
            "lps-video-reviews.liquid"
        )
    }
}

# Initialize tracking
$totalFilesFound = 0
$totalFilesBackedUp = 0
$totalFilesRemoved = 0
$totalSizeFreed = 0
$categoryResults = @{}

Write-Host "🔍 Scanning for very safe files to remove..." -ForegroundColor Yellow
Write-Host ""

# Scan and categorize files
foreach ($category in $safeFiles.Keys) {
    $categoryPath = $safeFiles[$category].Path
    $categoryFiles = $safeFiles[$category].Files
    $foundFiles = @()
    $categorySize = 0

    foreach ($fileName in $categoryFiles) {
        $fullPath = Join-Path $categoryPath $fileName
        if (Test-Path $fullPath) {
            $foundFiles += $fileName
            $fileInfo = Get-Item $fullPath
            $categorySize += $fileInfo.Length
        }
    }

    $categorySizeMB = [math]::Round($categorySize / 1MB, 2)
    $categoryResults[$category] = @{
        Files = $foundFiles
        Count = $foundFiles.Count
        SizeMB = $categorySizeMB
        SizeBytes = $categorySize
        Path = $categoryPath
    }

    if ($foundFiles.Count -gt 0) {
        Write-Host "📁 " -NoNewline -ForegroundColor Blue
        Write-Host "$category" -NoNewline -ForegroundColor White
        Write-Host ": " -NoNewline
        Write-Host "$($foundFiles.Count) files" -NoNewline -ForegroundColor Yellow
        Write-Host " ($categorySizeMB MB)" -ForegroundColor Green

        # Show first few file names
        $displayFiles = $foundFiles | Select-Object -First 3
        foreach ($file in $displayFiles) {
            Write-Host "   • $file" -ForegroundColor Gray
        }
        if ($foundFiles.Count -gt 3) {
            Write-Host "   • ... and $($foundFiles.Count - 3) more" -ForegroundColor Gray
        }

        $totalFilesFound += $foundFiles.Count
        $totalSizeFreed += $categorySize
    } else {
        Write-Host "📁 " -NoNewline -ForegroundColor Blue
        Write-Host "$category" -NoNewline -ForegroundColor White
        Write-Host ": " -NoNewline
        Write-Host "No files found" -ForegroundColor Gray
    }
    Write-Host ""
}

$totalSizeFreedMB = [math]::Round($totalSizeFreed / 1MB, 2)

Write-Host "📊 " -NoNewline -ForegroundColor Magenta
Write-Host "SUMMARY: " -NoNewline -ForegroundColor White
Write-Host "$totalFilesFound very safe files found" -NoNewline -ForegroundColor Yellow
Write-Host " ($totalSizeFreedMB MB total)" -ForegroundColor Green
Write-Host ""

if ($totalFilesFound -eq 0) {
    Write-Host "ℹ️  No matching files found. They may have already been removed." -ForegroundColor Cyan
    exit 0
}

# Ask for confirmation
Write-Host "❓ " -NoNewline -ForegroundColor Yellow
Write-Host "These files are very safe to remove. Proceed? [Y/N] " -NoNewline -ForegroundColor White
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
VERY SAFE FILES BACKUP & REMOVAL LOG
====================================
Timestamp: $timestamp
Backup Location: $backupFolder

RATIONALE:
These files were identified as very safe to remove because:
- A/B test versions (numbered optimized files)
- Files with 'temp' in the name
- Clearly unused components (quiz, sale-banner, floating-cta)
- Landing page components (if LPs aren't active)
- Default Shopify templates not being used

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
            $sourcePath = Join-Path $result.Path $file
            $destPath = Join-Path $backupFolder $file

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
To restore any files, copy them back to their original locations.

FILES REMOVED BY CATEGORY:
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
Write-Host "✨ Additional cleanup completed!" -ForegroundColor Green
Write-Host "   These were very safe files - old A/B tests, temp files, and unused components." -ForegroundColor Gray
Write-Host ""