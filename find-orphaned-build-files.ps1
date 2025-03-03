# Script to find files in the build folder that are not in src
# This helps identify files that need to be cleaned up from the build folder
# Ignores the templates folder, locales folder, and specific JSON files as specified

# Set console colors for a more appealing visual experience
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "White"
Clear-Host

# Display a colorful title banner
function Show-Banner {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                                   ║" -ForegroundColor Cyan
    Write-Host "║                CURALIFE ORPHANED BUILD FILES FINDER               ║" -ForegroundColor Cyan
    Write-Host "║                                                                   ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

Show-Banner

# Set paths for build and src directories
$buildDir = Join-Path $PSScriptRoot "Curalife-Theme-Build"
$srcDir = Join-Path $PSScriptRoot "src"

# Create timestamped backup directory
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $PSScriptRoot "Orphaned-Files-Backup_$timestamp"

# Output file for results
$outputFile = Join-Path $PSScriptRoot "orphaned-build-files.txt"

Write-Host "📂 " -NoNewline -ForegroundColor Yellow
Write-Host "Finding files in build that don't exist in src..." -ForegroundColor White
Write-Host "   Build directory: " -NoNewline -ForegroundColor Gray
Write-Host "$buildDir" -ForegroundColor White
Write-Host "   Source directory: " -NoNewline -ForegroundColor Gray
Write-Host "$srcDir" -ForegroundColor White
Write-Host ""

# Files to always ignore (static list)
$ignoreFiles = @(
    "mix-manifest.json",
    ".gitignore",
    ".git",
    "lps-footer-group.json",
    "lps-header-group.json"
)

# Get all files in the build directory (excluding templates and locales folders)
$buildFiles = Get-ChildItem -Path $buildDir -Recurse -File |
    Where-Object {
        $_.FullName -notlike "*\templates\*" -and
        $_.FullName -notlike "*\locales\*" -and
        $_.FullName -notlike "*\config\*" -and # Ignore config folder
        $ignoreFiles -notcontains $_.Name -and
        $_.Name -notlike "*group*" -and # Ignore any file with "group" in the name
        $_.Name -notlike "*tailwind*" -and # Ignore tailwind files
        $_.Name -notlike "*header-group.context*" # Explicitly ignore context files like header-group.context.italy.json
    } |
    ForEach-Object {
        # Get relative path from build directory
        $relativePath = $_.FullName.Substring($buildDir.Length + 1)
        return $relativePath
    }

Write-Host "🔍 " -NoNewline -ForegroundColor Green
Write-Host "Found $($buildFiles.Count) files in build directory" -ForegroundColor White
Write-Host "   (excluding templates, locales folders, and specific JSON files)" -ForegroundColor Gray
Write-Host ""

# Pre-cache all source files for better performance
Write-Host "⏳ " -NoNewline -ForegroundColor Yellow
Write-Host "Caching source files for faster analysis..." -ForegroundColor White

# Create hashtable of all source files (for faster lookups)
$sourceFilesHash = @{}

# Cache files from images, scripts, styles, fonts directories
$sourceDirs = @("images", "scripts", "styles", "fonts")
foreach ($dir in $sourceDirs) {
    $dirPath = Join-Path $srcDir $dir
    if (Test-Path $dirPath) {
        Get-ChildItem -Path $dirPath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            if (-not $sourceFilesHash.ContainsKey($_.Name)) {
                $sourceFilesHash[$_.Name] = $true
            }
        }
    }
}

# Cache files from liquid directory
$liquidDir = Join-Path $srcDir "liquid"
if (Test-Path $liquidDir) {
    Get-ChildItem -Path $liquidDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        if (-not $sourceFilesHash.ContainsKey($_.Name)) {
            $sourceFilesHash[$_.Name] = $true
        }
    }
}

Write-Host "   Cached " -NoNewline -ForegroundColor Gray
Write-Host "$($sourceFilesHash.Count)" -NoNewline -ForegroundColor Green
Write-Host " unique source files" -ForegroundColor Gray
Write-Host ""

# Find orphaned files
Write-Host "⏳ " -NoNewline -ForegroundColor Yellow
Write-Host "Analyzing files..." -ForegroundColor White

# Create a progress bar
$totalFiles = $buildFiles.Count
$currentFile = 0
$orphanedFiles = @()

foreach ($buildFile in $buildFiles) {
    # Update progress
    $currentFile++
    $percentComplete = [math]::Floor(($currentFile / $totalFiles) * 100)

    # Only update progress every 10 files to avoid slowdown
    if ($currentFile % 10 -eq 0 -or $currentFile -eq $totalFiles) {
        Write-Progress -Activity "Analyzing files" -Status "$percentComplete% Complete" -PercentComplete $percentComplete
    }

    # Get the filename
    $fileName = Split-Path $buildFile -Leaf

    # Check if the file exists in the source files hash
    if (-not $sourceFilesHash.ContainsKey($fileName)) {
        $orphanedFiles += $buildFile
    }
}

# Clear the progress bar
Write-Progress -Activity "Analyzing files" -Completed

# Write the orphaned files to the output file
$orphanedFiles | Sort-Object | Out-File $outputFile -Encoding utf8

Write-Host ""
Write-Host "📊 " -NoNewline -ForegroundColor Magenta
Write-Host "Results:" -ForegroundColor White
Write-Host "   Found " -NoNewline -ForegroundColor Gray
Write-Host "$($orphanedFiles.Count)" -NoNewline -ForegroundColor Yellow
Write-Host " orphaned files in build directory" -ForegroundColor Gray
Write-Host "   Results written to: " -NoNewline -ForegroundColor Gray
Write-Host "$outputFile" -ForegroundColor White
Write-Host ""

# Display the orphaned files in the console
if ($orphanedFiles.Count -gt 0) {
    Write-Host "📄 " -NoNewline -ForegroundColor Cyan
    Write-Host "Orphaned files:" -ForegroundColor White

    # Display files with a prettier format
    $fileCount = 1
    foreach ($file in ($orphanedFiles | Sort-Object)) {
        $fileNumStr = "[$fileCount]".PadRight(5)
        Write-Host "   $fileNumStr" -NoNewline -ForegroundColor Yellow
        Write-Host "$file" -ForegroundColor White
        $fileCount++
    }

    # Add a suggestion to delete the orphaned files
    Write-Host ""
    Write-Host "❓ " -NoNewline -ForegroundColor Yellow
    Write-Host "Would you like to delete these orphaned files? [Y/N] " -NoNewline -ForegroundColor White
    $response = Read-Host

    if ($response -eq "Y" -or $response -eq "y") {
        # Create the backup directory if it doesn't exist
        if (-not (Test-Path $backupDir)) {
            Write-Host ""
            Write-Host "📁 " -NoNewline -ForegroundColor Blue
            Write-Host "Creating backup directory..." -ForegroundColor White
            New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
        }

        Write-Host ""
        Write-Host "💾 " -NoNewline -ForegroundColor Blue
        Write-Host "Backing up files before deletion..." -ForegroundColor White
        Write-Host "   Backup location: " -NoNewline -ForegroundColor Gray
        Write-Host "$backupDir" -ForegroundColor White

        # First back up all files
        $backupSuccessCount = 0
        $backupErrorCount = 0

        # Create a progress bar for backup
        $backupProgress = 0

        foreach ($file in $orphanedFiles) {
            $backupProgress++
            $backupPercentComplete = [math]::Floor(($backupProgress / $orphanedFiles.Count) * 100)

            # Only update progress every 5 files
            if ($backupProgress % 5 -eq 0 -or $backupProgress -eq $orphanedFiles.Count) {
                Write-Progress -Activity "Backing up files" -Status "$backupPercentComplete% Complete" -PercentComplete $backupPercentComplete
            }

            $sourcePath = Join-Path $buildDir $file

            # Preserve the directory structure in the backup
            $targetDir = Split-Path -Parent (Join-Path $backupDir $file)
            if (-not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }

            $targetPath = Join-Path $backupDir $file

            try {
                Copy-Item -Path $sourcePath -Destination $targetPath -Force
                $backupSuccessCount++
            }
            catch {
                $backupErrorCount++
                Write-Host "   ⚠️ " -NoNewline -ForegroundColor Yellow
                Write-Host "Error backing up ${file}: $($_.Exception.Message)" -ForegroundColor White
            }
        }

        # Clear the progress bar
        Write-Progress -Activity "Backing up files" -Completed

        Write-Host "   ✅ " -NoNewline -ForegroundColor Green
        Write-Host "$backupSuccessCount" -NoNewline -ForegroundColor Green
        Write-Host " files backed up successfully, " -NoNewline -ForegroundColor Gray
        Write-Host "$backupErrorCount" -NoNewline -ForegroundColor Red
        Write-Host " errors" -ForegroundColor Gray

        # Now delete the files
        Write-Host ""
        Write-Host "🗑️  " -NoNewline -ForegroundColor Red
        Write-Host "Deleting orphaned files..." -ForegroundColor White

        $deletedCount = 0
        $errorCount = 0

        # Create a progress bar for deletion
        $deleteProgress = 0

        foreach ($file in $orphanedFiles) {
            $deleteProgress++
            $deletePercentComplete = [math]::Floor(($deleteProgress / $orphanedFiles.Count) * 100)

            # Only update progress every 5 files
            if ($deleteProgress % 5 -eq 0 -or $deleteProgress -eq $orphanedFiles.Count) {
                Write-Progress -Activity "Deleting files" -Status "$deletePercentComplete% Complete" -PercentComplete $deletePercentComplete
            }

            $fullPath = Join-Path $buildDir $file
            try {
                Remove-Item -Path $fullPath -Force
                $deletedCount++
            }
            catch {
                $errorCount++
                $errorMessage = $_.Exception.Message
                Write-Host "   ❌ " -NoNewline -ForegroundColor Red
                Write-Host "Error deleting ${file}: $errorMessage" -ForegroundColor White
            }
        }

        # Clear the progress bar
        Write-Progress -Activity "Deleting files" -Completed

        # Output summary of deleted files
        Write-Host ""
        Write-Host "🏁 " -NoNewline -ForegroundColor Cyan
        Write-Host "Operation complete:" -ForegroundColor White
        Write-Host "   " -NoNewline
        Write-Host "$deletedCount" -NoNewline -ForegroundColor Green
        Write-Host " files deleted, " -NoNewline -ForegroundColor Gray
        Write-Host "$errorCount" -NoNewline -ForegroundColor Red
        Write-Host " errors encountered" -ForegroundColor Gray
        Write-Host "   All files were backed up to: " -NoNewline -ForegroundColor Gray
        Write-Host "$backupDir" -ForegroundColor Blue

        # Create a backup log with details
        $backupLogFile = Join-Path $backupDir "backup-log.txt"
        $logContent = @"
Curalife Orphaned Files Backup
==============================
Date: $(Get-Date)

Files backed up from: $buildDir
Backup reason: Orphaned files cleanup

Files backed up:
$($orphanedFiles | Sort-Object | ForEach-Object { "- $_" } | Out-String)

Total files: $($orphanedFiles.Count)
"@
        $logContent | Out-File $backupLogFile -Encoding utf8

        Write-Host "   Backup log created at: " -NoNewline -ForegroundColor Gray
        Write-Host "$backupLogFile" -ForegroundColor Blue
    }
    else {
        Write-Host ""
        Write-Host "ℹ️  " -NoNewline -ForegroundColor Cyan
        Write-Host "No files were deleted. To delete these files later, you can:" -ForegroundColor White
        Write-Host "   1. Run this script again and choose Y when prompted" -ForegroundColor Gray
        Write-Host "   2. Manually delete the files listed in $outputFile" -ForegroundColor Gray
    }
}
else {
    Write-Host "✨ " -NoNewline -ForegroundColor Green
    Write-Host "No orphaned files found. Your build directory is clean!" -ForegroundColor White
}

Write-Host ""
Write-Host "───────────────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host "                         Script Completed                              " -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
