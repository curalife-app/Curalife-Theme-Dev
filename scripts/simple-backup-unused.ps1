# Simple script to back up and remove unused files
$buildFolder = "..\Curalife-Theme-Build"
$backupFolder = "..\backups\Unused-Assets-Backup"
$reportFile = "..\unused-files-report.txt"

# Ensure the backup folder exists
if (-not (Test-Path -Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory -Force | Out-Null
    Write-Host "Created backup folder: $backupFolder"
}

# List of unused files from our previous analysis
$unusedFiles = @(
    "challenge-section-main-img.png",
    "checkout-payment-badges-amex.png",
    "checkout-payment-badges-diners.png",
    "checkout-payment-badges-discover.png",
    "checkout-payment-badges-jcb.png",
    "checkout-payment-badges-mastercard.png",
    "checkout-payment-badges-visa.png",
    "checkout-payment-systems.png",
    "checkout-review-thumbnail-1.png",
    "checkout-review-thumbnail-2.png",
    "checkout-reviews-stars.png",
    "checkout-steps-bg-active.png",
    "checkout-steps-bg-disabled.png",
    "collection-badges-vector.svg",
    "icon-gummy.png",
    "jquery-4.0.0-beta.min.js",
    "mstile-144x144.png",
    "mstile-150x150.png",
    "mstile-310x310.png",
    "mstile-70x70.png",
    "prime-day-banner-badge.png",
    "prime-day-banner-confetti.png",
    "prime-day-banner-title.png",
    "product-badge.png",
    "thank-you-best-results-bottle.png",
    "thank-you-best-results-leaf.png",
    "thank-you-page-whistle.png",
    "thank-you-week-1.png",
    "thank-you-week-2.png",
    "thank-you-week-3.png",
    "thank-you-week-4.png"
)

# Initialize counters
$moved = 0
$notFound = 0
$errors = 0

# Process each file
foreach ($file in $unusedFiles) {
    $sourcePath = "$buildFolder\assets\$file"
    $destPath = "$backupFolder\$file"

    if (Test-Path -Path $sourcePath) {
        try {
            # Copy to backup
            Copy-Item -Path $sourcePath -Destination $destPath -Force

            # Delete original if backup successful
            if (Test-Path -Path $destPath) {
                Remove-Item -Path $sourcePath -Force
                Write-Host "Moved: $file" -ForegroundColor Green
                $moved++
            } else {
                Write-Host "Failed to backup: $file" -ForegroundColor Red
                $errors++
            }
        } catch {
            Write-Host "Error processing $file : $_" -ForegroundColor Red
            $errors++
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
        $notFound++
    }
}

# Output summary
Write-Host "`nBackup Summary:" -ForegroundColor Cyan
Write-Host "---------------" -ForegroundColor Cyan
Write-Host "Total files processed: $($unusedFiles.Count)"
Write-Host "Successfully moved: $moved" -ForegroundColor Green
Write-Host "Not found: $notFound" -ForegroundColor Yellow
Write-Host "Errors: $errors" -ForegroundColor Red
Write-Host "`nAll backed up files are in the '$backupFolder' directory."
Write-Host "You can copy them back if needed."