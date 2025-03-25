#!/bin/bash
set -e

# This script manages historical Lighthouse CI data
# It takes current data, merges it with existing historical data,
# and structures it for time-series visualization

CURRENT_DATE=$1
HISTORY_DIR="performance-reports/history"

# Ensure history directory exists
mkdir -p "$HISTORY_DIR"

# Initialize history file if it doesn't exist
HISTORY_FILE="$HISTORY_DIR/historical-data.json"
if [ ! -f "$HISTORY_FILE" ]; then
  echo '{"data":[]}' > "$HISTORY_FILE"
fi

# Process all summary.json files from the current run
find performance-reports -name "summary.json" | while read -r file; do
  # Extract key metrics from the summary file
  PAGE_NAME=$(grep -o '"page": *"[^"]*"' "$file" | cut -d'"' -f4 || echo "unknown")
  URL=$(grep -o '"url": *"[^"]*"' "$file" | cut -d'"' -f4 || echo "unknown")

  # Desktop metrics
  DESKTOP_PERF=$(grep -o '"desktop":{[^}]*"performance": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_A11Y=$(grep -o '"desktop":{[^}]*"accessibility": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_BP=$(grep -o '"desktop":{[^}]*"bestPractices": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_SEO=$(grep -o '"desktop":{[^}]*"seo": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_LCP=$(grep -o '"desktop":{[^}]*"largestContentfulPaint": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_TBT=$(grep -o '"desktop":{[^}]*"totalBlockingTime": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  DESKTOP_CLS=$(grep -o '"desktop":{[^}]*"cumulativeLayoutShift": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")

  # Mobile metrics
  MOBILE_PERF=$(grep -o '"mobile":{[^}]*"performance": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_A11Y=$(grep -o '"mobile":{[^}]*"accessibility": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_BP=$(grep -o '"mobile":{[^}]*"bestPractices": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_SEO=$(grep -o '"mobile":{[^}]*"seo": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_LCP=$(grep -o '"mobile":{[^}]*"largestContentfulPaint": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_TBT=$(grep -o '"mobile":{[^}]*"totalBlockingTime": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")
  MOBILE_CLS=$(grep -o '"mobile":{[^}]*"cumulativeLayoutShift": *[0-9.]*' "$file" | grep -o '[0-9.]*$' || echo "0")

  # Create a page-specific history file for easier processing
  PAGE_HISTORY_FILE="$HISTORY_DIR/${PAGE_NAME}-history.json"
  if [ ! -f "$PAGE_HISTORY_FILE" ]; then
    echo '{"page":"'$PAGE_NAME'","url":"'$URL'","data":[]}' > "$PAGE_HISTORY_FILE"
  fi

  # Create a new entry for the current date
  NEW_ENTRY='{
    "date": "'$CURRENT_DATE'",
    "desktop": {
      "performance": '$DESKTOP_PERF',
      "accessibility": '$DESKTOP_A11Y',
      "bestPractices": '$DESKTOP_BP',
      "seo": '$DESKTOP_SEO',
      "lcp": '$DESKTOP_LCP',
      "tbt": '$DESKTOP_TBT',
      "cls": '$DESKTOP_CLS'
    },
    "mobile": {
      "performance": '$MOBILE_PERF',
      "accessibility": '$MOBILE_A11Y',
      "bestPractices": '$MOBILE_BP',
      "seo": '$MOBILE_SEO',
      "lcp": '$MOBILE_LCP',
      "tbt": '$MOBILE_TBT',
      "cls": '$MOBILE_CLS'
    }
  }'

  # Use temporary files to avoid issues with in-place editing
  TMP_FILE=$(mktemp)

  # Add the new entry to the page history file
  jq --argjson newEntry "$NEW_ENTRY" '.data += [$newEntry]' "$PAGE_HISTORY_FILE" > "$TMP_FILE"
  mv "$TMP_FILE" "$PAGE_HISTORY_FILE"

  # Also add to the global history file (with page info)
  GLOBAL_ENTRY='{
    "page": "'$PAGE_NAME'",
    "date": "'$CURRENT_DATE'",
    "desktop": {
      "performance": '$DESKTOP_PERF',
      "accessibility": '$DESKTOP_A11Y',
      "bestPractices": '$DESKTOP_BP',
      "seo": '$DESKTOP_SEO',
      "lcp": '$DESKTOP_LCP',
      "tbt": '$DESKTOP_TBT',
      "cls": '$DESKTOP_CLS'
    },
    "mobile": {
      "performance": '$MOBILE_PERF',
      "accessibility": '$MOBILE_A11Y',
      "bestPractices": '$MOBILE_BP',
      "seo": '$MOBILE_SEO',
      "lcp": '$MOBILE_LCP',
      "tbt": '$MOBILE_TBT',
      "cls": '$MOBILE_CLS'
    }
  }'

  # Add to the global history file
  TMP_FILE=$(mktemp)
  jq --argjson newEntry "$GLOBAL_ENTRY" '.data += [$newEntry]' "$HISTORY_FILE" > "$TMP_FILE"
  mv "$TMP_FILE" "$HISTORY_FILE"
done

# Keep only the last 90 days of data to prevent the file from growing too large
# This is optional and can be adjusted based on your needs
for history_file in "$HISTORY_DIR"/*-history.json; do
  if [ -f "$history_file" ]; then
    TMP_FILE=$(mktemp)
    jq '.data = (.data | sort_by(.date) | reverse | .[0:90])' "$history_file" > "$TMP_FILE"
    mv "$TMP_FILE" "$history_file"
  fi
done

# Also trim the global history file
TMP_FILE=$(mktemp)
jq '.data = (.data | sort_by(.date) | reverse | .[0:500])' "$HISTORY_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$HISTORY_FILE"

# Create a summary file with the latest metrics for each page
LATEST_SUMMARY_FILE="$HISTORY_DIR/latest-summary.json"
jq '.data | group_by(.page) | map({page: .[0].page, latest: .[0]}) | {pages: .}' "$HISTORY_FILE" > "$LATEST_SUMMARY_FILE"

echo "Historical data processing complete"