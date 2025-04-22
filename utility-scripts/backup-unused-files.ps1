# Script to back up potentially unused files from the Shopify theme
$buildFolder = "..\Curalife-Theme-Build"
$backupFolder = "..\backups\Unused-Assets-Backup"
$logFile = "unused-files-backup-log.txt"
$reportFile = "..\unused-files-report.txt"

# Create backup folder if it doesn't exist
if (-not (Test-Path -Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory -Force | Out-Null
    Write-Output "Created backup folder: $backupFolder"
}

# Read the unused files from the report
if (-not (Test-Path -Path $reportFile)) {
    Write-Output "Error: Could not find the unused files report ($reportFile)."
    Write-Output "Please run find-unused-files.ps1 first to generate the report."
    exit 1
}

# Parse the report file to extract unused file names
$reportContent = Get-Content -Path $reportFile -Raw
# Find the section with unused files (between POTENTIALLY UNUSED FILES: and NOTE:)
if ($reportContent -match "POTENTIALLY UNUSED FILES:\s*------------------------\s*([\s\S]*?)\s*NOTE:") {
    $unusedFilesSection = $matches[1].Trim()
    $unusedFiles = $unusedFilesSection -split "`r?`n" | Where-Object { $_ -ne "" }
} else {
    Write-Output "Error: Could not parse the unused files from the report."
    exit 1
}

# Initialize log
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$assetsPath = "$buildFolder\assets"

# Create log content without using here-strings
$logContent = "BACKUP LOG - $timestamp`r`n"
$logContent += "=======================`r`n"
$logContent += "The following files were backed up from $assetsPath to $backupFolder:`r`n`r`n"

# Initialize counters
$backedUpCount = 0
$errorCount = 0
$skippedCount = 0

# Process each file
foreach ($file in $unusedFiles) {
    $sourcePath = Join-Path -Path $buildFolder -ChildPath "assets\$file"
    $destPath = Join-Path -Path $backupFolder -ChildPath $file

    if (Test-Path -Path $sourcePath) {
        try {
            # Copy file to backup location
            Copy-Item -Path $sourcePath -Destination $destPath -Force

            # If copy was successful, remove the original
            if (Test-Path -Path $destPath) {
                Remove-Item -Path $sourcePath -Force
                $logContent += "✓ Moved: $file`r`n"
                $backedUpCount++
            } else {
                $logContent += "✗ Error backing up: $file (Copy failed)`r`n"
                $errorCount++
            }
        } catch {
            $logContent += "✗ Error backing up: $file ($_)`r`n"
            $errorCount++
        }
    } else {
        $logContent += "⚠ Skipped: $file (File not found)`r`n"
        $skippedCount++
    }
}

# Add summary to log
$logContent += "`r`nSUMMARY:`r`n"
$logContent += "--------`r`n"
$logContent += "Total files processed: $($unusedFiles.Count)`r`n"
$logContent += "Files successfully backed up and removed: $backedUpCount`r`n"
$logContent += "Files skipped (not found): $skippedCount`r`n"
$logContent += "Errors: $errorCount`r`n`r`n"
$logContent += "All backed up files are stored in the '$backupFolder' directory.`r`n"
$logContent += "If you need to restore any files, simply copy them back to the '$assetsPath' directory.`r`n"

# Write log to file
$logContent | Out-File -FilePath $logFile

# Output summary
Write-Output "`nBackup complete!"
Write-Output "Total files processed: $($unusedFiles.Count)"
Write-Output "Files successfully backed up and removed: $backedUpCount"
Write-Output "Files skipped (not found): $skippedCount"
Write-Output "Errors: $errorCount"
Write-Output "`nDetailed log written to: $logFile"
Write-Output "All backed up files are stored in the '$backupFolder' directory."