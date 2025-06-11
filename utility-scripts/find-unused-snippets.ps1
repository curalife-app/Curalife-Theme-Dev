# Find Unused Snippets in Shopify Theme
# This script analyzes all files to find which snippets are not rendered/included anywhere
# and generates a report of truly unused snippets (excluding deprecated ones)

# Define paths
$sourceSnippetsPath = "..\src/liquid/snippets"
$buildSnippetsPath = "..\Curalife-Theme-Build/snippets"
$buildLiquidPath = "..\Curalife-Theme-Build"
$outputReportPath = "..\unused-snippets-report.txt"
$detailedAnalysisPath = "..\snippet-usage-analysis.csv"

Write-Host "Starting analysis of unused snippets..." -ForegroundColor Cyan

# Function to get all snippet files from source directory
function Get-AllSnippetFiles {
    param (
        [string]$basePath
    )

    # Get all .liquid files in the snippets directory and subdirectories
    $snippetFiles = Get-ChildItem -Path $basePath -Filter "*.liquid" -Recurse |
                    Select-Object -ExpandProperty FullName |
                    ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    return $snippetFiles
}

# Function to get all build snippet files
function Get-BuildSnippetFiles {
    param (
        [string]$buildPath
    )

    $buildSnippetFiles = Get-ChildItem -Path $buildPath -Filter "*.liquid" |
                        Select-Object -ExpandProperty Name

    return $buildSnippetFiles
}

# Function to get all files that might reference snippets
function Get-AllLiquidFiles {
    param (
        [string]$buildPath
    )

    # Get all liquid files (sections, templates, layouts, other snippets)
    $liquidFiles = Get-ChildItem -Path $buildPath -Filter "*.liquid" -Recurse |
                   Select-Object -ExpandProperty FullName |
                   ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    # Get JSON templates that might reference snippets
    $jsonFiles = Get-ChildItem -Path $buildPath -Include "*.json" -Recurse |
                 Select-Object -ExpandProperty FullName |
                 ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    return $liquidFiles + $jsonFiles
}

# Function to check if a snippet is used anywhere
function Is-SnippetUsed {
    param (
        [string]$snippetName,
        [array]$allFiles
    )

    $snippetNameWithoutPath = $snippetName.Split('/')[-1]
    $snippetNameWithoutExtension = $snippetNameWithoutPath.Replace(".liquid", "")
    $usageCount = 0
    $fileMatches = @()

    foreach ($file in $allFiles) {
        $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue

        if ($content) {
            # Check for render and include patterns
            $patterns = @(
                # Modern Shopify render syntax
                "render\s+['""]$snippetNameWithoutExtension['""]",
                # Legacy include syntax (still supported)
                "include\s+['""]$snippetNameWithoutExtension['""]",
                # With variables
                "render\s+['""]$snippetNameWithoutExtension['""],",
                "include\s+['""]$snippetNameWithoutExtension['""],",
                # In schema references
                "['""]$snippetNameWithoutExtension['""]"
            )

            foreach ($pattern in $patterns) {
                if ($content -match $pattern) {
                    $usageCount++
                    $fileMatches += $file
                    break
                }
            }
        }
    }

    return @{
        IsUsed = ($usageCount -gt 0)
        UsageCount = $usageCount
        Files = $fileMatches | Select-Object -Unique
    }
}

# Function to determine if a snippet is likely deprecated
function Is-SnippetDeprecated {
    param (
        [string]$snippetPath,
        [string]$snippetName
    )

    # Check various indicators that a snippet might be deprecated
    if ($snippetPath -match "/originals/") {
        return @{
            IsDeprecated = $true
            Reason = "Located in 'originals' directory, likely kept for reference"
        }
    }
    elseif ($snippetName -match "(-old|-v\d|-backup|-test)") {
        return @{
            IsDeprecated = $true
            Reason = "Naming suggests it's an older version, test file, or backup"
        }
    }
    elseif ($snippetName -match "\d{4}") {
        # If there's a year in the name but it's not the current year
        $currentYear = (Get-Date).Year
        $fileYear = [regex]::Match($snippetName, "\d{4}").Value
        if ($fileYear -ne $currentYear -and $fileYear -lt $currentYear) {
            return @{
                IsDeprecated = $true
                Reason = "Contains year $fileYear in the name, may be from a previous campaign"
            }
        }
    }
    elseif ($snippetName -match "^(icon-)" -and $snippetPath -match "/originals/") {
        return @{
            IsDeprecated = $true
            Reason = "Icon file in originals directory, likely replaced by newer icons"
        }
    }

    return @{
        IsDeprecated = $false
        Reason = ""
    }
}

# Get all snippet files
Write-Host "Finding all snippet files in source directory..." -ForegroundColor Yellow
$allSourceSnippetFiles = Get-AllSnippetFiles -basePath $sourceSnippetsPath
Write-Host "Found $($allSourceSnippetFiles.Count) snippet files in source." -ForegroundColor Green

Write-Host "Finding all snippet files in build directory..." -ForegroundColor Yellow
$allBuildSnippetFiles = Get-BuildSnippetFiles -buildPath $buildSnippetsPath
Write-Host "Found $($allBuildSnippetFiles.Count) snippet files in build." -ForegroundColor Green

Write-Host "Finding all liquid and JSON files that might reference snippets..." -ForegroundColor Yellow
$allReferencingFiles = Get-AllLiquidFiles -buildPath $buildLiquidPath
Write-Host "Found $($allReferencingFiles.Count) files to search for snippet references." -ForegroundColor Green

# Analyze snippet usage
$snippetAnalysis = @()
$unusedSnippets = @()
$trulyUnusedSnippets = @()
$count = 0
$total = $allSourceSnippetFiles.Count

Write-Host "Analyzing snippet usage..." -ForegroundColor Yellow

foreach ($snippetFile in $allSourceSnippetFiles) {
    $count++
    Write-Progress -Activity "Analyzing snippet usage" -Status "Checking $snippetFile" -PercentComplete (($count / $total) * 100)

    $snippetNameWithoutPath = $snippetFile.Split('/')[-1]
    $snippetNameWithoutExtension = $snippetNameWithoutPath.Replace(".liquid", "")

    # Check if in build directory
    $isInBuild = $allBuildSnippetFiles -contains $snippetNameWithoutPath

    # Check usage
    $usageResult = Is-SnippetUsed -snippetName $snippetFile -allFiles $allReferencingFiles

    # Check if likely deprecated
    $deprecationStatus = Is-SnippetDeprecated -snippetPath $snippetFile -snippetName $snippetNameWithoutExtension

    # Add to analysis
    $snippetAnalysis += [PSCustomObject]@{
        Name = $snippetNameWithoutExtension
        Path = $snippetFile
        IsInBuild = $isInBuild
        IsUsed = $usageResult.IsUsed
        UsageCount = $usageResult.UsageCount
        UsedInFiles = ($usageResult.Files -join "; ")
        IsLikelyDeprecated = $deprecationStatus.IsDeprecated
        DeprecationReason = $deprecationStatus.Reason
    }

    # Add to unused snippets if not used
    if (-not $usageResult.IsUsed) {
        $unusedSnippets += @{
            Path = $snippetFile
            Name = $snippetNameWithoutExtension
            IsInBuild = $isInBuild
            IsLikelyDeprecated = $deprecationStatus.IsDeprecated
            DeprecationReason = $deprecationStatus.Reason
            UsageInfo = $usageResult
        }

        # Add to "truly unused" snippets if not deprecated and present in build
        if (-not $deprecationStatus.IsDeprecated -and $isInBuild) {
            $trulyUnusedSnippets += @{
                Path = $snippetFile
                Name = $snippetNameWithoutExtension
                IsInBuild = $isInBuild
            }
        }
    }
}

Write-Progress -Activity "Analyzing snippet usage" -Completed

# Also check for snippets in build that are not in source
$buildOnlySnippets = @()
foreach ($buildSnippet in $allBuildSnippetFiles) {
    $foundInSource = $false
    foreach ($sourceSnippet in $allSourceSnippetFiles) {
        if ($sourceSnippet.EndsWith("/$buildSnippet")) {
            $foundInSource = $true
            break
        }
    }

    if (-not $foundInSource) {
        $buildOnlySnippets += $buildSnippet
    }
}

# Export detailed analysis to CSV
$snippetAnalysis | Export-Csv -Path $detailedAnalysisPath -NoTypeInformation
Write-Host "Detailed analysis exported to: $detailedAnalysisPath" -ForegroundColor Green

# Generate report
Write-Host "Generating report of unused snippets..." -ForegroundColor Yellow

$reportContent = "# Unused Snippets Not Referenced Anywhere`n"
$reportContent += "Generated on $(Get-Date)`n`n"
$reportContent += "## Summary`n"
$reportContent += "* Total source snippet files: $($allSourceSnippetFiles.Count)`n"
$reportContent += "* Total build snippet files: $($allBuildSnippetFiles.Count)`n"
$reportContent += "* Total files analyzed for references: $($allReferencingFiles.Count)`n"
$reportContent += "* Truly unused snippet files: $($trulyUnusedSnippets.Count)`n"
$reportContent += "* Total unused (including deprecated): $($unusedSnippets.Count)`n`n"

if ($trulyUnusedSnippets.Count -gt 0) {
    $reportContent += "## Unused Snippets (Non-Deprecated)`n"
    $reportContent += "These snippets are present in both source and build, but not referenced anywhere.`n`n"

    foreach ($snippet in $trulyUnusedSnippets) {
        $reportContent += "### $($snippet.Name)`n"
        $reportContent += "* Path: $($snippet.Path)`n`n"
    }
}

if ($buildOnlySnippets.Count -gt 0) {
    $reportContent += "## Build-Only Snippets`n"
    $reportContent += "These snippets exist in build but not in source (may be generated or manually added):`n`n"
    foreach ($snippet in $buildOnlySnippets) {
        $reportContent += "* $snippet`n"
    }
    $reportContent += "`n"
}

# Save report
$reportContent | Out-File -FilePath $outputReportPath -Encoding utf8

Write-Host "Report generated successfully at: $outputReportPath" -ForegroundColor Green
Write-Host "Found $($trulyUnusedSnippets.Count) truly unused snippets (not deprecated but not referenced)." -ForegroundColor Cyan

# Display preview of results
if ($trulyUnusedSnippets.Count -gt 0) {
    Write-Host "`nUnused snippets not referenced anywhere:" -ForegroundColor Yellow
    $trulyUnusedSnippets | ForEach-Object {
        Write-Host "- $($_.Name) ($($_.Path))" -ForegroundColor Gray
    }
}

if ($buildOnlySnippets.Count -gt 0) {
    Write-Host "`nBuild-only snippets:" -ForegroundColor Yellow
    $buildOnlySnippets | ForEach-Object {
        Write-Host "- $_" -ForegroundColor Gray
    }
}