# Enhanced script to find potentially unused asset files in the Shopify theme
# This script improves upon the basic asset finder with more comprehensive pattern matching

$buildFolder = "..\Curalife-Theme-Build"
$resultsFile = "..\unused-assets-enhanced-report.txt"
$detailedAnalysisPath = "..\asset-usage-analysis.csv"

# Initialize results
$unusedAssets = @()
$errorFiles = @()
$searchableExtensions = @(".js", ".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2", ".eot", ".ttf", ".otf")

# Get all asset files we want to check
$assetFiles = Get-ChildItem -Path "$buildFolder\assets" -File | Where-Object {
    $extension = [System.IO.Path]::GetExtension($_.Name)
    $searchableExtensions -contains $extension
}

# Get all files that might reference assets
$liquidFiles = Get-ChildItem -Path $buildFolder -Include "*.liquid" -Recurse -File
$jsonFiles = Get-ChildItem -Path $buildFolder -Include "*.json" -Recurse -File
$jsFiles = Get-ChildItem -Path $buildFolder -Include "*.js" -Recurse -File
$cssFiles = Get-ChildItem -Path $buildFolder -Include "*.css" -Recurse -File

Write-Output "Starting enhanced search for unused assets in $buildFolder..."
Write-Output "Found $($assetFiles.Count) asset files to check"
Write-Output "Found $($liquidFiles.Count) liquid files to search"
Write-Output "Found $($jsonFiles.Count) JSON files to search"
Write-Output "Found $($jsFiles.Count) JS files to search"
Write-Output "Found $($cssFiles.Count) CSS files to search"

# Create detailed analysis array
$assetAnalysis = @()

# Check each asset file for references
foreach ($file in $assetFiles) {
    $fileName = $file.Name
    $fileNameWithoutExtension = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $fileExtension = [System.IO.Path]::GetExtension($fileName)
    $isUsed = $false
    $usageCount = 0
    $foundInFiles = @()

    try {
        # Enhanced reference patterns
        $patterns = @()

        # Standard Shopify asset references
        $patterns += "'$fileName'"
        $patterns += "`"$fileName`""
        $patterns += "asset_url.*'$fileName'"
        $patterns += "asset_url.*`"$fileName`""
        $patterns += "'$fileNameWithoutExtension'"
        $patterns += "`"$fileNameWithoutExtension`""

        # CSS and font specific patterns
        if ($fileExtension -in @(".woff", ".woff2", ".eot", ".ttf", ".otf")) {
            $patterns += "url\(\s*['""]?[^'""]*$fileName['""]?\s*\)"
            $patterns += "src:\s*[^;]*$fileName"
            $patterns += "font-family.*$fileNameWithoutExtension"
        }

        # Image specific patterns
        if ($fileExtension -in @(".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")) {
            $patterns += "background-image.*$fileName"
            $patterns += "background.*url.*$fileName"
            $patterns += "src=['""].*$fileName['""]"
            $patterns += "srcset.*$fileName"
            $patterns += "content:\s*url\(['""]?[^'""]*$fileName"
        }

        # JavaScript specific patterns
        if ($fileExtension -eq ".js") {
            $patterns += "import.*['""].*$fileName['""]"
            $patterns += "import.*['""].*$fileNameWithoutExtension['""]"
            $patterns += "require\(['""].*$fileName['""]"
            $patterns += "require\(['""].*$fileNameWithoutExtension['""]"
            $patterns += "loadScript.*$fileName"
            $patterns += "script.*src.*$fileName"
        }

        # CSS specific patterns
        if ($fileExtension -in @(".css", ".scss")) {
            $patterns += "@import.*['""].*$fileName['""]"
            $patterns += "href=['""].*$fileName['""]"
        }

        # SVG specific patterns
        if ($fileExtension -eq ".svg") {
            $patterns += "icon.*$fileNameWithoutExtension"
            $patterns += "svg.*$fileNameWithoutExtension"
            $patterns += "<use.*$fileNameWithoutExtension"
        }

        # Generic patterns
        $patterns += $fileName
        $patterns += $fileNameWithoutExtension

        # Check all files for each pattern
        $allFiles = $liquidFiles + $jsonFiles + $jsFiles + $cssFiles

        foreach ($pattern in $patterns) {
            foreach ($searchFile in $allFiles) {
                try {
                    $references = Select-String -Path $searchFile.FullName -Pattern $pattern -ErrorAction SilentlyContinue
                    if ($references.Count -gt 0) {
                        $isUsed = $true
                        $usageCount += $references.Count
                        $foundInFiles += $searchFile.Name
                    }
                } catch {
                    # Ignore errors in individual file searches
                }
            }

            # Break early if we found usage
            if ($isUsed) {
                break
            }
        }

        # Special check for schema files and settings
        if (-not $isUsed) {
            # Check for references in schema sections
            foreach ($searchFile in $jsonFiles) {
                try {
                    $content = Get-Content -Path $searchFile.FullName -Raw -ErrorAction SilentlyContinue
                    if ($content -and ($content -match $fileName -or $content -match $fileNameWithoutExtension)) {
                        $isUsed = $true
                        $usageCount++
                        $foundInFiles += $searchFile.Name
                        break
                    }
                } catch {
                    # Ignore errors
                }
            }
        }

        # Add to analysis
        $assetAnalysis += [PSCustomObject]@{
            FileName = $fileName
            FileType = $fileExtension
            IsUsed = $isUsed
            UsageCount = $usageCount
            FoundInFiles = ($foundInFiles | Select-Object -Unique | Sort-Object) -join "; "
            FileSize = [math]::Round($file.Length / 1KB, 2)
        }

        # Add to unused list if not used
        if (-not $isUsed) {
            $unusedAssets += $fileName
        }

    } catch {
        $errorFiles += $fileName
        Write-Output "Error checking $fileName : $_"
    }
}

# Export detailed analysis to CSV
$assetAnalysis | Export-Csv -Path $detailedAnalysisPath -NoTypeInformation
Write-Output "Detailed analysis exported to: $detailedAnalysisPath"

# Sort the unused files list
$unusedAssets = $unusedAssets | Sort-Object

# Calculate space savings
$totalUnusedSize = 0
foreach ($unusedAsset in $unusedAssets) {
    $assetFile = Get-Item "$buildFolder\assets\$unusedAsset" -ErrorAction SilentlyContinue
    if ($assetFile) {
        $totalUnusedSize += $assetFile.Length
    }
}

$totalUnusedSizeMB = [math]::Round($totalUnusedSize / 1MB, 2)

# Output results
Write-Output "`nPotentially unused assets: $($unusedAssets.Count) out of $($assetFiles.Count)"
Write-Output "Total size of unused assets: $totalUnusedSizeMB MB"

# Write enhanced report to file
$report = @"
ENHANCED UNUSED ASSETS REPORT
============================
Generated on $(Get-Date)
Total asset files checked: $($assetFiles.Count)
Total potentially unused files: $($unusedAssets.Count)
Total size of unused assets: $totalUnusedSizeMB MB

SEARCH COVERAGE:
- Liquid files searched: $($liquidFiles.Count)
- JSON files searched: $($jsonFiles.Count)
- JavaScript files searched: $($jsFiles.Count)
- CSS files searched: $($cssFiles.Count)

ENHANCED PATTERN MATCHING:
- Standard Shopify asset_url references
- CSS url() references and font declarations
- JavaScript import/require statements
- Background image references
- SVG icon references
- Schema and settings references
- Generic filename and path references

POTENTIALLY UNUSED ASSETS:
-------------------------
$($unusedAssets -join "`n")

BREAKDOWN BY FILE TYPE:
"@

# Add file type breakdown
$fileTypeBreakdown = $assetAnalysis | Where-Object { -not $_.IsUsed } | Group-Object FileType | Sort-Object Count -Descending
foreach ($group in $fileTypeBreakdown) {
    $report += "`n$($group.Name): $($group.Count) files"
}

$report += @"

SPACE SAVINGS BY FILE TYPE:
"@

foreach ($group in $fileTypeBreakdown) {
    $groupSize = 0
    foreach ($asset in $group.Group) {
        $assetFile = Get-Item "$buildFolder\assets\$($asset.FileName)" -ErrorAction SilentlyContinue
        if ($assetFile) {
            $groupSize += $assetFile.Length
        }
    }
    $groupSizeMB = [math]::Round($groupSize / 1MB, 2)
    $report += "`n$($group.Name): $groupSizeMB MB"
}

$report += @"

NOTE: This enhanced analysis uses more comprehensive pattern matching than the basic script.
However, files may still be used via:
- Dynamic variable names in JavaScript
- Complex Liquid template logic
- External references not in the theme files
- Runtime-generated asset paths
- Third-party integrations

RECOMMENDATION: Review the detailed analysis CSV file for more information about each asset's usage patterns.
"@

$report | Out-File -FilePath $resultsFile

Write-Output "Enhanced report written to $resultsFile"
Write-Output "IMPORTANT: This enhanced analysis is more thorough but may still miss some dynamic references."