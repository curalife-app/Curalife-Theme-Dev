#!/bin/bash

# This script processes Lighthouse results and extracts key metrics
# Usage: ./process-results.sh [PAGE_NAME] [RESULTS_DIR] [CURRENT_DATE]

# Get parameters
PAGE_NAME=$1
RESULTS_DIR=$2
CURRENT_DATE=$3

# Exit if required parameters are missing
if [ -z "$PAGE_NAME" ] || [ -z "$RESULTS_DIR" ] || [ -z "$CURRENT_DATE" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./process-results.sh [PAGE_NAME] [RESULTS_DIR] [CURRENT_DATE]"
  exit 1
fi

# Check if results directory exists
if [ ! -d "$RESULTS_DIR" ]; then
  echo "Error: Results directory not found: $RESULTS_DIR"
  echo "has_results=false" >> $GITHUB_OUTPUT
  exit 0
fi

# Find the latest JSON reports
DESKTOP_REPORT=$(find $RESULTS_DIR -name "lhr-*.json" -not -path "*/mobile/*" | sort | tail -n 1)
MOBILE_REPORT=$(find $RESULTS_DIR/mobile -name "lhr-*.json" | sort | tail -n 1)

# Create directory for detailed metrics
DETAILED_DIR="performance-reports/$PAGE_NAME-details"
mkdir -p $DETAILED_DIR
DETAILED_FILE="$DETAILED_DIR/metrics-$CURRENT_DATE.json"

# Initialize detailed metrics file
echo "{" > $DETAILED_FILE
echo "  \"page\": \"$PAGE_NAME\"," >> $DETAILED_FILE
echo "  \"url\": \"$URL\"," >> $DETAILED_FILE
echo "  \"date\": \"$CURRENT_DATE\"," >> $DETAILED_FILE
echo "  \"timestamp\": \"$(date +"%Y-%m-%dT%H:%M:%S%z")\"," >> $DETAILED_FILE
echo "  \"desktop\": {}," >> $DETAILED_FILE
echo "  \"mobile\": {}" >> $DETAILED_FILE
echo "}" >> $DETAILED_FILE

# Process desktop results if available
if [ -f "$DESKTOP_REPORT" ]; then
  echo "Processing desktop report: $DESKTOP_REPORT"

  # Extract basic metrics
  DESKTOP_PERF=$(jq '.categories.performance.score * 100' $DESKTOP_REPORT)
  DESKTOP_ACC=$(jq '.categories.accessibility.score * 100' $DESKTOP_REPORT)
  DESKTOP_BP=$(jq '.categories["best-practices"].score * 100' $DESKTOP_REPORT)
  DESKTOP_SEO=$(jq '.categories.seo.score * 100' $DESKTOP_REPORT)
  DESKTOP_PWA=$(jq '.categories.pwa.score * 100' $DESKTOP_REPORT 2>/dev/null || echo "0")

  # Extract web vitals and additional metrics
  DESKTOP_LCP=$(jq '.audits["largest-contentful-paint"].numericValue' $DESKTOP_REPORT)
  DESKTOP_FID=$(jq '.audits["max-potential-fid"].numericValue' $DESKTOP_REPORT)
  DESKTOP_TBT=$(jq '.audits["total-blocking-time"].numericValue' $DESKTOP_REPORT)
  DESKTOP_CLS=$(jq '.audits["cumulative-layout-shift"].numericValue' $DESKTOP_REPORT)
  DESKTOP_FCP=$(jq '.audits["first-contentful-paint"].numericValue' $DESKTOP_REPORT)
  DESKTOP_SI=$(jq '.audits["speed-index"].numericValue' $DESKTOP_REPORT)
  DESKTOP_TTI=$(jq '.audits["interactive"].numericValue' $DESKTOP_REPORT)

  # Extract opportunities
  DESKTOP_RENDER_BLOCKING=$(jq '.audits["render-blocking-resources"].details.items | length' $DESKTOP_REPORT)
  DESKTOP_UNUSED_CSS=$(jq '.audits["unused-css-rules"].details.overallSavingsBytes // 0' $DESKTOP_REPORT)
  DESKTOP_UNUSED_JS=$(jq '.audits["unused-javascript"].details.overallSavingsBytes // 0' $DESKTOP_REPORT)
  DESKTOP_OFFSCREEN_IMAGES=$(jq '.audits["offscreen-images"].details.overallSavingsBytes // 0' $DESKTOP_REPORT)
  DESKTOP_TOTAL_BYTES=$(jq '.audits["total-byte-weight"].numericValue // 0' $DESKTOP_REPORT)
  DESKTOP_DOM_SIZE=$(jq '.audits["dom-size"].numericValue // 0' $DESKTOP_REPORT)

  # Output to GITHUB_OUTPUT for GitHub Actions
  echo "desktop_perf=${DESKTOP_PERF%.*}" >> $GITHUB_OUTPUT
  echo "desktop_a11y=${DESKTOP_ACC%.*}" >> $GITHUB_OUTPUT
  echo "desktop_bp=${DESKTOP_BP%.*}" >> $GITHUB_OUTPUT
  echo "desktop_seo=${DESKTOP_SEO%.*}" >> $GITHUB_OUTPUT
  echo "desktop_pwa=${DESKTOP_PWA%.*}" >> $GITHUB_OUTPUT
  echo "desktop_lcp=${DESKTOP_LCP%.*}" >> $GITHUB_OUTPUT
  echo "desktop_fid=${DESKTOP_FID%.*}" >> $GITHUB_OUTPUT
  echo "desktop_tbt=${DESKTOP_TBT%.*}" >> $GITHUB_OUTPUT
  echo "desktop_cls=${DESKTOP_CLS}" >> $GITHUB_OUTPUT
  echo "desktop_fcp=${DESKTOP_FCP%.*}" >> $GITHUB_OUTPUT
  echo "desktop_si=${DESKTOP_SI%.*}" >> $GITHUB_OUTPUT
  echo "desktop_tti=${DESKTOP_TTI%.*}" >> $GITHUB_OUTPUT
  echo "desktop_render_blocking=${DESKTOP_RENDER_BLOCKING}" >> $GITHUB_OUTPUT
  echo "desktop_unused_css=${DESKTOP_UNUSED_CSS}" >> $GITHUB_OUTPUT
  echo "desktop_unused_js=${DESKTOP_UNUSED_JS}" >> $GITHUB_OUTPUT
  echo "desktop_offscreen_images=${DESKTOP_OFFSCREEN_IMAGES}" >> $GITHUB_OUTPUT
  echo "desktop_total_bytes=${DESKTOP_TOTAL_BYTES}" >> $GITHUB_OUTPUT
  echo "desktop_dom_size=${DESKTOP_DOM_SIZE}" >> $GITHUB_OUTPUT

  # Update the detailed metrics file with desktop data
  TMP_FILE=$(mktemp)
  jq --arg perf "${DESKTOP_PERF%.*}" \
     --arg a11y "${DESKTOP_ACC%.*}" \
     --arg bp "${DESKTOP_BP%.*}" \
     --arg seo "${DESKTOP_SEO%.*}" \
     --arg pwa "${DESKTOP_PWA%.*}" \
     --arg lcp "${DESKTOP_LCP%.*}" \
     --arg fid "${DESKTOP_FID%.*}" \
     --arg tbt "${DESKTOP_TBT%.*}" \
     --arg cls "$DESKTOP_CLS" \
     --arg fcp "${DESKTOP_FCP%.*}" \
     --arg si "${DESKTOP_SI%.*}" \
     --arg tti "${DESKTOP_TTI%.*}" \
     --arg rb "$DESKTOP_RENDER_BLOCKING" \
     --arg ucss "$DESKTOP_UNUSED_CSS" \
     --arg ujs "$DESKTOP_UNUSED_JS" \
     --arg oi "$DESKTOP_OFFSCREEN_IMAGES" \
     --arg tb "$DESKTOP_TOTAL_BYTES" \
     --arg dom "$DESKTOP_DOM_SIZE" \
     '.desktop = {
        "performance": $perf | tonumber,
        "accessibility": $a11y | tonumber,
        "bestPractices": $bp | tonumber,
        "seo": $seo | tonumber,
        "pwa": $pwa | tonumber,
        "metrics": {
          "LCP": $lcp | tonumber,
          "FID": $fid | tonumber,
          "TBT": $tbt | tonumber,
          "CLS": $cls | tonumber,
          "FCP": $fcp | tonumber,
          "SI": $si | tonumber,
          "TTI": $tti | tonumber
        },
        "opportunities": {
          "renderBlockingResources": $rb | tonumber,
          "unusedCSSBytes": $ucss | tonumber,
          "unusedJSBytes": $ujs | tonumber,
          "offscreenImagesBytes": $oi | tonumber,
          "totalBytes": $tb | tonumber,
          "DOMSize": $dom | tonumber
        }
      }' $DETAILED_FILE > "$TMP_FILE"
  mv "$TMP_FILE" "$DETAILED_FILE"

  # Extract top slowest requests for insights
  jq -r '.audits["network-requests"].details.items | sort_by(.endTime - .startTime) | reverse | .[0:5] | map({url: .url, transferSize: .transferSize, duration: (.endTime - .startTime)})' $DESKTOP_REPORT > "$DETAILED_DIR/desktop-slowest-requests.json"
fi

# Process mobile results if available
if [ -f "$MOBILE_REPORT" ]; then
  echo "Processing mobile report: $MOBILE_REPORT"

  # Extract basic metrics
  MOBILE_PERF=$(jq '.categories.performance.score * 100' $MOBILE_REPORT)
  MOBILE_ACC=$(jq '.categories.accessibility.score * 100' $MOBILE_REPORT)
  MOBILE_BP=$(jq '.categories["best-practices"].score * 100' $MOBILE_REPORT)
  MOBILE_SEO=$(jq '.categories.seo.score * 100' $MOBILE_REPORT)
  MOBILE_PWA=$(jq '.categories.pwa.score * 100' $MOBILE_REPORT 2>/dev/null || echo "0")

  # Extract web vitals and additional metrics
  MOBILE_LCP=$(jq '.audits["largest-contentful-paint"].numericValue' $MOBILE_REPORT)
  MOBILE_FID=$(jq '.audits["max-potential-fid"].numericValue' $MOBILE_REPORT)
  MOBILE_TBT=$(jq '.audits["total-blocking-time"].numericValue' $MOBILE_REPORT)
  MOBILE_CLS=$(jq '.audits["cumulative-layout-shift"].numericValue' $MOBILE_REPORT)
  MOBILE_FCP=$(jq '.audits["first-contentful-paint"].numericValue' $MOBILE_REPORT)
  MOBILE_SI=$(jq '.audits["speed-index"].numericValue' $MOBILE_REPORT)
  MOBILE_TTI=$(jq '.audits["interactive"].numericValue' $MOBILE_REPORT)

  # Extract opportunities
  MOBILE_RENDER_BLOCKING=$(jq '.audits["render-blocking-resources"].details.items | length' $MOBILE_REPORT)
  MOBILE_UNUSED_CSS=$(jq '.audits["unused-css-rules"].details.overallSavingsBytes // 0' $MOBILE_REPORT)
  MOBILE_UNUSED_JS=$(jq '.audits["unused-javascript"].details.overallSavingsBytes // 0' $MOBILE_REPORT)
  MOBILE_OFFSCREEN_IMAGES=$(jq '.audits["offscreen-images"].details.overallSavingsBytes // 0' $MOBILE_REPORT)
  MOBILE_TOTAL_BYTES=$(jq '.audits["total-byte-weight"].numericValue // 0' $MOBILE_REPORT)
  MOBILE_DOM_SIZE=$(jq '.audits["dom-size"].numericValue // 0' $MOBILE_REPORT)

  # Output to GITHUB_OUTPUT for GitHub Actions
  echo "mobile_perf=${MOBILE_PERF%.*}" >> $GITHUB_OUTPUT
  echo "mobile_a11y=${MOBILE_ACC%.*}" >> $GITHUB_OUTPUT
  echo "mobile_bp=${MOBILE_BP%.*}" >> $GITHUB_OUTPUT
  echo "mobile_seo=${MOBILE_SEO%.*}" >> $GITHUB_OUTPUT
  echo "mobile_pwa=${MOBILE_PWA%.*}" >> $GITHUB_OUTPUT
  echo "mobile_lcp=${MOBILE_LCP%.*}" >> $GITHUB_OUTPUT
  echo "mobile_fid=${MOBILE_FID%.*}" >> $GITHUB_OUTPUT
  echo "mobile_tbt=${MOBILE_TBT%.*}" >> $GITHUB_OUTPUT
  echo "mobile_cls=${MOBILE_CLS}" >> $GITHUB_OUTPUT
  echo "mobile_fcp=${MOBILE_FCP%.*}" >> $GITHUB_OUTPUT
  echo "mobile_si=${MOBILE_SI%.*}" >> $GITHUB_OUTPUT
  echo "mobile_tti=${MOBILE_TTI%.*}" >> $GITHUB_OUTPUT
  echo "mobile_render_blocking=${MOBILE_RENDER_BLOCKING}" >> $GITHUB_OUTPUT
  echo "mobile_unused_css=${MOBILE_UNUSED_CSS}" >> $GITHUB_OUTPUT
  echo "mobile_unused_js=${MOBILE_UNUSED_JS}" >> $GITHUB_OUTPUT
  echo "mobile_offscreen_images=${MOBILE_OFFSCREEN_IMAGES}" >> $GITHUB_OUTPUT
  echo "mobile_total_bytes=${MOBILE_TOTAL_BYTES}" >> $GITHUB_OUTPUT
  echo "mobile_dom_size=${MOBILE_DOM_SIZE}" >> $GITHUB_OUTPUT

  # Update the detailed metrics file with mobile data
  TMP_FILE=$(mktemp)
  jq --arg perf "${MOBILE_PERF%.*}" \
     --arg a11y "${MOBILE_ACC%.*}" \
     --arg bp "${MOBILE_BP%.*}" \
     --arg seo "${MOBILE_SEO%.*}" \
     --arg pwa "${MOBILE_PWA%.*}" \
     --arg lcp "${MOBILE_LCP%.*}" \
     --arg fid "${MOBILE_FID%.*}" \
     --arg tbt "${MOBILE_TBT%.*}" \
     --arg cls "$MOBILE_CLS" \
     --arg fcp "${MOBILE_FCP%.*}" \
     --arg si "${MOBILE_SI%.*}" \
     --arg tti "${MOBILE_TTI%.*}" \
     --arg rb "$MOBILE_RENDER_BLOCKING" \
     --arg ucss "$MOBILE_UNUSED_CSS" \
     --arg ujs "$MOBILE_UNUSED_JS" \
     --arg oi "$MOBILE_OFFSCREEN_IMAGES" \
     --arg tb "$MOBILE_TOTAL_BYTES" \
     --arg dom "$MOBILE_DOM_SIZE" \
     '.mobile = {
        "performance": $perf | tonumber,
        "accessibility": $a11y | tonumber,
        "bestPractices": $bp | tonumber,
        "seo": $seo | tonumber,
        "pwa": $pwa | tonumber,
        "metrics": {
          "LCP": $lcp | tonumber,
          "FID": $fid | tonumber,
          "TBT": $tbt | tonumber,
          "CLS": $cls | tonumber,
          "FCP": $fcp | tonumber,
          "SI": $si | tonumber,
          "TTI": $tti | tonumber
        },
        "opportunities": {
          "renderBlockingResources": $rb | tonumber,
          "unusedCSSBytes": $ucss | tonumber,
          "unusedJSBytes": $ujs | tonumber,
          "offscreenImagesBytes": $oi | tonumber,
          "totalBytes": $tb | tonumber,
          "DOMSize": $dom | tonumber
        }
      }' $DETAILED_FILE > "$TMP_FILE"
  mv "$TMP_FILE" "$DETAILED_FILE"

  # Extract top slowest requests for insights
  jq -r '.audits["network-requests"].details.items | sort_by(.endTime - .startTime) | reverse | .[0:5] | map({url: .url, transferSize: .transferSize, duration: (.endTime - .startTime)})' $MOBILE_REPORT > "$DETAILED_DIR/mobile-slowest-requests.json"
fi

echo "has_results=true" >> $GITHUB_OUTPUT
echo "report_date=$CURRENT_DATE" >> $GITHUB_OUTPUT