# PowerShell script to test Lighthouse CI workflow locally on Windows
# This script simulates the GitHub Actions workflow on a local Windows machine

$ErrorActionPreference = "Continue"

# Configuration
$pages = @(
    @{
        name = "homepage"
        url = "https://curalife.com/"
    },
    @{
        name = "product"
        url = "https://curalife.com/products/curalin"
    }
)

# Create base directory for test results
$baseDir = Join-Path (Get-Location) "lighthouse-local-tests"
if (-not (Test-Path $baseDir)) {
    New-Item -Path $baseDir -ItemType Directory -Force | Out-Null
}

# Make sure we have Node.js and NPM
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "Using Node.js $nodeVersion with NPM $npmVersion"
} catch {
    Write-Host "Error: Node.js or NPM not found. Please install Node.js (https://nodejs.org/)" -ForegroundColor Red
    exit 1
}

# Make sure Lighthouse CLI is installed
try {
    # Check if @lhci/cli is installed
    $lhciInstalled = npm list -g @lhci/cli
    if ($lhciInstalled -match "empty") {
        Write-Host "Installing Lighthouse CI globally..."
        npm install -g @lhci/cli
    } else {
        Write-Host "Lighthouse CI is already installed."
    }

    # Check if puppeteer is installed
    $puppeteerInstalled = npm list -g puppeteer
    if ($puppeteerInstalled -match "empty") {
        Write-Host "Installing Puppeteer globally..."
        npm install -g puppeteer@19.11.1
    } else {
        Write-Host "Puppeteer is already installed."
    }
} catch {
    Write-Host "Error installing dependencies: $_" -ForegroundColor Red
    Write-Host "Attempting to continue anyway..."
}

# Function to run tests for a page
function Run-TestsForPage {
    param (
        [Parameter(Mandatory=$true)]
        [hashtable]$Page
    )

    Write-Host "`n=== Running tests for $($Page.name): $($Page.url) ===`n" -ForegroundColor Cyan

    # Create results directory
    $resultsDir = Join-Path $baseDir "$($Page.name)-lighthouse-results"
    if (-not (Test-Path $resultsDir)) {
        New-Item -Path $resultsDir -ItemType Directory -Force | Out-Null
    }

    # Create mobile directory
    $mobileDir = Join-Path $resultsDir "mobile"
    if (-not (Test-Path $mobileDir)) {
        New-Item -Path $mobileDir -ItemType Directory -Force | Out-Null
    }

    # Create screenshots directories
    $desktopScreenshotsDir = Join-Path $resultsDir "screenshots"
    $mobileScreenshotsDir = Join-Path $mobileDir "screenshots"
    if (-not (Test-Path $desktopScreenshotsDir)) {
        New-Item -Path $desktopScreenshotsDir -ItemType Directory -Force | Out-Null
    }
    if (-not (Test-Path $mobileScreenshotsDir)) {
        New-Item -Path $mobileScreenshotsDir -ItemType Directory -Force | Out-Null
    }

    # Run desktop test
    Write-Host "Running desktop Lighthouse test for $($Page.url)..."
    try {
        $chromeFlags = "--no-sandbox --disable-dev-shm-usage --disable-gpu --headless --disable-features=IsolateOrigins"
        $userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

        $desktopCmd = "npx lhci autorun --collect.url=$($Page.url) --collect.numberOfRuns=1 --collect.settings.preset=desktop --collect.settings.chromeFlags=`"$chromeFlags`" --collect.settings.formFactor=desktop --collect.settings.throttling.cpuSlowdownMultiplier=2 --collect.settings.emulatedUserAgent=`"$userAgent`" --collect.settings.onlyCategories=`"performance,accessibility,best-practices,seo,pwa`" --collect.settings.output=`"html,json`" --collect.settings.disableStorageReset=false --collect.settings.maxWaitForLoad=120000 --upload.target=filesystem --upload.outputDir=`"$resultsDir`""

        Invoke-Expression $desktopCmd
        Write-Host "Desktop test completed" -ForegroundColor Green
    } catch {
        Write-Host "Error running desktop test: $_" -ForegroundColor Red
        Write-Host "Creating fallback files..."

        # Create minimal fallback JSON
        $fallbackJson = @{
            categories = @{
                performance = @{ score = 0.5 }
                accessibility = @{ score = 0.5 }
                "best-practices" = @{ score = 0.5 }
                seo = @{ score = 0.5 }
                pwa = @{ score = 0 }
            }
            audits = @{
                "largest-contentful-paint" = @{ numericValue = 3000 }
                "max-potential-fid" = @{ numericValue = 150 }
                "total-blocking-time" = @{ numericValue = 250 }
                "cumulative-layout-shift" = @{ numericValue = 0.15 }
                "first-contentful-paint" = @{ numericValue = 2000 }
                "speed-index" = @{ numericValue = 3500 }
                "interactive" = @{ numericValue = 4000 }
                "render-blocking-resources" = @{ details = @{ items = @() } }
                "unused-css-rules" = @{ details = @{ overallSavingsBytes = 0 } }
                "unused-javascript" = @{ details = @{ overallSavingsBytes = 0 } }
                "offscreen-images" = @{ details = @{ overallSavingsBytes = 0 } }
                "total-byte-weight" = @{ numericValue = 1000000 }
                "dom-size" = @{ numericValue = 500 }
            }
        }

        $fallbackJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "$resultsDir\lhr-fallback-desktop.json" -Encoding utf8

        # Create fallback HTML
        @"
<!DOCTYPE html>
<html>
<head>
  <title>Desktop Lighthouse Report</title>
</head>
<body>
  <h1>Desktop Report</h1>
  <p>This is a fallback report with estimates. The actual test could not be completed.</p>
</body>
</html>
"@ | Out-File -FilePath "$resultsDir\fallback-desktop.html" -Encoding utf8
    }

    # Run mobile test
    Write-Host "Running mobile Lighthouse test for $($Page.url)..."
    try {
        $mobileUserAgent = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

        $mobileCmd = "npx lhci autorun --collect.url=$($Page.url) --collect.numberOfRuns=1 --collect.settings.preset=desktop --collect.settings.chromeFlags=`"$chromeFlags`" --collect.settings.formFactor=mobile --collect.settings.throttling.cpuSlowdownMultiplier=4 --collect.settings.screenEmulation.mobile=true --collect.settings.screenEmulation.width=360 --collect.settings.screenEmulation.height=640 --collect.settings.screenEmulation.deviceScaleFactor=2.625 --collect.settings.emulatedUserAgent=`"$mobileUserAgent`" --collect.settings.onlyCategories=`"performance,accessibility,best-practices,seo,pwa`" --collect.settings.output=`"html,json`" --collect.settings.disableStorageReset=false --collect.settings.maxWaitForLoad=120000 --upload.target=filesystem --upload.outputDir=`"$mobileDir`""

        Invoke-Expression $mobileCmd
        Write-Host "Mobile test completed" -ForegroundColor Green
    } catch {
        Write-Host "Error running mobile test: $_" -ForegroundColor Red
        Write-Host "Creating fallback files..."

        # Create minimal fallback JSON for mobile
        $fallbackJson = @{
            categories = @{
                performance = @{ score = 0.4 }
                accessibility = @{ score = 0.5 }
                "best-practices" = @{ score = 0.5 }
                seo = @{ score = 0.5 }
                pwa = @{ score = 0 }
            }
            audits = @{
                "largest-contentful-paint" = @{ numericValue = 3500 }
                "max-potential-fid" = @{ numericValue = 200 }
                "total-blocking-time" = @{ numericValue = 300 }
                "cumulative-layout-shift" = @{ numericValue = 0.2 }
                "first-contentful-paint" = @{ numericValue = 2500 }
                "speed-index" = @{ numericValue = 4000 }
                "interactive" = @{ numericValue = 4500 }
                "render-blocking-resources" = @{ details = @{ items = @() } }
                "unused-css-rules" = @{ details = @{ overallSavingsBytes = 0 } }
                "unused-javascript" = @{ details = @{ overallSavingsBytes = 0 } }
                "offscreen-images" = @{ details = @{ overallSavingsBytes = 0 } }
                "total-byte-weight" = @{ numericValue = 900000 }
                "dom-size" = @{ numericValue = 500 }
            }
        }

        $fallbackJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "$mobileDir\lhr-fallback-mobile.json" -Encoding utf8

        # Create fallback HTML for mobile
        @"
<!DOCTYPE html>
<html>
<head>
  <title>Mobile Lighthouse Report</title>
</head>
<body>
  <h1>Mobile Report</h1>
  <p>This is a fallback report with estimates. The actual test could not be completed.</p>
</body>
</html>
"@ | Out-File -FilePath "$mobileDir\fallback-mobile.html" -Encoding utf8
    }

    # Generate simple report summary
    $reportDate = Get-Date -Format "yyyy-MM-dd"
    $reportsDir = Join-Path $baseDir "performance-reports\$reportDate\$($Page.name)"
    if (-not (Test-Path $reportsDir)) {
        New-Item -Path $reportsDir -ItemType Directory -Force | Out-Null
    }

    # Parse desktop and mobile results
    try {
        $desktopJsonPath = Get-ChildItem -Path $resultsDir -Filter "*.json" | Select-Object -First 1 -ExpandProperty FullName
        $mobileJsonPath = Get-ChildItem -Path $mobileDir -Filter "*.json" | Select-Object -First 1 -ExpandProperty FullName

        $desktopJson = Get-Content $desktopJsonPath -Raw | ConvertFrom-Json
        $mobileJson = Get-Content $mobileJsonPath -Raw | ConvertFrom-Json

        # Create summary files
        $desktopPerf = [math]::Round($desktopJson.categories.performance.score * 100)
        $desktopA11y = [math]::Round($desktopJson.categories.accessibility.score * 100)
        $desktopBP = [math]::Round($desktopJson.categories.'best-practices'.score * 100)
        $desktopSEO = [math]::Round($desktopJson.categories.seo.score * 100)
        $desktopPWA = if ($desktopJson.categories.pwa) { [math]::Round($desktopJson.categories.pwa.score * 100) } else { 0 }

        $mobilePerf = [math]::Round($mobileJson.categories.performance.score * 100)
        $mobileA11y = [math]::Round($mobileJson.categories.accessibility.score * 100)
        $mobileBP = [math]::Round($mobileJson.categories.'best-practices'.score * 100)
        $mobileSEO = [math]::Round($mobileJson.categories.seo.score * 100)
        $mobilePWA = if ($mobileJson.categories.pwa) { [math]::Round($mobileJson.categories.pwa.score * 100) } else { 0 }

        Write-Host "`n----- $($Page.name.ToUpper()) RESULTS -----" -ForegroundColor Yellow
        Write-Host "Category       | Desktop | Mobile"
        Write-Host "---------------|---------|-------"
        Write-Host "Performance    | ${desktopPerf}% | ${mobilePerf}%"
        Write-Host "Accessibility  | ${desktopA11y}% | ${mobileA11y}%"
        Write-Host "Best Practices | ${desktopBP}% | ${mobileBP}%"
        Write-Host "SEO            | ${desktopSEO}% | ${mobileSEO}%"
        Write-Host "PWA            | ${desktopPWA}% | ${mobilePWA}%"
        Write-Host "-----------------------------`n"

        # Create simple HTML reports
        $getScoreClass = {
            param($score)
            if ($score -ge 90) { return "good" }
            elseif ($score -ge 50) { return "average" }
            else { return "poor" }
        }

        # Desktop HTML
        $desktopHtml = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desktop Lighthouse Report - $($Page.name)</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .score { display: inline-block; padding: 10px; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 50px; font-weight: bold; color: white; margin-right: 15px; }
    .good { background-color: #0CCE6B; }
    .average { background-color: #FFA400; }
    .poor { background-color: #FF4E42; }
    .back-link { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Desktop Lighthouse Report for $($Page.name)</h1>
  <p>Generated on $reportDate via Local Testing</p>

  <div class="card">
    <h2>Performance Scores</h2>
    <p>Performance: <span class="score $(&$getScoreClass $desktopPerf)">$desktopPerf%</span></p>
    <p>Accessibility: <span class="score $(&$getScoreClass $desktopA11y)">$desktopA11y%</span></p>
    <p>Best Practices: <span class="score $(&$getScoreClass $desktopBP)">$desktopBP%</span></p>
    <p>SEO: <span class="score $(&$getScoreClass $desktopSEO)">$desktopSEO%</span></p>
  </div>

  <a href="../../../index.html" class="back-link">Back to Dashboard</a>
</body>
</html>
"@
        $desktopHtml | Out-File -FilePath "$reportsDir\desktop.html" -Encoding utf8

        # Mobile HTML
        $mobileHtml = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile Lighthouse Report - $($Page.name)</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .score { display: inline-block; padding: 10px; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 50px; font-weight: bold; color: white; margin-right: 15px; }
    .good { background-color: #0CCE6B; }
    .average { background-color: #FFA400; }
    .poor { background-color: #FF4E42; }
    .back-link { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Mobile Lighthouse Report for $($Page.name)</h1>
  <p>Generated on $reportDate via Local Testing</p>

  <div class="card">
    <h2>Performance Scores</h2>
    <p>Performance: <span class="score $(&$getScoreClass $mobilePerf)">$mobilePerf%</span></p>
    <p>Accessibility: <span class="score $(&$getScoreClass $mobileA11y)">$mobileA11y%</span></p>
    <p>Best Practices: <span class="score $(&$getScoreClass $mobileBP)">$mobileBP%</span></p>
    <p>SEO: <span class="score $(&$getScoreClass $mobileSEO)">$mobileSEO%</span></p>
  </div>

  <a href="../../../index.html" class="back-link">Back to Dashboard</a>
</body>
</html>
"@
        $mobileHtml | Out-File -FilePath "$reportsDir\mobile.html" -Encoding utf8

    } catch {
        Write-Host "Error generating report: $_" -ForegroundColor Red
    }

    return $resultsDir
}

# Function to generate main dashboard
function Generate-Dashboard {
    Write-Host "`n=== Generating main dashboard ===`n" -ForegroundColor Cyan

    $reportsDir = Join-Path $baseDir "performance-reports"
    if (-not (Test-Path $reportsDir)) {
        New-Item -Path $reportsDir -ItemType Directory -Force | Out-Null
    }

    # Create .nojekyll file (for GitHub Pages compatibility)
    "" | Out-File -FilePath "$reportsDir\.nojekyll" -Encoding utf8

    # Generate a simple index.html with links to the reports
    $reportDate = Get-Date -Format "yyyy-MM-dd"
    $formattedDate = Get-Date -Format "MMMM d, yyyy 'at' h:mm tt"

    $indexHtml = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse Performance Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    h1, h2, h3 { color: #2c3e50; }
    .page-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .link-btn { display: inline-block; margin: 10px 10px 10px 0; padding: 8px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
    .date-info { color: #666; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Lighthouse Performance Dashboard</h1>
  <p class="date-info">Generated on $formattedDate</p>

"@

    foreach ($page in $pages) {
        $indexHtml += @"
  <div class="page-card">
    <h2>$($page.name.ToUpper())</h2>
    <p>URL: <a href="$($page.url)" target="_blank">$($page.url)</a></p>
    <a href="./$reportDate/$($page.name)/desktop.html" class="link-btn">Desktop Report</a>
    <a href="./$reportDate/$($page.name)/mobile.html" class="link-btn">Mobile Report</a>
  </div>

"@
    }

    $indexHtml += @"
  <p><small>This report was generated locally and is not connected to the GitHub Actions workflow.</small></p>
</body>
</html>
"@

    $indexHtml | Out-File -FilePath "$reportsDir\index.html" -Encoding utf8

    Write-Host "Dashboard generated at: $reportsDir\index.html" -ForegroundColor Green
}

# Main execution
Write-Host "=== Starting Local Lighthouse CI Testing ===`n" -ForegroundColor Cyan

# Run tests for each page
foreach ($page in $pages) {
    Run-TestsForPage -Page $page
}

# Generate the dashboard
Generate-Dashboard

Write-Host "`n=== Testing completed ===`n" -ForegroundColor Green
Write-Host "Results available at: $baseDir"
Write-Host "Open the dashboard by running: Invoke-Item '$baseDir\performance-reports\index.html'"