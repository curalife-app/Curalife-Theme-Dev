# Master script to find all unused files in the Shopify theme
# This script runs all individual unused file scripts and creates a comprehensive report

Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║               CURALIFE COMPREHENSIVE UNUSED FILES FINDER         ║" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$masterReportPath = "..\comprehensive-unused-files-report_$timestamp.txt"

# Initialize results tracking
$results = @{
    Sections = @{
        TotalAnalyzed = 0
        Unused = 0
        UnusedFiles = @()
    }
    Snippets = @{
        TotalAnalyzed = 0
        Unused = 0
        UnusedFiles = @()
    }
    Assets = @{
        TotalAnalyzed = 0
        Unused = 0
        UnusedFiles = @()
        SizeMB = 0
    }
    OrphanedBuildFiles = @{
        Count = 0
        Files = @()
    }
    Errors = @()
}

Write-Host "🔍 Starting comprehensive analysis..." -ForegroundColor Green
Write-Host ""

# 1. Run sections analysis
Write-Host "📑 ANALYZING SECTIONS..." -ForegroundColor Yellow
Write-Host "═══════════════════════" -ForegroundColor Yellow
try {
    if (Test-Path ".\find-unused-sections.ps1") {
        & .\find-unused-sections.ps1

        # Parse results
        if (Test-Path "..\unused-sections-report.txt") {
            $sectionsContent = Get-Content "..\unused-sections-report.txt" -Raw
            if ($sectionsContent -match "Total source section files: (\d+)") {
                $results.Sections.TotalAnalyzed = [int]$matches[1]
            }
            if ($sectionsContent -match "Truly unused section files: (\d+)") {
                $results.Sections.Unused = [int]$matches[1]
            }

            # Extract unused section names
            if ($sectionsContent -match "## Unused Sections.*?These sections.*?\n\n(.*?)$" -and $results.Sections.Unused -gt 0) {
                $unusedSectionsText = $matches[1]
                $results.Sections.UnusedFiles = ($unusedSectionsText | Select-String "### (.*)" -AllMatches).Matches | ForEach-Object { $_.Groups[1].Value }
            }
        }
        Write-Host "✅ Sections analysis completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  find-unused-sections.ps1 not found" -ForegroundColor Yellow
    }
} catch {
    $results.Errors += "Sections analysis failed: $_"
    Write-Host "❌ Sections analysis failed: $_" -ForegroundColor Red
}

Write-Host ""

# 2. Run snippets analysis
Write-Host "📄 ANALYZING SNIPPETS..." -ForegroundColor Yellow
Write-Host "═══════════════════════" -ForegroundColor Yellow
try {
    if (Test-Path ".\find-unused-snippets.ps1") {
        & .\find-unused-snippets.ps1

        # Parse results
        if (Test-Path "..\unused-snippets-report.txt") {
            $snippetsContent = Get-Content "..\unused-snippets-report.txt" -Raw
            if ($snippetsContent -match "Total source snippet files: (\d+)") {
                $results.Snippets.TotalAnalyzed = [int]$matches[1]
            }
            if ($snippetsContent -match "Truly unused snippet files: (\d+)") {
                $results.Snippets.Unused = [int]$matches[1]
            }

            # Extract unused snippet names
            if ($snippetsContent -match "## Unused Snippets.*?\n\n(.*?)(?=##|$)" -and $results.Snippets.Unused -gt 0) {
                $unusedSnippetsText = $matches[1]
                $results.Snippets.UnusedFiles = ($unusedSnippetsText | Select-String "### (.*)" -AllMatches).Matches | ForEach-Object { $_.Groups[1].Value }
            }
        }
        Write-Host "✅ Snippets analysis completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  find-unused-snippets.ps1 not found" -ForegroundColor Yellow
    }
} catch {
    $results.Errors += "Snippets analysis failed: $_"
    Write-Host "❌ Snippets analysis failed: $_" -ForegroundColor Red
}

Write-Host ""

# 3. Run enhanced assets analysis
Write-Host "🖼️  ANALYZING ASSETS..." -ForegroundColor Yellow
Write-Host "═══════════════════════" -ForegroundColor Yellow
try {
    if (Test-Path ".\find-unused-assets-enhanced.ps1") {
        & .\find-unused-assets-enhanced.ps1

        # Parse results
        if (Test-Path "..\unused-assets-enhanced-report.txt") {
            $assetsContent = Get-Content "..\unused-assets-enhanced-report.txt" -Raw
            if ($assetsContent -match "Total asset files checked: (\d+)") {
                $results.Assets.TotalAnalyzed = [int]$matches[1]
            }
            if ($assetsContent -match "Total potentially unused files: (\d+)") {
                $results.Assets.Unused = [int]$matches[1]
            }
            if ($assetsContent -match "Total size of unused assets: ([0-9.]+) MB") {
                $results.Assets.SizeMB = [float]$matches[1]
            }

            # Extract unused asset names
            if ($assetsContent -match "POTENTIALLY UNUSED ASSETS:\s*-+\s*(.*?)\s*BREAKDOWN" -and $results.Assets.Unused -gt 0) {
                $unusedAssetsText = $matches[1].Trim()
                $results.Assets.UnusedFiles = $unusedAssetsText -split "`r?`n" | Where-Object { $_ -ne "" }
            }
        }
        Write-Host "✅ Assets analysis completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  find-unused-assets-enhanced.ps1 not found" -ForegroundColor Yellow
    }
} catch {
    $results.Errors += "Assets analysis failed: $_"
    Write-Host "❌ Assets analysis failed: $_" -ForegroundColor Red
}

Write-Host ""

# 4. Run orphaned build files analysis
Write-Host "👻 ANALYZING ORPHANED BUILD FILES..." -ForegroundColor Yellow
Write-Host "══════════════════════════════════" -ForegroundColor Yellow
try {
    if (Test-Path ".\find-orphaned-build-files.ps1") {
        # Run without user interaction by capturing output
        $orphanedOutput = & .\find-orphaned-build-files.ps1 2>&1

        # Parse results from orphaned-build-files.txt if it exists
        if (Test-Path ".\orphaned-build-files.txt") {
            $orphanedFiles = Get-Content ".\orphaned-build-files.txt" | Where-Object { $_ -ne "" }
            $results.OrphanedBuildFiles.Count = $orphanedFiles.Count
            $results.OrphanedBuildFiles.Files = $orphanedFiles
        }
        Write-Host "✅ Orphaned build files analysis completed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  find-orphaned-build-files.ps1 not found" -ForegroundColor Yellow
    }
} catch {
    $results.Errors += "Orphaned build files analysis failed: $_"
    Write-Host "❌ Orphaned build files analysis failed: $_" -ForegroundColor Red
}

Write-Host ""

# Generate comprehensive report
Write-Host "📊 GENERATING COMPREHENSIVE REPORT..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════" -ForegroundColor Yellow

$totalUnusedCount = $results.Sections.Unused + $results.Snippets.Unused + $results.Assets.Unused + $results.OrphanedBuildFiles.Count

$masterReport = @"
CURALIFE COMPREHENSIVE UNUSED FILES REPORT
==========================================
Generated: $(Get-Date)
Analysis Timestamp: $timestamp

EXECUTIVE SUMMARY
================
Total unused files found: $totalUnusedCount
- Unused sections: $($results.Sections.Unused)
- Unused snippets: $($results.Snippets.Unused)
- Unused assets: $($results.Assets.Unused) ($($results.Assets.SizeMB) MB)
- Orphaned build files: $($results.OrphanedBuildFiles.Count)

DETAILED BREAKDOWN
=================

SECTIONS ANALYSIS
-----------------
• Total sections analyzed: $($results.Sections.TotalAnalyzed)
• Unused sections: $($results.Sections.Unused)
"@

if ($results.Sections.UnusedFiles.Count -gt 0) {
    $masterReport += "`n• Unused section files:`n"
    foreach ($file in $results.Sections.UnusedFiles) {
        $masterReport += "  - $file`n"
    }
}

$masterReport += @"

SNIPPETS ANALYSIS
-----------------
• Total snippets analyzed: $($results.Snippets.TotalAnalyzed)
• Unused snippets: $($results.Snippets.Unused)
"@

if ($results.Snippets.UnusedFiles.Count -gt 0) {
    $masterReport += "`n• Unused snippet files:`n"
    foreach ($file in $results.Snippets.UnusedFiles) {
        $masterReport += "  - $file`n"
    }
}

$masterReport += @"

ASSETS ANALYSIS
---------------
• Total assets analyzed: $($results.Assets.TotalAnalyzed)
• Unused assets: $($results.Assets.Unused)
• Space savings potential: $($results.Assets.SizeMB) MB
"@

if ($results.Assets.UnusedFiles.Count -gt 0) {
    $masterReport += "`n• Unused asset files (first 20):`n"
    $displayAssets = $results.Assets.UnusedFiles | Select-Object -First 20
    foreach ($file in $displayAssets) {
        $masterReport += "  - $file`n"
    }
    if ($results.Assets.UnusedFiles.Count -gt 20) {
        $masterReport += "  ... and $($results.Assets.UnusedFiles.Count - 20) more (see detailed report)`n"
    }
}

$masterReport += @"

ORPHANED BUILD FILES
--------------------
• Orphaned files in build: $($results.OrphanedBuildFiles.Count)
"@

if ($results.OrphanedBuildFiles.Files.Count -gt 0) {
    $masterReport += "`n• Orphaned files:`n"
    foreach ($file in $results.OrphanedBuildFiles.Files) {
        $masterReport += "  - $file`n"
    }
}

if ($results.Errors.Count -gt 0) {
    $masterReport += "`n`nERRORS ENCOUNTERED`n"
    $masterReport += "==================`n"
    foreach ($error in $results.Errors) {
        $masterReport += "• $error`n"
    }
}

$masterReport += @"

RECOMMENDATIONS
===============
1. Review unused sections and snippets - these can likely be safely removed
2. Verify unused assets by checking if they're referenced in external systems
3. Consider removing orphaned build files after verification
4. Total space savings: ~$($results.Assets.SizeMB) MB from assets alone

DETAILED REPORTS
================
For more detailed analysis, check these files:
• Sections: unused-sections-report.txt + section-usage-analysis.csv
• Snippets: unused-snippets-report.txt + snippet-usage-analysis.csv
• Assets: unused-assets-enhanced-report.txt + asset-usage-analysis.csv
• Orphaned files: orphaned-build-files.txt

NEXT STEPS
==========
1. Review each category of unused files
2. Use the backup scripts to safely remove confirmed unused files
3. Test thoroughly after cleanup
4. Monitor theme performance improvements

Generated by Curalife Theme Cleanup Tools
"@

# Save master report
$masterReport | Out-File -FilePath $masterReportPath -Encoding UTF8

# Display summary
Write-Host ""
Write-Host "🎉 ANALYSIS COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📈 SUMMARY:" -ForegroundColor Cyan
Write-Host "  Total unused files: " -NoNewline -ForegroundColor White
Write-Host "$totalUnusedCount" -ForegroundColor Red
Write-Host "  • Sections: " -NoNewline -ForegroundColor White
Write-Host "$($results.Sections.Unused)" -ForegroundColor Yellow
Write-Host "  • Snippets: " -NoNewline -ForegroundColor White
Write-Host "$($results.Snippets.Unused)" -ForegroundColor Yellow
Write-Host "  • Assets: " -NoNewline -ForegroundColor White
Write-Host "$($results.Assets.Unused) ($($results.Assets.SizeMB) MB)" -ForegroundColor Yellow
Write-Host "  • Orphaned: " -NoNewline -ForegroundColor White
Write-Host "$($results.OrphanedBuildFiles.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📄 Master report saved: " -NoNewline -ForegroundColor White
Write-Host "$masterReportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next: Review the master report and use backup scripts to clean up!" -ForegroundColor Green
Write-Host ""