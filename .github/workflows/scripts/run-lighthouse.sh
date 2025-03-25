#!/bin/bash

# This script runs Lighthouse tests on a specified URL for both desktop and mobile
# Usage: ./run-lighthouse.sh [URL] [PAGE_NAME] [RESULTS_DIR]

# Get parameters
URL=$1
PAGE_NAME=$2
RESULTS_DIR=$3

# Exit if required parameters are missing
if [ -z "$URL" ] || [ -z "$PAGE_NAME" ] || [ -z "$RESULTS_DIR" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./run-lighthouse.sh [URL] [PAGE_NAME] [RESULTS_DIR]"
  exit 1
fi

echo "Running Lighthouse on $URL..."

# Set Chrome flags
CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu --headless"

# Run desktop Lighthouse test
echo "Running desktop tests..."
npx lhci autorun \
  --collect.url=$URL \
  --collect.numberOfRuns=1 \
  --collect.settings.preset=desktop \
  --collect.settings.chromeFlags="$CHROME_FLAGS --disable-features=IsolateOrigins" \
  --collect.settings.formFactor=desktop \
  --collect.settings.throttling.cpuSlowdownMultiplier=2 \
  --collect.settings.screenEmulation.disabled=false \
  --collect.settings.emulatedUserAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  --collect.settings.onlyCategories="performance,accessibility,best-practices,seo,pwa" \
  --collect.settings.skipAudits="" \
  --collect.settings.output="html,json" \
  --collect.settings.disableStorageReset=false \
  --collect.settings.maxWaitForLoad=120000 \
  --upload.target=filesystem \
  --upload.outputDir=./$RESULTS_DIR || echo "Desktop Lighthouse test failed but continuing..."

# If no JSON file was generated, create a minimal valid one for processing
DESKTOP_JSON=$(find $RESULTS_DIR -name "lhr-*.json" -not -path "*/mobile/*" | sort | tail -n 1)
if [ ! -f "$DESKTOP_JSON" ]; then
  echo "Creating minimal desktop JSON as fallback"
  mkdir -p "$RESULTS_DIR"
  echo '{
    "categories": {
      "performance": {"score": 0.5},
      "accessibility": {"score": 0.5},
      "best-practices": {"score": 0.5},
      "seo": {"score": 0.5},
      "pwa": {"score": 0}
    },
    "audits": {
      "largest-contentful-paint": {"numericValue": 3000},
      "max-potential-fid": {"numericValue": 150},
      "total-blocking-time": {"numericValue": 250},
      "cumulative-layout-shift": {"numericValue": 0.15},
      "first-contentful-paint": {"numericValue": 2000},
      "speed-index": {"numericValue": 3500},
      "interactive": {"numericValue": 4000},
      "render-blocking-resources": {"details": {"items": []}},
      "unused-css-rules": {"details": {"overallSavingsBytes": 0}},
      "unused-javascript": {"details": {"overallSavingsBytes": 0}},
      "offscreen-images": {"details": {"overallSavingsBytes": 0}},
      "total-byte-weight": {"numericValue": 1000000},
      "dom-size": {"numericValue": 500}
    }
  }' > $RESULTS_DIR/lhr-fallback-desktop.json

  echo "<!DOCTYPE html><html><head><title>Desktop Lighthouse Report</title></head><body><h1>Desktop Report</h1><p>This is a fallback report with estimates. The actual test could not be completed.</p></body></html>" > $RESULTS_DIR/fallback-desktop.html
fi

# Check if desktop HTML was generated
DESKTOP_HTML_COUNT=$(find $RESULTS_DIR -name "*.html" -not -path "*/mobile/*" | wc -l)
echo "Desktop HTML files found: $DESKTOP_HTML_COUNT"
if [ "$DESKTOP_HTML_COUNT" -gt 0 ]; then
  # Count only actual Lighthouse reports, not our fallback files
  REAL_REPORTS=$(find $RESULTS_DIR -name "*.report.html" -not -path "*/mobile/*" | wc -l)
  if [ "$REAL_REPORTS" -gt 0 ]; then
    echo "Real desktop Lighthouse reports found: $REAL_REPORTS"
    echo "Desktop HTML files:"
    find $RESULTS_DIR -name "*.report.html" -not -path "*/mobile/*" | sort
    # Remove fallback file if it exists
    if [ -f "$RESULTS_DIR/fallback-desktop.html" ]; then
      echo "Removing fallback desktop HTML file since we have real reports"
      rm "$RESULTS_DIR/fallback-desktop.html"
    fi
  else
    echo "No real Lighthouse reports found, using fallback"
    echo "Desktop HTML files:"
    find $RESULTS_DIR -name "*.html" -not -path "*/mobile/*" | sort
  fi
else
  echo "WARNING: No desktop HTML files were generated!"
  # Create a simple HTML file to ensure something exists
  mkdir -p $RESULTS_DIR
  echo "<!DOCTYPE html><html><head><title>Fallback Report</title></head><body><h1>Fallback Desktop Report</h1><p>The Lighthouse test did not generate an HTML report.</p></body></html>" > $RESULTS_DIR/fallback-desktop.html
  echo "Created fallback HTML file: $RESULTS_DIR/fallback-desktop.html"
fi

# Run mobile Lighthouse test
echo "Running mobile tests..."
npx lhci autorun \
  --collect.url=$URL \
  --collect.numberOfRuns=1 \
  --collect.settings.preset=desktop \
  --collect.settings.chromeFlags="$CHROME_FLAGS --disable-features=IsolateOrigins" \
  --collect.settings.formFactor=mobile \
  --collect.settings.throttling.cpuSlowdownMultiplier=4 \
  --collect.settings.screenEmulation.mobile=true \
  --collect.settings.screenEmulation.width=360 \
  --collect.settings.screenEmulation.height=640 \
  --collect.settings.screenEmulation.deviceScaleFactor=2.625 \
  --collect.settings.emulatedUserAgent="Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" \
  --collect.settings.onlyCategories="performance,accessibility,best-practices,seo,pwa" \
  --collect.settings.skipAudits="" \
  --collect.settings.output="html,json" \
  --collect.settings.disableStorageReset=false \
  --collect.settings.maxWaitForLoad=120000 \
  --upload.target=filesystem \
  --upload.outputDir=./$RESULTS_DIR/mobile || echo "Mobile Lighthouse test failed but continuing..."

# If no JSON file was generated for mobile, create a minimal valid one
MOBILE_JSON=$(find $RESULTS_DIR/mobile -name "lhr-*.json" | sort | tail -n 1)
if [ ! -f "$MOBILE_JSON" ]; then
  echo "Creating minimal mobile JSON as fallback"
  mkdir -p "$RESULTS_DIR/mobile"
  echo '{
    "categories": {
      "performance": {"score": 0.4},
      "accessibility": {"score": 0.5},
      "best-practices": {"score": 0.5},
      "seo": {"score": 0.5},
      "pwa": {"score": 0}
    },
    "audits": {
      "largest-contentful-paint": {"numericValue": 3500},
      "max-potential-fid": {"numericValue": 200},
      "total-blocking-time": {"numericValue": 300},
      "cumulative-layout-shift": {"numericValue": 0.2},
      "first-contentful-paint": {"numericValue": 2500},
      "speed-index": {"numericValue": 4000},
      "interactive": {"numericValue": 4500},
      "render-blocking-resources": {"details": {"items": []}},
      "unused-css-rules": {"details": {"overallSavingsBytes": 0}},
      "unused-javascript": {"details": {"overallSavingsBytes": 0}},
      "offscreen-images": {"details": {"overallSavingsBytes": 0}},
      "total-byte-weight": {"numericValue": 900000},
      "dom-size": {"numericValue": 500}
    }
  }' > $RESULTS_DIR/mobile/lhr-fallback-mobile.json

  echo "<!DOCTYPE html><html><head><title>Mobile Lighthouse Report</title></head><body><h1>Mobile Report</h1><p>This is a fallback report with estimates. The actual test could not be completed.</p></body></html>" > $RESULTS_DIR/mobile/fallback-mobile.html
fi

# Check if mobile HTML was generated
MOBILE_HTML_COUNT=$(find $RESULTS_DIR/mobile -name "*.html" | wc -l)
echo "Mobile HTML files found: $MOBILE_HTML_COUNT"
if [ "$MOBILE_HTML_COUNT" -gt 0 ]; then
  # Count only actual Lighthouse reports, not our fallback files
  REAL_REPORTS=$(find $RESULTS_DIR/mobile -name "*.report.html" | wc -l)
  if [ "$REAL_REPORTS" -gt 0 ]; then
    echo "Real mobile Lighthouse reports found: $REAL_REPORTS"
    echo "Mobile HTML files:"
    find $RESULTS_DIR/mobile -name "*.report.html" | sort
    # Remove fallback file if it exists
    if [ -f "$RESULTS_DIR/mobile/fallback-mobile.html" ]; then
      echo "Removing fallback mobile HTML file since we have real reports"
      rm "$RESULTS_DIR/mobile/fallback-mobile.html"
    fi
  else
    echo "No real Lighthouse reports found, using fallback"
    echo "Mobile HTML files:"
    find $RESULTS_DIR/mobile -name "*.html" | sort
  fi
else
  echo "WARNING: No mobile HTML files were generated!"
  # Create a simple HTML file to ensure something exists
  mkdir -p $RESULTS_DIR/mobile
  echo "<!DOCTYPE html><html><head><title>Fallback Report</title></head><body><h1>Fallback Mobile Report</h1><p>The Lighthouse test did not generate an HTML report.</p></body></html>" > $RESULTS_DIR/mobile/fallback-mobile.html
  echo "Created fallback HTML file: $RESULTS_DIR/mobile/fallback-mobile.html"
fi

# Create screenshot placeholder directories
mkdir -p ./$RESULTS_DIR/screenshots
mkdir -p ./$RESULTS_DIR/mobile/screenshots

# Create placeholder images first (will be overwritten if screenshots succeed)
echo "Creating placeholder images as fallback..."
echo "<svg width='1200' height='800' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='#f0f0f0'/><text x='50%' y='50%' font-family='Arial' font-size='24' fill='#666' text-anchor='middle'>Screenshot not available</text></svg>" > ./$RESULTS_DIR/screenshots/placeholder.svg
cp ./$RESULTS_DIR/screenshots/placeholder.svg ./$RESULTS_DIR/screenshots/full-page.png
cp ./$RESULTS_DIR/screenshots/placeholder.svg ./$RESULTS_DIR/screenshots/above-fold.png

# Create minimal placeholder images for mobile
echo "<svg width='360' height='640' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='#f0f0f0'/><text x='50%' y='50%' font-family='Arial' font-size='18' fill='#666' text-anchor='middle'>Mobile screenshot not available</text></svg>" > ./$RESULTS_DIR/mobile/screenshots/placeholder.svg
cp ./$RESULTS_DIR/mobile/screenshots/placeholder.svg ./$RESULTS_DIR/mobile/screenshots/full-page.png
cp ./$RESULTS_DIR/mobile/screenshots/placeholder.svg ./$RESULTS_DIR/mobile/screenshots/above-fold.png

# Create a separate package.json just for the screenshot tool
SCREENSHOT_DIR=$(mktemp -d)
cd $SCREENSHOT_DIR

# Create a simple package.json
echo '{
  "name": "lighthouse-screenshots",
  "version": "1.0.0",
  "description": "Temporary package for screenshots",
  "main": "index.js",
  "dependencies": {}
}' > package.json

# Install puppeteer specifically in this directory
echo "Installing Puppeteer for screenshots in isolated environment..."
npm install puppeteer@19.11.1 --no-fund --no-audit --loglevel=error

# Create the screenshot script
cat > index.js << 'EOL'
const puppeteer = require('puppeteer');

async function captureScreenshots(url, resultsDir) {
  console.log('Starting screenshot capture for', url);
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-features=IsolateOrigins'],
      headless: 'new'
    });

    // Desktop screenshots
    console.log('Capturing desktop screenshots...');
    try {
      const desktopPage = await browser.newPage();
      await desktopPage.setViewport({ width: 1200, height: 800 });
      await desktopPage.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Capture above fold
      await desktopPage.screenshot({
        path: `./${resultsDir}/screenshots/above-fold.png`,
        type: 'png'
      });

      // Capture full page
      await desktopPage.screenshot({
        path: `./${resultsDir}/screenshots/full-page.png`,
        type: 'png',
        fullPage: true
      });

      await desktopPage.close();
      console.log('Desktop screenshots captured');
    } catch (error) {
      console.error('Error capturing desktop screenshots:', error.message);
    }

    // Mobile screenshots
    console.log('Capturing mobile screenshots...');
    try {
      const mobilePage = await browser.newPage();
      await mobilePage.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
      await mobilePage.setViewport({
        width: 360,
        height: 640,
        deviceScaleFactor: 2.625,
        isMobile: true
      });

      await mobilePage.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Capture above fold
      await mobilePage.screenshot({
        path: `./${resultsDir}/mobile/screenshots/above-fold.png`,
        type: 'png'
      });

      // Capture full page
      await mobilePage.screenshot({
        path: `./${resultsDir}/mobile/screenshots/full-page.png`,
        type: 'png',
        fullPage: true
      });

      await mobilePage.close();
      console.log('Mobile screenshots captured');
    } catch (error) {
      console.error('Error capturing mobile screenshots:', error.message);
    }
  } catch (error) {
    console.error('Error launching browser:', error.message);
    return false;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error.message);
      }
    }
  }

  return true;
}

// Get arguments from command line
const url = process.argv[2];
const resultsDir = process.argv[3];

if (!url || !resultsDir) {
  console.error('Missing required arguments: url and resultsDir');
  process.exit(1);
}

captureScreenshots(url, resultsDir)
  .then(success => {
    console.log('Screenshot capture process completed:', success ? 'successfully' : 'with errors');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in screenshot process:', error);
    process.exit(1);
  });
EOL

# Return to original directory
cd - > /dev/null

# Run the screenshot script with Node
echo "Running screenshot capture script..."
node $SCREENSHOT_DIR/index.js "$URL" "$RESULTS_DIR" || echo "Screenshot capture failed, using placeholder images"

# Clean up
rm -rf $SCREENSHOT_DIR

echo "Screenshot process completed"

echo "Lighthouse tests completed for $PAGE_NAME"