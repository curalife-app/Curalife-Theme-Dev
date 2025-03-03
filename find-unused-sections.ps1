# Find Unused Sections in Shopify Theme
# This script analyzes templates to find which sections are not included in any templates
# and generates a report of truly unused sections (excluding deprecated ones)

# Define paths
$sourceSectionsPath = "src/liquid/sections"
$buildSectionsPath = "Curalife-Theme-Build/sections"
$buildTemplatesPath = "Curalife-Theme-Build/templates"
$outputReportPath = "unused-sections-report.txt"
$detailedAnalysisPath = "section-usage-analysis.csv"

Write-Host "Starting analysis of unused sections..." -ForegroundColor Cyan

# Function to get all section files from source directory
function Get-AllSectionFiles {
    param (
        [string]$basePath
    )

    # Get all .liquid files in the sections directory and subdirectories
    $sectionFiles = Get-ChildItem -Path $basePath -Filter "*.liquid" -Recurse |
                    Select-Object -ExpandProperty FullName |
                    ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    return $sectionFiles
}

# Function to get all section files from build directory
function Get-BuildSectionFiles {
    param (
        [string]$buildPath
    )

    $buildSectionFiles = Get-ChildItem -Path $buildPath -Filter "*.liquid" |
                        Select-Object -ExpandProperty Name

    return $buildSectionFiles
}

# Function to get all template files
function Get-AllTemplateFiles {
    param (
        [string]$templatesPath
    )

    # Get all JSON and liquid template files
    $jsonTemplates = Get-ChildItem -Path $templatesPath -Filter "*.json" -Recurse |
                    Select-Object -ExpandProperty FullName |
                    ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    $liquidTemplates = Get-ChildItem -Path $templatesPath -Filter "*.liquid" -Recurse |
                       Select-Object -ExpandProperty FullName |
                       ForEach-Object { $_.Replace("$PWD\", "").Replace("\", "/") }

    return $jsonTemplates + $liquidTemplates
}

# Function to check if a section is used in any template
function Is-SectionUsedInTemplates {
    param (
        [string]$sectionName,
        [array]$templateFiles
    )

    $sectionNameWithoutPath = $sectionName.Split('/')[-1]
    $sectionNameWithoutExtension = $sectionNameWithoutPath.Replace(".liquid", "")
    $usageCount = 0
    $templateMatches = @()

    foreach ($templateFile in $templateFiles) {
        $content = Get-Content -Path $templateFile -Raw -ErrorAction SilentlyContinue

        if ($content) {
            # For JSON templates, check different section reference patterns
            if ($templateFile -match "\.json$") {
                # Try to parse as JSON to properly analyze
                try {
                    $jsonContent = $content | ConvertFrom-Json -ErrorAction SilentlyContinue

                    # If JSON parsing successful, analyze the sections property
                    if ($jsonContent -and $jsonContent.sections) {
                        $sectionEntries = $jsonContent.sections | Get-Member -MemberType NoteProperty

                        foreach ($sectionEntry in $sectionEntries) {
                            $sectionKey = $sectionEntry.Name
                            $sectionData = $jsonContent.sections.$sectionKey

                            # Check if this section has a "type" property matching our section name
                            if ($sectionData.type -eq $sectionNameWithoutExtension) {
                                $usageCount++
                                $templateMatches += $templateFile
                                break
                            }
                        }
                    }
                }
                catch {
                    # If JSON parsing fails, fall back to regex
                    if ($content -match ("`"type`"\s*:\s*`"" + $sectionNameWithoutExtension + "`"") -or
                        $content -match ("`"section`"\s*:\s*`"" + $sectionNameWithoutExtension + "`"")) {
                        $usageCount++
                        $templateMatches += $templateFile
                    }
                }
            }
            # For liquid templates, check for section includes
            elseif ($templateFile -match "\.liquid$") {
                if ($content -match ("(?:section|sections):\s*['""]" + $sectionNameWithoutExtension + "['""]") -or
                    $content -match ("(?:render|include)\s+['""]" + $sectionNameWithoutExtension + "['""]")) {
                    $usageCount++
                    $templateMatches += $templateFile
                }
            }
        }
    }

    return @{
        IsUsed = ($usageCount -gt 0)
        UsageCount = $usageCount
        Templates = $templateMatches
    }
}

# Function to check if a section is included in other sections
function Is-SectionIncludedInOtherSections {
    param (
        [string]$sectionName,
        [array]$allSectionFiles,
        [hashtable]$usedSectionsMap
    )

    $sectionNameWithoutPath = $sectionName.Split('/')[-1]
    $sectionNameWithoutExtension = $sectionNameWithoutPath.Replace(".liquid", "")
    $includeCount = 0
    $includedBy = @()

    # Search all section files for includes of this section
    foreach ($potentialParentSection in $allSectionFiles) {
        if ($potentialParentSection -ne $sectionName) {
            $parentSectionName = $potentialParentSection.Split('/')[-1].Replace(".liquid", "")
            $content = Get-Content -Path $potentialParentSection -Raw -ErrorAction SilentlyContinue

            if ($content -and ($content -match ("(?:include|render)\s+['""]" + $sectionNameWithoutExtension + "['""]"))) {
                # Only count inclusions by sections that are themselves used
                if ($usedSectionsMap.ContainsKey($parentSectionName) -and $usedSectionsMap[$parentSectionName]) {
                    $includeCount++
                    $includedBy += $potentialParentSection.Split('/')[-1]
                }
            }
        }
    }

    return @{
        IsIncluded = ($includeCount -gt 0)
        IncludeCount = $includeCount
        IncludedBy = $includedBy
    }
}

# Function to determine if a section is likely deprecated
function Is-LikelyDeprecated {
    param (
        [string]$sectionPath,
        [string]$sectionName
    )

    # Check various indicators that a section might be deprecated
    if ($sectionPath -match "/originals/") {
        return @{
            IsDeprecated = $true
            Reason = "Located in 'originals' directory, likely kept for reference"
        }
    }
    elseif ($sectionName -match "(-old|-v\d|-backup)") {
        return @{
            IsDeprecated = $true
            Reason = "Naming suggests it's an older version that has been replaced"
        }
    }
    elseif ($sectionName -match "\d{4}") {
        # If there's a year in the name but it's not the current year
        $currentYear = (Get-Date).Year
        $fileYear = [regex]::Match($sectionName, "\d{4}").Value
        if ($fileYear -ne $currentYear) {
            return @{
                IsDeprecated = $true
                Reason = "Contains year $fileYear in the name, may be from a previous campaign"
            }
        }
    }

    return @{
        IsDeprecated = $false
        Reason = ""
    }
}

# Get all section files (source and build)
Write-Host "Finding all section files in source directory..." -ForegroundColor Yellow
$allSourceSectionFiles = Get-AllSectionFiles -basePath $sourceSectionsPath
Write-Host "Found $($allSourceSectionFiles.Count) section files in source." -ForegroundColor Green

Write-Host "Finding all section files in build directory..." -ForegroundColor Yellow
$allBuildSectionFiles = Get-BuildSectionFiles -buildPath $buildSectionsPath
Write-Host "Found $($allBuildSectionFiles.Count) section files in build." -ForegroundColor Green

Write-Host "Finding all template files..." -ForegroundColor Yellow
$allTemplateFiles = Get-AllTemplateFiles -templatesPath $buildTemplatesPath
Write-Host "Found $($allTemplateFiles.Count) template files." -ForegroundColor Green

# First pass - find all sections directly referenced in templates
$directlyUsedSections = @{}
$sectionTemplateUsage = @{}

Write-Host "Analyzing which sections are directly used in templates..." -ForegroundColor Yellow
$count = 0
$total = $allSourceSectionFiles.Count

foreach ($sectionFile in $allSourceSectionFiles) {
    $count++
    Write-Progress -Activity "Analyzing template usage" -Status "Checking $sectionFile" -PercentComplete (($count / $total) * 100)

    $sectionNameWithoutPath = $sectionFile.Split('/')[-1]
    $sectionNameWithoutExtension = $sectionNameWithoutPath.Replace(".liquid", "")

    $templateUsage = Is-SectionUsedInTemplates -sectionName $sectionFile -templateFiles $allTemplateFiles
    $directlyUsedSections[$sectionNameWithoutExtension] = $templateUsage.IsUsed
    $sectionTemplateUsage[$sectionNameWithoutExtension] = $templateUsage
}

# Second pass - find sections included by other sections that are used
$indirectlyUsedSections = @{}
$sectionInclusionUsage = @{}

Write-Host "Analyzing which sections are included by other used sections..." -ForegroundColor Yellow
$count = 0
foreach ($sectionFile in $allSourceSectionFiles) {
    $count++
    Write-Progress -Activity "Analyzing section inclusions" -Status "Checking $sectionFile" -PercentComplete (($count / $total) * 100)

    $sectionNameWithoutPath = $sectionFile.Split('/')[-1]
    $sectionNameWithoutExtension = $sectionNameWithoutPath.Replace(".liquid", "")

    $includedUsage = Is-SectionIncludedInOtherSections -sectionName $sectionFile -allSectionFiles $allSourceSectionFiles -usedSectionsMap $directlyUsedSections
    $indirectlyUsedSections[$sectionNameWithoutExtension] = $includedUsage.IsIncluded
    $sectionInclusionUsage[$sectionNameWithoutExtension] = $includedUsage
}

# Analyze all sections
$sectionAnalysis = @()
$unusedSections = @()
$trulyUnusedSections = @()
$count = 0

foreach ($sectionFile in $allSourceSectionFiles) {
    $count++
    Write-Progress -Activity "Finalizing analysis" -Status "Processing $sectionFile" -PercentComplete (($count / $total) * 100)

    $sectionNameWithoutPath = $sectionFile.Split('/')[-1]
    $sectionNameWithoutExtension = $sectionNameWithoutPath.Replace(".liquid", "")

    # Check if in build directory
    $isInBuild = $allBuildSectionFiles -contains $sectionNameWithoutPath

    # Check if used in templates (directly or indirectly)
    $isDirectlyUsed = $directlyUsedSections[$sectionNameWithoutExtension]
    $isIndirectlyUsed = $indirectlyUsedSections[$sectionNameWithoutExtension]
    $templateUsage = $sectionTemplateUsage[$sectionNameWithoutExtension]
    $includedUsage = $sectionInclusionUsage[$sectionNameWithoutExtension]

    # Check if likely deprecated
    $deprecationStatus = Is-LikelyDeprecated -sectionPath $sectionFile -sectionName $sectionNameWithoutExtension

    # Determine overall status - a section is truly used only if it's referenced in templates or included by used sections
    $isReallyUsed = $isDirectlyUsed -or $isIndirectlyUsed

    # Add to analysis
    $sectionAnalysis += [PSCustomObject]@{
        Name = $sectionNameWithoutExtension
        Path = $sectionFile
        IsInBuild = $isInBuild
        IsDirectlyUsedInTemplates = $isDirectlyUsed
        IsIncludedByUsedSections = $isIndirectlyUsed
        TemplateUsageCount = $templateUsage.UsageCount
        IncludedByCount = $includedUsage.IncludeCount
        IsLikelyDeprecated = $deprecationStatus.IsDeprecated
        DeprecationReason = $deprecationStatus.Reason
        IsActuallyUsed = $isReallyUsed
    }

    # Add to unused sections if not really used
    if (-not $isReallyUsed) {
        $unusedSections += @{
            Path = $sectionFile
            Name = $sectionNameWithoutExtension
            IsInBuild = $isInBuild
            IsLikelyDeprecated = $deprecationStatus.IsDeprecated
            DeprecationReason = $deprecationStatus.Reason
            TemplateUsageInfo = $templateUsage
            IncludedUsageInfo = $includedUsage
        }

        # Add to "truly unused" sections if not deprecated and present in build
        if (-not $deprecationStatus.IsDeprecated -and $isInBuild) {
            $trulyUnusedSections += @{
                Path = $sectionFile
                Name = $sectionNameWithoutExtension
                IsInBuild = $isInBuild
            }
        }
    }
}

# Also check for sections in build that are not in source (these might be manually created or generated)
$buildOnlySections = @()
foreach ($buildSection in $allBuildSectionFiles) {
    $foundInSource = $false
    foreach ($sourceSection in $allSourceSectionFiles) {
        if ($sourceSection.EndsWith("/$buildSection")) {
            $foundInSource = $true
            break
        }
    }

    if (-not $foundInSource) {
        $buildOnlySections += $buildSection
    }
}

# Export detailed analysis to CSV
$sectionAnalysis | Export-Csv -Path $detailedAnalysisPath -NoTypeInformation
Write-Host "Detailed analysis exported to: $detailedAnalysisPath" -ForegroundColor Green

# Generate report - only for truly unused sections (not deprecated)
Write-Host "Generating report of unused sections..." -ForegroundColor Yellow

$reportContent = "# Unused Sections Not Included in Templates`n"
$reportContent += "Generated on $(Get-Date)`n`n"
$reportContent += "## Summary`n"
$reportContent += "* Total source section files: $($allSourceSectionFiles.Count)`n"
$reportContent += "* Total build section files: $($allBuildSectionFiles.Count)`n"
$reportContent += "* Total template files analyzed: $($allTemplateFiles.Count)`n"
$reportContent += "* Truly unused section files: $($trulyUnusedSections.Count)`n`n"

if ($trulyUnusedSections.Count -gt 0) {
    $reportContent += "## Unused Sections`n"
    $reportContent += "These sections are present in both source and build, but not used in any templates or included by other used sections.`n`n"

    foreach ($section in $trulyUnusedSections) {
        $reportContent += "### $($section.Name)`n"
        $reportContent += "* Path: $($section.Path)`n`n"
    }
}

# Save report
$reportContent | Out-File -FilePath $outputReportPath -Encoding utf8

Write-Host "Report generated successfully at: $outputReportPath" -ForegroundColor Green
Write-Host "Found $($trulyUnusedSections.Count) truly unused sections (not deprecated but not used in templates)." -ForegroundColor Cyan

# Display preview of results
if ($trulyUnusedSections.Count -gt 0) {
    Write-Host "`nUnused sections not included in templates:" -ForegroundColor Yellow
    $trulyUnusedSections | ForEach-Object {
        Write-Host "- $($_.Name) ($($_.Path))" -ForegroundColor Gray
    }
}