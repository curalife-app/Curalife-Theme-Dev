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
echo "Looking for Lighthouse reports in: $RESULTS_DIR"
DESKTOP_REPORT=$(find $RESULTS_DIR -name "lhr-*.json" -not -path "*/mobile/*" | sort | tail -n 1)
MOBILE_REPORT=$(find $RESULTS_DIR/mobile -name "lhr-*.json" 2>/dev/null | sort | tail -n 1)

# Check if reports were found
DESKTOP_IS_PLACEHOLDER=false
MOBILE_IS_PLACEHOLDER=false

if [ -f "$DESKTOP_REPORT" ]; then
  echo "Found desktop report: $DESKTOP_REPORT"
  # Check if it's a fallback file
  if [[ "$DESKTOP_REPORT" == *"fallback"* ]]; then
    echo "WARNING: Using fallback desktop report"
    DESKTOP_IS_PLACEHOLDER=true
  fi
else
  echo "WARNING: No desktop Lighthouse report found. Checking fallback locations..."
  # Try alternate locations
  DESKTOP_REPORT=$(find $RESULTS_DIR -name "*desktop*.json" | sort | tail -n 1)
  if [ -f "$DESKTOP_REPORT" ]; then
    echo "Found desktop report using alternate pattern: $DESKTOP_REPORT"
    if [[ "$DESKTOP_REPORT" == *"fallback"* ]]; then
      echo "WARNING: Using fallback desktop report"
      DESKTOP_IS_PLACEHOLDER=true
    fi
  else
    echo "ERROR: No desktop Lighthouse report found. Dashboard will show placeholder values."
    DESKTOP_IS_PLACEHOLDER=true
  fi
fi

if [ -f "$MOBILE_REPORT" ]; then
  echo "Found mobile report: $MOBILE_REPORT"
  # Check if it's a fallback file
  if [[ "$MOBILE_REPORT" == *"fallback"* ]]; then
    echo "WARNING: Using fallback mobile report"
    MOBILE_IS_PLACEHOLDER=true
  fi
else
  echo "WARNING: No mobile Lighthouse report found. Checking fallback locations..."
  # Try alternate locations
  MOBILE_REPORT=$(find $RESULTS_DIR -name "*mobile*.json" | sort | tail -n 1)
  if [ -f "$MOBILE_REPORT" ]; then
    echo "Found mobile report using alternate pattern: $MOBILE_REPORT"
    if [[ "$MOBILE_REPORT" == *"fallback"* ]]; then
      echo "WARNING: Using fallback mobile report"
      MOBILE_IS_PLACEHOLDER=true
    fi
  else
    echo "ERROR: No mobile Lighthouse report found. Dashboard will show placeholder values for mobile."
    MOBILE_IS_PLACEHOLDER=true
  fi
fi

# Create directory for detailed metrics
DETAILED_DIR="performance-reports/$PAGE_NAME-details"
mkdir -p $DETAILED_DIR
DETAILED_FILE="$DETAILED_DIR/metrics-$CURRENT_DATE.json"

# Create directory for raw reports
RAW_DIR="$DETAILED_DIR/raw"
mkdir -p $RAW_DIR

# Initialize detailed metrics file
echo "{" > $DETAILED_FILE
echo "  \"page\": \"$PAGE_NAME\"," >> $DETAILED_FILE
echo "  \"url\": \"$URL\"," >> $DETAILED_FILE
echo "  \"date\": \"$CURRENT_DATE\"," >> $DETAILED_FILE
echo "  \"timestamp\": \"$(date +"%Y-%m-%dT%H:%M:%S%z")\"," >> $DETAILED_FILE
echo "  \"desktop\": {}," >> $DETAILED_FILE
echo "  \"mobile\": {}" >> $DETAILED_FILE
echo "}" >> $DETAILED_FILE

# Save raw report to access later if needed
if [ -f "$DESKTOP_REPORT" ]; then
  cp "$DESKTOP_REPORT" "$RAW_DIR/desktop-raw-$CURRENT_DATE.json"
fi

if [ -f "$MOBILE_REPORT" ]; then
  cp "$MOBILE_REPORT" "$RAW_DIR/mobile-raw-$CURRENT_DATE.json"
fi

# Process desktop results if available
if [ -f "$DESKTOP_REPORT" ] && [ "$DESKTOP_IS_PLACEHOLDER" = false ]; then
  echo "Processing desktop report: $DESKTOP_REPORT"

  # Extract basic metrics - using jq's round function instead of truncating
  DESKTOP_PERF=$(jq '.categories.performance.score * 100 | round' $DESKTOP_REPORT)
  DESKTOP_ACC=$(jq '.categories.accessibility.score * 100 | round' $DESKTOP_REPORT)
  DESKTOP_BP=$(jq '.categories["best-practices"].score * 100 | round' $DESKTOP_REPORT)
  DESKTOP_SEO=$(jq '.categories.seo.score * 100 | round' $DESKTOP_REPORT)
  DESKTOP_PWA=$(jq '.categories.pwa.score * 100 | round' $DESKTOP_REPORT 2>/dev/null || echo "0")

  # Extract web vitals and additional metrics - using proper rounding
  DESKTOP_LCP=$(jq '.audits["largest-contentful-paint"].numericValue | round' $DESKTOP_REPORT)
  DESKTOP_FID=$(jq '.audits["max-potential-fid"].numericValue | round' $DESKTOP_REPORT)
  DESKTOP_TBT=$(jq '.audits["total-blocking-time"].numericValue | round' $DESKTOP_REPORT)
  # Keep CLS as a decimal (3 decimal places) since it's typically a small number
  DESKTOP_CLS=$(jq '.audits["cumulative-layout-shift"].numericValue | .*1000 | round | ./1000' $DESKTOP_REPORT)
  DESKTOP_FCP=$(jq '.audits["first-contentful-paint"].numericValue | round' $DESKTOP_REPORT)
  DESKTOP_SI=$(jq '.audits["speed-index"].numericValue | round' $DESKTOP_REPORT)
  DESKTOP_TTI=$(jq '.audits["interactive"].numericValue | round' $DESKTOP_REPORT)

  # Extract opportunities
  DESKTOP_RENDER_BLOCKING=$(jq '.audits["render-blocking-resources"].details.items // [] | length' $DESKTOP_REPORT)
  DESKTOP_UNUSED_CSS=$(jq '.audits["unused-css-rules"].details.overallSavingsBytes // 0 | round' $DESKTOP_REPORT)
  DESKTOP_UNUSED_JS=$(jq '.audits["unused-javascript"].details.overallSavingsBytes // 0 | round' $DESKTOP_REPORT)
  DESKTOP_OFFSCREEN_IMAGES=$(jq '.audits["offscreen-images"].details.overallSavingsBytes // 0 | round' $DESKTOP_REPORT)
  DESKTOP_TOTAL_BYTES=$(jq '.audits["total-byte-weight"].numericValue // 0 | round' $DESKTOP_REPORT)
  DESKTOP_DOM_SIZE=$(jq '.audits["dom-size"].numericValue // 0 | round' $DESKTOP_REPORT)

  # Create environment variables file for templating
  METRICS_ENV_FILE="$DETAILED_DIR/metrics-values.env"
  echo "DESKTOP_PERF=$DESKTOP_PERF" > $METRICS_ENV_FILE
  echo "DESKTOP_A11Y=$DESKTOP_ACC" >> $METRICS_ENV_FILE
  echo "DESKTOP_BP=$DESKTOP_BP" >> $METRICS_ENV_FILE
  echo "DESKTOP_SEO=$DESKTOP_SEO" >> $METRICS_ENV_FILE
  echo "DESKTOP_PWA=$DESKTOP_PWA" >> $METRICS_ENV_FILE
  echo "DESKTOP_LCP=$DESKTOP_LCP" >> $METRICS_ENV_FILE
  echo "DESKTOP_FID=$DESKTOP_FID" >> $METRICS_ENV_FILE
  echo "DESKTOP_TBT=$DESKTOP_TBT" >> $METRICS_ENV_FILE
  echo "DESKTOP_CLS=$DESKTOP_CLS" >> $METRICS_ENV_FILE
  echo "DESKTOP_FCP=$DESKTOP_FCP" >> $METRICS_ENV_FILE
  echo "DESKTOP_SI=$DESKTOP_SI" >> $METRICS_ENV_FILE
  echo "DESKTOP_TTI=$DESKTOP_TTI" >> $METRICS_ENV_FILE

  # Flag to indicate whether we're using placeholder data
  IS_DESKTOP_PLACEHOLDER=$([ -f "$DESKTOP_REPORT" ] && echo "false" || echo "true")
  IS_MOBILE_PLACEHOLDER=$([ -f "$MOBILE_REPORT" ] && echo "false" || echo "true")

  # Create a temporary JSON structure for desktop
  DESKTOP_JSON=$(cat <<EOF
{
  "name": "$PAGE_NAME",
  "url": "https://curalife.com/$([[ $PAGE_NAME == 'homepage' ]] && echo '/' || echo "products/$PAGE_NAME")",
  "is_placeholder_data": {
    "desktop": $DESKTOP_IS_PLACEHOLDER,
    "mobile": $MOBILE_IS_PLACEHOLDER
  },
  "desktop": {
    "is_placeholder": $DESKTOP_IS_PLACEHOLDER,
    "performance": $DESKTOP_PERF,
    "accessibility": $DESKTOP_ACC,
    "bestPractices": $DESKTOP_BP,
    "seo": $DESKTOP_SEO,
    "metrics": {
      "LCP": $DESKTOP_LCP,
      "FID": $DESKTOP_FID,
      "CLS": $DESKTOP_CLS
    }
  }
}
EOF
)

  # Create required directories
  METRICS_JSON_FILE="$DETAILED_DIR/metrics-values.json"
  PROCESSED_DIR="$RESULTS_DIR/processed/$PAGE_NAME"
  mkdir -p "$PROCESSED_DIR"

  # Create additional directory paths for easier discovery
  ALTERNATE_DIR="../lighthouse-results/processed/$PAGE_NAME"
  mkdir -p "$ALTERNATE_DIR"

  # Create the desktop JSON to all locations to ensure it's findable
  echo "$DESKTOP_JSON" > "$METRICS_JSON_FILE.tmp"
  echo "$DESKTOP_JSON" > "$PROCESSED_DIR/metrics-values.json.tmp"
  echo "$DESKTOP_JSON" > "$ALTERNATE_DIR/metrics-values.json.tmp"

  # Also create a version directly in the performance-reports directory for easier access by the dashboard
  mkdir -p "performance-reports/$PAGE_NAME-details"
  echo "$DESKTOP_JSON" > "performance-reports/$PAGE_NAME-details/metrics-values.json.tmp"

  # If no mobile report is available, use the desktop-only JSON as the final file
  if [ ! -f "$MOBILE_REPORT" ]; then
    echo "$DESKTOP_JSON" > "$METRICS_JSON_FILE"
    echo "$DESKTOP_JSON" > "$PROCESSED_DIR/metrics-values.json"
    echo "$DESKTOP_JSON" > "$ALTERNATE_DIR/metrics-values.json"
    echo "$DESKTOP_JSON" > "performance-reports/$PAGE_NAME-details/metrics-values.json"
    echo "Created desktop-only metrics JSON file in all expected locations"
  fi

  # Output to GITHUB_OUTPUT for GitHub Actions
  echo "desktop_perf=$DESKTOP_PERF" >> $GITHUB_OUTPUT
  echo "desktop_a11y=$DESKTOP_ACC" >> $GITHUB_OUTPUT
  echo "desktop_bp=$DESKTOP_BP" >> $GITHUB_OUTPUT
  echo "desktop_seo=$DESKTOP_SEO" >> $GITHUB_OUTPUT
  echo "desktop_pwa=$DESKTOP_PWA" >> $GITHUB_OUTPUT
  echo "desktop_lcp=$DESKTOP_LCP" >> $GITHUB_OUTPUT
  echo "desktop_fid=$DESKTOP_FID" >> $GITHUB_OUTPUT
  echo "desktop_tbt=$DESKTOP_TBT" >> $GITHUB_OUTPUT
  echo "desktop_cls=$DESKTOP_CLS" >> $GITHUB_OUTPUT
  echo "desktop_fcp=$DESKTOP_FCP" >> $GITHUB_OUTPUT
  echo "desktop_si=$DESKTOP_SI" >> $GITHUB_OUTPUT
  echo "desktop_tti=$DESKTOP_TTI" >> $GITHUB_OUTPUT
  echo "desktop_render_blocking=$DESKTOP_RENDER_BLOCKING" >> $GITHUB_OUTPUT
  echo "desktop_unused_css=$DESKTOP_UNUSED_CSS" >> $GITHUB_OUTPUT
  echo "desktop_unused_js=$DESKTOP_UNUSED_JS" >> $GITHUB_OUTPUT
  echo "desktop_offscreen_images=$DESKTOP_OFFSCREEN_IMAGES" >> $GITHUB_OUTPUT
  echo "desktop_total_bytes=$DESKTOP_TOTAL_BYTES" >> $GITHUB_OUTPUT
  echo "desktop_dom_size=$DESKTOP_DOM_SIZE" >> $GITHUB_OUTPUT

  # Update the detailed metrics file with desktop data
  TMP_FILE=$(mktemp)
  jq --arg perf "$DESKTOP_PERF" \
     --arg a11y "$DESKTOP_ACC" \
     --arg bp "$DESKTOP_BP" \
     --arg seo "$DESKTOP_SEO" \
     --arg pwa "$DESKTOP_PWA" \
     --arg lcp "$DESKTOP_LCP" \
     --arg fid "$DESKTOP_FID" \
     --arg tbt "$DESKTOP_TBT" \
     --arg cls "$DESKTOP_CLS" \
     --arg fcp "$DESKTOP_FCP" \
     --arg si "$DESKTOP_SI" \
     --arg tti "$DESKTOP_TTI" \
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
  jq -r '.audits["network-requests"].details.items // [] | sort_by(.endTime - .startTime) | reverse | .[0:5] | map({url: .url, transferSize: .transferSize, duration: (.endTime - .startTime)})' $DESKTOP_REPORT > "$DETAILED_DIR/desktop-slowest-requests.json"
else
  # Set placeholder values for desktop metrics - use distinctive values to make them obvious
  echo "No desktop report found or using fallback - using clearly marked placeholder values"
  DESKTOP_PERF=42
  DESKTOP_ACC=42
  DESKTOP_BP=42
  DESKTOP_SEO=42
  DESKTOP_PWA=42
  DESKTOP_LCP=4242
  DESKTOP_FID=42
  DESKTOP_TBT=242
  DESKTOP_CLS=0.42
  DESKTOP_FCP=4242
  DESKTOP_SI=4242
  DESKTOP_TTI=4242
  DESKTOP_RENDER_BLOCKING=4
  DESKTOP_UNUSED_CSS=42000
  DESKTOP_UNUSED_JS=42000
  DESKTOP_OFFSCREEN_IMAGES=42000
  DESKTOP_TOTAL_BYTES=420000
  DESKTOP_DOM_SIZE=420
  DESKTOP_IS_PLACEHOLDER=true
fi

# Process mobile results if available
if [ -f "$MOBILE_REPORT" ] && [ "$MOBILE_IS_PLACEHOLDER" = false ]; then
  echo "Processing mobile report: $MOBILE_REPORT"

  # Extract basic metrics - using jq's round function instead of truncating
  MOBILE_PERF=$(jq '.categories.performance.score * 100 | round' $MOBILE_REPORT)
  MOBILE_ACC=$(jq '.categories.accessibility.score * 100 | round' $MOBILE_REPORT)
  MOBILE_BP=$(jq '.categories["best-practices"].score * 100 | round' $MOBILE_REPORT)
  MOBILE_SEO=$(jq '.categories.seo.score * 100 | round' $MOBILE_REPORT)
  MOBILE_PWA=$(jq '.categories.pwa.score * 100 | round' $MOBILE_REPORT 2>/dev/null || echo "0")

  # Extract web vitals and additional metrics - using proper rounding
  MOBILE_LCP=$(jq '.audits["largest-contentful-paint"].numericValue | round' $MOBILE_REPORT)
  MOBILE_FID=$(jq '.audits["max-potential-fid"].numericValue | round' $MOBILE_REPORT)
  MOBILE_TBT=$(jq '.audits["total-blocking-time"].numericValue | round' $MOBILE_REPORT)
  # Keep CLS as a decimal (3 decimal places) since it's typically a small number
  MOBILE_CLS=$(jq '.audits["cumulative-layout-shift"].numericValue | .*1000 | round | ./1000' $MOBILE_REPORT)
  MOBILE_FCP=$(jq '.audits["first-contentful-paint"].numericValue | round' $MOBILE_REPORT)
  MOBILE_SI=$(jq '.audits["speed-index"].numericValue | round' $MOBILE_REPORT)
  MOBILE_TTI=$(jq '.audits["interactive"].numericValue | round' $MOBILE_REPORT)

  # Extract opportunities
  MOBILE_RENDER_BLOCKING=$(jq '.audits["render-blocking-resources"].details.items // [] | length' $MOBILE_REPORT)
  MOBILE_UNUSED_CSS=$(jq '.audits["unused-css-rules"].details.overallSavingsBytes // 0 | round' $MOBILE_REPORT)
  MOBILE_UNUSED_JS=$(jq '.audits["unused-javascript"].details.overallSavingsBytes // 0 | round' $MOBILE_REPORT)
  MOBILE_OFFSCREEN_IMAGES=$(jq '.audits["offscreen-images"].details.overallSavingsBytes // 0 | round' $MOBILE_REPORT)
  MOBILE_TOTAL_BYTES=$(jq '.audits["total-byte-weight"].numericValue // 0 | round' $MOBILE_REPORT)
  MOBILE_DOM_SIZE=$(jq '.audits["dom-size"].numericValue // 0 | round' $MOBILE_REPORT)

  # Append to environment variables file for templating
  echo "MOBILE_PERF=$MOBILE_PERF" >> $METRICS_ENV_FILE
  echo "MOBILE_A11Y=$MOBILE_ACC" >> $METRICS_ENV_FILE
  echo "MOBILE_BP=$MOBILE_BP" >> $METRICS_ENV_FILE
  echo "MOBILE_SEO=$MOBILE_SEO" >> $METRICS_ENV_FILE
  echo "MOBILE_PWA=$MOBILE_PWA" >> $METRICS_ENV_FILE
  echo "MOBILE_LCP=$MOBILE_LCP" >> $METRICS_ENV_FILE
  echo "MOBILE_FID=$MOBILE_FID" >> $METRICS_ENV_FILE
  echo "MOBILE_TBT=$MOBILE_TBT" >> $METRICS_ENV_FILE
  echo "MOBILE_CLS=$MOBILE_CLS" >> $METRICS_ENV_FILE
  echo "MOBILE_FCP=$MOBILE_FCP" >> $METRICS_ENV_FILE
  echo "MOBILE_SI=$MOBILE_SI" >> $METRICS_ENV_FILE
  echo "MOBILE_TTI=$MOBILE_TTI" >> $METRICS_ENV_FILE

  # Output to GITHUB_OUTPUT for GitHub Actions
  echo "mobile_perf=$MOBILE_PERF" >> $GITHUB_OUTPUT
  echo "mobile_a11y=$MOBILE_ACC" >> $GITHUB_OUTPUT
  echo "mobile_bp=$MOBILE_BP" >> $GITHUB_OUTPUT
  echo "mobile_seo=$MOBILE_SEO" >> $GITHUB_OUTPUT
  echo "mobile_pwa=$MOBILE_PWA" >> $GITHUB_OUTPUT
  echo "mobile_lcp=$MOBILE_LCP" >> $GITHUB_OUTPUT
  echo "mobile_fid=$MOBILE_FID" >> $GITHUB_OUTPUT
  echo "mobile_tbt=$MOBILE_TBT" >> $GITHUB_OUTPUT
  echo "mobile_cls=$MOBILE_CLS" >> $GITHUB_OUTPUT
  echo "mobile_fcp=$MOBILE_FCP" >> $GITHUB_OUTPUT
  echo "mobile_si=$MOBILE_SI" >> $GITHUB_OUTPUT
  echo "mobile_tti=$MOBILE_TTI" >> $GITHUB_OUTPUT
  echo "mobile_render_blocking=$MOBILE_RENDER_BLOCKING" >> $GITHUB_OUTPUT
  echo "mobile_unused_css=$MOBILE_UNUSED_CSS" >> $GITHUB_OUTPUT
  echo "mobile_unused_js=$MOBILE_UNUSED_JS" >> $GITHUB_OUTPUT
  echo "mobile_offscreen_images=$MOBILE_OFFSCREEN_IMAGES" >> $GITHUB_OUTPUT
  echo "mobile_total_bytes=$MOBILE_TOTAL_BYTES" >> $GITHUB_OUTPUT
  echo "mobile_dom_size=$MOBILE_DOM_SIZE" >> $GITHUB_OUTPUT

  # Create the complete metrics JSON file with both desktop and mobile data
  MOBILE_JSON=$(cat <<EOF
{
  "name": "$PAGE_NAME",
  "url": "https://curalife.com/$([[ $PAGE_NAME == 'homepage' ]] && echo '/' || echo "products/$PAGE_NAME")",
  "is_placeholder_data": {
    "desktop": $DESKTOP_IS_PLACEHOLDER,
    "mobile": $MOBILE_IS_PLACEHOLDER
  },
  "desktop": {
    "performance": $DESKTOP_PERF,
    "accessibility": $DESKTOP_ACC,
    "bestPractices": $DESKTOP_BP,
    "seo": $DESKTOP_SEO,
    "metrics": {
      "LCP": $DESKTOP_LCP,
      "FID": $DESKTOP_FID,
      "CLS": $DESKTOP_CLS
    }
  },
  "mobile": {
    "performance": $MOBILE_PERF,
    "accessibility": $MOBILE_ACC,
    "bestPractices": $MOBILE_BP,
    "seo": $MOBILE_SEO,
    "metrics": {
      "LCP": $MOBILE_LCP,
      "FID": $MOBILE_FID,
      "CLS": $MOBILE_CLS
    }
  }
}
EOF
)

  # Write the final JSON file with both desktop and mobile data to all locations
  echo "$MOBILE_JSON" > "$METRICS_JSON_FILE"
  echo "$MOBILE_JSON" > "$PROCESSED_DIR/metrics-values.json"
  echo "$MOBILE_JSON" > "$ALTERNATE_DIR/metrics-values.json"
  echo "$MOBILE_JSON" > "performance-reports/$PAGE_NAME-details/metrics-values.json"
  echo "Created complete metrics JSON file with desktop and mobile data in all expected locations"

  # Update the detailed metrics file with mobile data
  TMP_FILE=$(mktemp)
  jq --arg perf "$MOBILE_PERF" \
     --arg a11y "$MOBILE_ACC" \
     --arg bp "$MOBILE_BP" \
     --arg seo "$MOBILE_SEO" \
     --arg pwa "$MOBILE_PWA" \
     --arg lcp "$MOBILE_LCP" \
     --arg fid "$MOBILE_FID" \
     --arg tbt "$MOBILE_TBT" \
     --arg cls "$MOBILE_CLS" \
     --arg fcp "$MOBILE_FCP" \
     --arg si "$MOBILE_SI" \
     --arg tti "$MOBILE_TTI" \
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
  jq -r '.audits["network-requests"].details.items // [] | sort_by(.endTime - .startTime) | reverse | .[0:5] | map({url: .url, transferSize: .transferSize, duration: (.endTime - .startTime)})' $MOBILE_REPORT > "$DETAILED_DIR/mobile-slowest-requests.json"
else
  # Set placeholder values for mobile metrics - use distinctive values
  echo "No mobile report found or using fallback - using clearly marked placeholder values"
  MOBILE_PERF=24
  MOBILE_ACC=24
  MOBILE_BP=24
  MOBILE_SEO=24
  MOBILE_PWA=24
  MOBILE_LCP=2424
  MOBILE_FID=24
  MOBILE_TBT=224
  MOBILE_CLS=0.24
  MOBILE_FCP=2424
  MOBILE_SI=2424
  MOBILE_TTI=2424
  MOBILE_RENDER_BLOCKING=2
  MOBILE_UNUSED_CSS=24000
  MOBILE_UNUSED_JS=24000
  MOBILE_OFFSCREEN_IMAGES=24000
  MOBILE_TOTAL_BYTES=240000
  MOBILE_DOM_SIZE=240
  MOBILE_IS_PLACEHOLDER=true
fi

echo "has_results=true" >> $GITHUB_OUTPUT
echo "report_date=$CURRENT_DATE" >> $GITHUB_OUTPUT