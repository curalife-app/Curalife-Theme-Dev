# Debug Watch System for Curalife Theme
# This script helps debug file watching issues

Write-Host "🔍 Debugging Curalife Watch System" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to check file timestamps
function Check-RecentFileChanges {
    Write-Host "`n📁 Recent file changes in src/ directory:" -ForegroundColor Yellow

    $srcPath = "src"
    if (Test-Path $srcPath) {
        $recentFiles = Get-ChildItem -Path $srcPath -Recurse -File |
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 10

        if ($recentFiles.Count -gt 0) {
            foreach ($file in $recentFiles) {
                $relativePath = Resolve-Path -Relative $file.FullName
                $timeAgo = (Get-Date) - $file.LastWriteTime
                Write-Host "  📄 $relativePath ($([Math]::Round($timeAgo.TotalSeconds, 1)) seconds ago)" -ForegroundColor Green
            }
        } else {
            Write-Host "  ❌ No recent file changes found" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ src/ directory not found" -ForegroundColor Red
    }
}

# Function to check watch patterns
function Check-WatchPatterns {
    Write-Host "`n👀 Watch pattern analysis:" -ForegroundColor Yellow

    # Check config files that might affect watching
    $configFiles = @(
        "vite.config.js",
        "package.json",
        "build-scripts/config.js"
    )

    foreach ($configFile in $configFiles) {
        if (Test-Path $configFile) {
            Write-Host "  ✅ Found: $configFile" -ForegroundColor Green

            # Look for watch-related configurations
            $content = Get-Content $configFile -Raw
            if ($content -match "watch|glob|ignore|pattern") {
                Write-Host "    📋 Contains watch configuration" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ❌ Missing: $configFile" -ForegroundColor Red
        }
    }
}

# Function to test file operations
function Test-FileOperations {
    Write-Host "`n🧪 Testing file operations:" -ForegroundColor Yellow

    $testFile = "src/test-watch-debug.tmp"

    try {
        # Create test file
        "Test file created at $(Get-Date)" | Out-File -FilePath $testFile -Encoding UTF8
        Write-Host "  ✅ Created test file: $testFile" -ForegroundColor Green

        Start-Sleep -Seconds 1

        # Modify test file
        "Test file modified at $(Get-Date)" | Out-File -FilePath $testFile -Append -Encoding UTF8
        Write-Host "  ✅ Modified test file: $testFile" -ForegroundColor Green

        Start-Sleep -Seconds 1

        # Clean up
        Remove-Item $testFile -ErrorAction SilentlyContinue
        Write-Host "  🧹 Cleaned up test file" -ForegroundColor Green

    } catch {
        Write-Host "  ❌ File operation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to check running watch processes
function Check-WatchProcesses {
    Write-Host "`n🔄 Checking for running watch processes:" -ForegroundColor Yellow

    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            try {
                $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
                if ($commandLine -match "watch|tui|curalife") {
                    Write-Host "  🟢 Watch process found: PID $($process.Id)" -ForegroundColor Green
                    Write-Host "    Command: $($commandLine.Substring(0, [Math]::Min(80, $commandLine.Length)))" -ForegroundColor Cyan
                }
            } catch {
                # Ignore permission errors
            }
        }
    } else {
        Write-Host "  ❌ No Node.js processes found" -ForegroundColor Red
    }
}

# Function to check build cache
function Check-BuildCache {
    Write-Host "`n💾 Checking build cache:" -ForegroundColor Yellow

    $cacheFile = "build-scripts/cache/.build-cache.json"

    if (Test-Path $cacheFile) {
        try {
            $cacheData = Get-Content $cacheFile | ConvertFrom-Json
            $fileCount = ($cacheData.files | Get-Member -MemberType NoteProperty).Count
            Write-Host "  ✅ Cache file found with $fileCount cached files" -ForegroundColor Green

            # Show some recent cache entries
            if ($cacheData.files) {
                Write-Host "  📋 Recent cache entries:" -ForegroundColor Cyan
                $cacheData.files.PSObject.Properties | Select-Object -First 5 | ForEach-Object {
                    Write-Host "    - $($_.Name)" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "  ⚠️ Cache file exists but could not be parsed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ No cache file found at $cacheFile" -ForegroundColor Red
    }
}

# Function to analyze watch debouncing
function Analyze-WatchDebouncing {
    Write-Host "`n⏱️ Analyzing watch debouncing:" -ForegroundColor Yellow

    $configFile = "build-scripts/config.js"
    if (Test-Path $configFile) {
        $content = Get-Content $configFile -Raw

        # Look for debounce settings
        if ($content -match "debounce.*:.*(\d+)") {
            Write-Host "  📊 Found debounce configuration in config.js" -ForegroundColor Green
        }

        # Look for watch settings
        if ($content -match "watch.*{") {
            Write-Host "  ⚙️ Found watch configuration section" -ForegroundColor Green
        }
    }
}

# Main execution
Write-Host "`n🚀 Starting debug analysis..." -ForegroundColor Green

Check-RecentFileChanges
Check-WatchPatterns
Check-WatchProcesses
Check-BuildCache
Analyze-WatchDebouncing
Test-FileOperations

Write-Host "`n📝 Debug Summary:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "1. If you see recent file changes but only 1 change detected:"
Write-Host "   → Check debounce settings in build-scripts/config.js"
Write-Host "   → Files changed quickly might be grouped together"
Write-Host ""
Write-Host "2. If no recent changes show but you know you changed files:"
Write-Host "   → Check if files are in ignored patterns"
Write-Host "   → Verify file permissions and disk space"
Write-Host ""
Write-Host "3. To get detailed watch logs, run:"
Write-Host "   npm run watch:tui > watch-debug.log 2>&1"
Write-Host ""
Write-Host "✅ Debug analysis complete!" -ForegroundColor Green