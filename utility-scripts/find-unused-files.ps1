# Script to find potentially unused files in the Shopify theme build folder
$buildFolder = "..\Curalife-Theme-Build"
$resultsFile = "..\unused-files-report.txt"

# Initialize results
$unusedFiles = @()
$errorFiles = @()
$searchableExtensions = @(".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".gif")

# Get all asset files we want to check
$assetFiles = Get-ChildItem -Path "$buildFolder\assets" -File | Where-Object {
    $extension = [System.IO.Path]::GetExtension($_.Name)
    $searchableExtensions -contains $extension
}

# Get all theme files that might reference assets
$liquidFiles = Get-ChildItem -Path $buildFolder -Include "*.liquid" -Recurse -File
$jsonFiles = Get-ChildItem -Path $buildFolder -Include "*.json" -Recurse -File
$jsFiles = Get-ChildItem -Path $buildFolder -Include "*.js" -Recurse -File

# Output start info
Write-Output "Starting search for unused files in $buildFolder..."
Write-Output "Found $($assetFiles.Count) asset files to check"
Write-Output "Found $($liquidFiles.Count) liquid files to search within"
Write-Output "Found $($jsonFiles.Count) JSON files to search within"
Write-Output "Found $($jsFiles.Count) JS files to search within"

# Create a hash table to track file usage
$fileUsage = @{}

# Initialize all files as unused
foreach ($file in $assetFiles) {
    $fileUsage[$file.Name] = $false
}

# Check each asset file for references
foreach ($file in $assetFiles) {
    $fileName = $file.Name
    $fileNameWithoutExtension = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $isUsed = $false

    try {
        # Common Shopify asset reference patterns
        $patterns = @(
            # Standard asset reference in liquid ({{ 'file.js' | asset_url }})
            "'$fileName'",
            # Liquid asset_url filter
            "'$fileNameWithoutExtension'",
            # Plain filename reference
            $fileName,
            # Without extension (often used in JS imports)
            $fileNameWithoutExtension
        )

        foreach ($pattern in $patterns) {
            # Check in liquid files
            $referencesInLiquid = $liquidFiles | Select-String -Pattern $pattern -ErrorAction SilentlyContinue
            if ($referencesInLiquid.Count -gt 0) {
                $isUsed = $true
                break
            }

            # Check in JSON files
            $referencesInJson = $jsonFiles | Select-String -Pattern $pattern -ErrorAction SilentlyContinue
            if ($referencesInJson.Count -gt 0) {
                $isUsed = $true
                break
            }

            # Check in JS files
            $referencesInJs = $jsFiles | Select-String -Pattern $pattern -ErrorAction SilentlyContinue
            if ($referencesInJs.Count -gt 0) {
                $isUsed = $true
                break
            }
        }

        # Update usage status
        $fileUsage[$fileName] = $isUsed
    }
    catch {
        $errorFiles += $fileName
        Write-Output "Error checking $fileName : $_"
    }
}

# Collect unused files
foreach ($key in $fileUsage.Keys) {
    if ($fileUsage[$key] -eq $false) {
        $unusedFiles += $key
    }
}

# Sort the unused files list
$unusedFiles = $unusedFiles | Sort-Object

# Output results
Write-Output "`nPotentially unused files: $($unusedFiles.Count) out of $($assetFiles.Count)"

# Write results to file
$report = @"
UNUSED FILES REPORT
==================
Generated on $(Get-Date)
Total asset files checked: $($assetFiles.Count)
Total potentially unused files: $($unusedFiles.Count)

POTENTIALLY UNUSED FILES:
------------------------
$($unusedFiles -join "`n")

NOTE: These files may still be used via dynamic references or JavaScript imports that couldn't be detected by static analysis.
Files might also be used in ways that our script doesn't check for, such as:
- Files loaded via dynamic variable names
- Files referenced through complex Liquid tags
- Files loaded via Ajax or fetch calls
- Files defined in settings_schema.json with complex structures
"@

$report | Out-File -FilePath $resultsFile

Write-Output "Report written to $resultsFile"
Write-Output "IMPORTANT: This is just a static analysis. Some files might still be in use through means we cannot detect."