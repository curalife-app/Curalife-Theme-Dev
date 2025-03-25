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
  --collect.settings.chromeFlags="$CHROME_FLAGS" \
  --collect.settings.formFactor=desktop \
  --collect.settings.throttling.cpuSlowdownMultiplier=2 \
  --collect.settings.screenEmulation.disabled=false \
  --collect.settings.emulatedUserAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  --collect.settings.onlyCategories="performance,accessibility,best-practices,seo,pwa" \
  --collect.settings.skipAudits="" \
  --collect.settings.output="html,json" \
  --collect.settings.disableStorageReset=false \
  --collect.settings.maxWaitForLoad=60000 \
  --upload.target=filesystem \
  --upload.outputDir=./$RESULTS_DIR

# Run mobile Lighthouse test
echo "Running mobile tests..."
npx lhci autorun \
  --collect.url=$URL \
  --collect.numberOfRuns=1 \
  --collect.settings.preset=mobile \
  --collect.settings.chromeFlags="$CHROME_FLAGS" \
  --collect.settings.formFactor=mobile \
  --collect.settings.screenEmulation.disabled=false \
  --collect.settings.emulatedUserAgent="Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" \
  --collect.settings.onlyCategories="performance,accessibility,best-practices,seo,pwa" \
  --collect.settings.skipAudits="" \
  --collect.settings.output="html,json" \
  --collect.settings.disableStorageReset=false \
  --collect.settings.maxWaitForLoad=60000 \
  --upload.target=filesystem \
  --upload.outputDir=./$RESULTS_DIR/mobile

# Capture additional data for enhanced insights
echo "Capturing screenshots..."
mkdir -p ./$RESULTS_DIR/screenshots
mkdir -p ./$RESULTS_DIR/mobile/screenshots

# Capture page screenshots for desktop
puppeteer-screenshot-cli --url $URL --output ./$RESULTS_DIR/screenshots/full-page.png --full-page
puppeteer-screenshot-cli --url $URL --output ./$RESULTS_DIR/screenshots/above-fold.png --width 1200 --height 800

# Capture page screenshots for mobile
puppeteer-screenshot-cli --url $URL --output ./$RESULTS_DIR/mobile/screenshots/full-page.png --full-page --device "Pixel 5"
puppeteer-screenshot-cli --url $URL --output ./$RESULTS_DIR/mobile/screenshots/above-fold.png --device "Pixel 5"

echo "Lighthouse tests completed for $PAGE_NAME"