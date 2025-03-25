#!/bin/bash

# This script saves Lighthouse reports to the performance-reports directory
# Usage: ./save-reports.sh [PAGE_NAME] [RESULTS_DIR] [CURRENT_DATE]

# Get parameters
PAGE_NAME=$1
RESULTS_DIR=$2
CURRENT_DATE=$3

# Exit if required parameters are missing
if [ -z "$PAGE_NAME" ] || [ -z "$RESULTS_DIR" ] || [ -z "$CURRENT_DATE" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./save-reports.sh [PAGE_NAME] [RESULTS_DIR] [CURRENT_DATE]"
  exit 1
fi

# Create performance-reports directory if it doesn't exist
mkdir -p performance-reports/$CURRENT_DATE
mkdir -p performance-reports/$CURRENT_DATE/$PAGE_NAME
mkdir -p performance-reports/$CURRENT_DATE/$PAGE_NAME/assets
mkdir -p performance-reports/history/$PAGE_NAME

echo "Creating report directories for $PAGE_NAME"

# Create a JSON summary file for this page
SUMMARY_FILE="performance-reports/$CURRENT_DATE/$PAGE_NAME/summary.json"
echo "Creating summary file at $SUMMARY_FILE"

# Create report summary JSON with more detailed metrics
echo "{" > $SUMMARY_FILE
echo "  \"page\": \"$PAGE_NAME\"," >> $SUMMARY_FILE
echo "  \"url\": \"$URL\"," >> $SUMMARY_FILE
echo "  \"date\": \"$CURRENT_DATE\"," >> $SUMMARY_FILE
echo "  \"desktop\": {" >> $SUMMARY_FILE
echo "    \"performance\": ${{ steps.scores.outputs.desktop_perf || 0 }}," >> $SUMMARY_FILE
echo "    \"accessibility\": ${{ steps.scores.outputs.desktop_a11y || 0 }}," >> $SUMMARY_FILE
echo "    \"bestPractices\": ${{ steps.scores.outputs.desktop_bp || 0 }}," >> $SUMMARY_FILE
echo "    \"seo\": ${{ steps.scores.outputs.desktop_seo || 0 }}," >> $SUMMARY_FILE
echo "    \"pwa\": ${{ steps.scores.outputs.desktop_pwa || 0 }}," >> $SUMMARY_FILE
echo "    \"metrics\": {" >> $SUMMARY_FILE
echo "      \"firstContentfulPaint\": ${{ steps.scores.outputs.desktop_fcp || 0 }}," >> $SUMMARY_FILE
echo "      \"speedIndex\": ${{ steps.scores.outputs.desktop_si || 0 }}," >> $SUMMARY_FILE
echo "      \"largestContentfulPaint\": ${{ steps.scores.outputs.desktop_lcp || 0 }}," >> $SUMMARY_FILE
echo "      \"timeToInteractive\": ${{ steps.scores.outputs.desktop_tti || 0 }}," >> $SUMMARY_FILE
echo "      \"totalBlockingTime\": ${{ steps.scores.outputs.desktop_tbt || 0 }}," >> $SUMMARY_FILE
echo "      \"maxPotentialFID\": ${{ steps.scores.outputs.desktop_fid || 0 }}," >> $SUMMARY_FILE
echo "      \"cumulativeLayoutShift\": ${{ steps.scores.outputs.desktop_cls || 0 }}" >> $SUMMARY_FILE
echo "    }," >> $SUMMARY_FILE
echo "    \"opportunities\": {" >> $SUMMARY_FILE
echo "      \"renderBlockingResources\": ${{ steps.scores.outputs.desktop_render_blocking || 0 }}," >> $SUMMARY_FILE
echo "      \"unusedCSSBytes\": ${{ steps.scores.outputs.desktop_unused_css || 0 }}," >> $SUMMARY_FILE
echo "      \"unusedJSBytes\": ${{ steps.scores.outputs.desktop_unused_js || 0 }}," >> $SUMMARY_FILE
echo "      \"offscreenImagesBytes\": ${{ steps.scores.outputs.desktop_offscreen_images || 0 }}," >> $SUMMARY_FILE
echo "      \"totalBytes\": ${{ steps.scores.outputs.desktop_total_bytes || 0 }}," >> $SUMMARY_FILE
echo "      \"domSize\": ${{ steps.scores.outputs.desktop_dom_size || 0 }}" >> $SUMMARY_FILE
echo "    }" >> $SUMMARY_FILE
echo "  }," >> $SUMMARY_FILE
echo "  \"mobile\": {" >> $SUMMARY_FILE
echo "    \"performance\": ${{ steps.scores.outputs.mobile_perf || 0 }}," >> $SUMMARY_FILE
echo "    \"accessibility\": ${{ steps.scores.outputs.mobile_a11y || 0 }}," >> $SUMMARY_FILE
echo "    \"bestPractices\": ${{ steps.scores.outputs.mobile_bp || 0 }}," >> $SUMMARY_FILE
echo "    \"seo\": ${{ steps.scores.outputs.mobile_seo || 0 }}," >> $SUMMARY_FILE
echo "    \"pwa\": ${{ steps.scores.outputs.mobile_pwa || 0 }}," >> $SUMMARY_FILE
echo "    \"metrics\": {" >> $SUMMARY_FILE
echo "      \"firstContentfulPaint\": ${{ steps.scores.outputs.mobile_fcp || 0 }}," >> $SUMMARY_FILE
echo "      \"speedIndex\": ${{ steps.scores.outputs.mobile_si || 0 }}," >> $SUMMARY_FILE
echo "      \"largestContentfulPaint\": ${{ steps.scores.outputs.mobile_lcp || 0 }}," >> $SUMMARY_FILE
echo "      \"timeToInteractive\": ${{ steps.scores.outputs.mobile_tti || 0 }}," >> $SUMMARY_FILE
echo "      \"totalBlockingTime\": ${{ steps.scores.outputs.mobile_tbt || 0 }}," >> $SUMMARY_FILE
echo "      \"maxPotentialFID\": ${{ steps.scores.outputs.mobile_fid || 0 }}," >> $SUMMARY_FILE
echo "      \"cumulativeLayoutShift\": ${{ steps.scores.outputs.mobile_cls || 0 }}" >> $SUMMARY_FILE
echo "    }," >> $SUMMARY_FILE
echo "    \"opportunities\": {" >> $SUMMARY_FILE
echo "      \"renderBlockingResources\": ${{ steps.scores.outputs.mobile_render_blocking || 0 }}," >> $SUMMARY_FILE
echo "      \"unusedCSSBytes\": ${{ steps.scores.outputs.mobile_unused_css || 0 }}," >> $SUMMARY_FILE
echo "      \"unusedJSBytes\": ${{ steps.scores.outputs.mobile_unused_js || 0 }}," >> $SUMMARY_FILE
echo "      \"offscreenImagesBytes\": ${{ steps.scores.outputs.mobile_offscreen_images || 0 }}," >> $SUMMARY_FILE
echo "      \"totalBytes\": ${{ steps.scores.outputs.mobile_total_bytes || 0 }}," >> $SUMMARY_FILE
echo "      \"domSize\": ${{ steps.scores.outputs.mobile_dom_size || 0 }}" >> $SUMMARY_FILE
echo "    }" >> $SUMMARY_FILE
echo "  }" >> $SUMMARY_FILE
echo "}" >> $SUMMARY_FILE

# Copy the summary to history directory for trends
cp $SUMMARY_FILE "performance-reports/history/$PAGE_NAME/$CURRENT_DATE.json"

# Copy lighthouse reports to performance-reports directory
if [ -d "$RESULTS_DIR" ]; then
  # Copy desktop HTML report if exists
  DESKTOP_HTML=$(find $RESULTS_DIR -name "*.html" -not -path "*/mobile/*" | sort | tail -n 1)
  if [ -f "$DESKTOP_HTML" ]; then
    cp "$DESKTOP_HTML" "performance-reports/$CURRENT_DATE/$PAGE_NAME/desktop.html"
  fi

  # Check if mobile directory exists first
  if [ -d "$RESULTS_DIR/mobile" ]; then
    # Copy mobile HTML report if exists
    MOBILE_HTML=$(find $RESULTS_DIR/mobile -name "*.html" | sort | tail -n 1)
    if [ -f "$MOBILE_HTML" ]; then
      cp "$MOBILE_HTML" "performance-reports/$CURRENT_DATE/$PAGE_NAME/mobile.html"
    else
      echo "Mobile HTML report not found for $PAGE_NAME, creating a fallback file"
      # Create a fallback mobile.html file if it doesn't exist
      echo "<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Mobile Lighthouse Report - $PAGE_NAME</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .score { display: inline-block; padding: 10px; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 50px; font-weight: bold; color: white; margin-right: 15px; }
    .good { background-color: #0CCE6B; }
    .average { background-color: #FFA400; }
    .poor { background-color: #FF4E42; }
    .metrics-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .metrics-table th, .metrics-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .metrics-table th { background-color: #f2f2f2; }
    .back-link { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Mobile Lighthouse Report for $PAGE_NAME</h1>
  <p>Generated on $CURRENT_DATE via GitHub Actions</p>

  <div class=\"card\">
    <h2>Performance Scores</h2>
    <div>
      <span class=\"score $([ \"$MOBILE_PERF\" -ge 90 ] && echo 'good' || [ \"$MOBILE_PERF\" -ge 50 ] && echo 'average' || echo 'poor')\">$MOBILE_PERF</span>
      <strong>Performance</strong>
    </div>
    <div>
      <span class=\"score $([ \"$MOBILE_ACC\" -ge 90 ] && echo 'good' || [ \"$MOBILE_ACC\" -ge 50 ] && echo 'average' || echo 'poor')\">$MOBILE_ACC</span>
      <strong>Accessibility</strong>
    </div>
    <div>
      <span class=\"score $([ \"$MOBILE_BP\" -ge 90 ] && echo 'good' || [ \"$MOBILE_BP\" -ge 50 ] && echo 'average' || echo 'poor')\">$MOBILE_BP</span>
      <strong>Best Practices</strong>
    </div>
    <div>
      <span class=\"score $([ \"$MOBILE_SEO\" -ge 90 ] && echo 'good' || [ \"$MOBILE_SEO\" -ge 50 ] && echo 'average' || echo 'poor')\">$MOBILE_SEO</span>
      <strong>SEO</strong>
    </div>
  </div>

  <div class=\"card\">
    <h2>Core Web Vitals</h2>
    <table class=\"metrics-table\">
      <tr>
        <th>Metric</th>
        <th>Value</th>
        <th>Assessment</th>
      </tr>
      <tr>
        <td>Largest Contentful Paint (LCP)</td>
        <td>$(echo \"$MOBILE_LCP / 1000\" | bc -l | xargs printf \"%.2f\")s</td>
        <td class=\"$([ \"$MOBILE_LCP\" -lt 2500 ] && echo 'good' || [ \"$MOBILE_LCP\" -lt 4000 ] && echo 'average' || echo 'poor')\">
          $([ \"$MOBILE_LCP\" -lt 2500 ] && echo 'Good' || [ \"$MOBILE_LCP\" -lt 4000 ] && echo 'Needs Improvement' || echo 'Poor')
        </td>
      </tr>
      <tr>
        <td>Total Blocking Time (TBT)</td>
        <td>$MOBILE_TBT ms</td>
        <td class=\"$([ \"$MOBILE_TBT\" -lt 200 ] && echo 'good' || [ \"$MOBILE_TBT\" -lt 600 ] && echo 'average' || echo 'poor')\">
          $([ \"$MOBILE_TBT\" -lt 200 ] && echo 'Good' || [ \"$MOBILE_TBT\" -lt 600 ] && echo 'Needs Improvement' || echo 'Poor')
        </td>
      </tr>
      <tr>
        <td>Cumulative Layout Shift (CLS)</td>
        <td>$MOBILE_CLS</td>
        <td class=\"$(awk \"BEGIN {exit !($MOBILE_CLS < 0.1)}\" && echo 'good' || awk \"BEGIN {exit !($MOBILE_CLS < 0.25)}\" && echo 'average' || echo 'poor')\">
          $(awk \"BEGIN {exit !($MOBILE_CLS < 0.1)}\" && echo 'Good' || awk \"BEGIN {exit !($MOBILE_CLS < 0.25)}\" && echo 'Needs Improvement' || echo 'Poor')
        </td>
      </tr>
    </table>
  </div>

  <div class=\"card\">
    <h2>Additional Metrics</h2>
    <table class=\"metrics-table\">
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>First Contentful Paint</td>
        <td>$(echo \"$MOBILE_FCP / 1000\" | bc -l | xargs printf \"%.2f\")s</td>
      </tr>
      <tr>
        <td>Speed Index</td>
        <td>$(echo \"$MOBILE_SI / 1000\" | bc -l | xargs printf \"%.2f\")s</td>
      </tr>
      <tr>
        <td>Time to Interactive</td>
        <td>$(echo \"$MOBILE_TTI / 1000\" | bc -l | xargs printf \"%.2f\")s</td>
      </tr>
      <tr>
        <td>Total Page Size</td>
        <td>$(echo \"$MOBILE_TOTAL_BYTES / 1024 / 1024\" | bc -l | xargs printf \"%.2f\") MB</td>
      </tr>
    </table>
  </div>

  <a href=\"../../../index.html\" class=\"back-link\">Back to Dashboard</a>
</body>
</html>" > "performance-reports/$CURRENT_DATE/$PAGE_NAME/mobile.html"
    fi
  else
    echo "Mobile directory not found for $PAGE_NAME, creating a fallback mobile.html file"
    mkdir -p "performance-reports/$CURRENT_DATE/$PAGE_NAME"
    # Create a fallback mobile.html file
    echo "<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Mobile Lighthouse Report - $PAGE_NAME</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #2c3e50; }
    .alert { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .back-link { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Mobile Lighthouse Report for $PAGE_NAME</h1>
  <p>Generated on $CURRENT_DATE via GitHub Actions</p>

  <div class=\"alert\">
    <h2>Report Not Available</h2>
    <p>The mobile Lighthouse test did not complete successfully. This could be due to:</p>
    <ul>
      <li>Timeout during testing</li>
      <li>Network issues</li>
      <li>Page compatibility issues</li>
    </ul>
    <p>Please check the GitHub Actions logs for more details or try running the workflow again.</p>
  </div>

  <a href=\"../../../index.html\" class=\"back-link\">Back to Dashboard</a>
</body>
</html>" > "performance-reports/$CURRENT_DATE/$PAGE_NAME/mobile.html"
  fi

  # Copy screenshots if they exist
  if [ -d "$RESULTS_DIR/screenshots" ]; then
    cp -r $RESULTS_DIR/screenshots/* "performance-reports/$CURRENT_DATE/$PAGE_NAME/assets/"
  else
    echo "Desktop screenshots directory not found for $PAGE_NAME, skipping desktop screenshots copy"
  fi

  if [ -d "$RESULTS_DIR/mobile/screenshots" ]; then
    # Add 'mobile-' prefix to the filenames when copying
    mkdir -p "performance-reports/$CURRENT_DATE/$PAGE_NAME/assets"
    for file in $RESULTS_DIR/mobile/screenshots/*; do
      filename=$(basename "$file")
      cp "$file" "performance-reports/$CURRENT_DATE/$PAGE_NAME/assets/mobile-$filename"
    done
  else
    echo "Mobile screenshots directory not found for $PAGE_NAME, skipping mobile screenshots copy"
  fi

  # Copy any detailed metrics files
  if [ -d "performance-reports/$PAGE_NAME-details" ]; then
    cp -r performance-reports/$PAGE_NAME-details/* "performance-reports/$CURRENT_DATE/$PAGE_NAME/"
  fi
fi

# Create a comprehensive markdown report
MARKDOWN_REPORT="performance-reports/$CURRENT_DATE/$PAGE_NAME/report.md"

echo "# Performance Report: $PAGE_NAME" > $MARKDOWN_REPORT
echo "**URL:** $URL" >> $MARKDOWN_REPORT
echo "**Date:** $CURRENT_DATE" >> $MARKDOWN_REPORT
echo "**Test Environment:** GitHub Actions CI" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

echo "## Overview" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Device | Performance | Accessibility | Best Practices | SEO | PWA |" >> $MARKDOWN_REPORT
echo "|--------|-------------|---------------|----------------|-----|-----|" >> $MARKDOWN_REPORT
echo "| 💻 Desktop | ${{ steps.scores.outputs.desktop_perf || 0 }}% | ${{ steps.scores.outputs.desktop_a11y || 0 }}% | ${{ steps.scores.outputs.desktop_bp || 0 }}% | ${{ steps.scores.outputs.desktop_seo || 0 }}% | ${{ steps.scores.outputs.desktop_pwa || 0 }}% |" >> $MARKDOWN_REPORT
echo "| 📱 Mobile | ${{ steps.scores.outputs.mobile_perf || 0 }}% | ${{ steps.scores.outputs.mobile_a11y || 0 }}% | ${{ steps.scores.outputs.mobile_bp || 0 }}% | ${{ steps.scores.outputs.mobile_seo || 0 }}% | ${{ steps.scores.outputs.mobile_pwa || 0 }}% |" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Add Core Web Vitals section for desktop
echo "## Core Web Vitals" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "### Desktop" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Metric | Value | Status | Target |" >> $MARKDOWN_REPORT
echo "|--------|-------|--------|--------|" >> $MARKDOWN_REPORT

# LCP Status
if (( $(echo "${{ steps.scores.outputs.desktop_lcp }} < 2500" | bc -l) )); then
  LCP_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.desktop_lcp }} < 4000" | bc -l) )); then
  LCP_STATUS="🟠 Needs Improvement"
else
  LCP_STATUS="🔴 Poor"
fi

# CLS Status
if (( $(echo "${{ steps.scores.outputs.desktop_cls }} < 0.1" | bc -l) )); then
  CLS_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.desktop_cls }} < 0.25" | bc -l) )); then
  CLS_STATUS="🟠 Needs Improvement"
else
  CLS_STATUS="🔴 Poor"
fi

# TBT/FID Status
if (( $(echo "${{ steps.scores.outputs.desktop_tbt }} < 200" | bc -l) )); then
  TBT_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.desktop_tbt }} < 600" | bc -l) )); then
  TBT_STATUS="🟠 Needs Improvement"
else
  TBT_STATUS="🔴 Poor"
fi

echo "| Largest Contentful Paint (LCP) | $(echo "${{ steps.scores.outputs.desktop_lcp }} / 1" | bc)ms | $LCP_STATUS | < 2.5s |" >> $MARKDOWN_REPORT
echo "| Cumulative Layout Shift (CLS) | ${{ steps.scores.outputs.desktop_cls }} | $CLS_STATUS | < 0.1 |" >> $MARKDOWN_REPORT
echo "| Total Blocking Time (TBT) | $(echo "${{ steps.scores.outputs.desktop_tbt }} / 1" | bc)ms | $TBT_STATUS | < 200ms |" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Add Core Web Vitals section for mobile
echo "### Mobile" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Metric | Value | Status | Target |" >> $MARKDOWN_REPORT
echo "|--------|-------|--------|--------|" >> $MARKDOWN_REPORT

# Mobile LCP Status
if (( $(echo "${{ steps.scores.outputs.mobile_lcp }} < 2500" | bc -l) )); then
  LCP_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.mobile_lcp }} < 4000" | bc -l) )); then
  LCP_STATUS="🟠 Needs Improvement"
else
  LCP_STATUS="🔴 Poor"
fi

# Mobile CLS Status
if (( $(echo "${{ steps.scores.outputs.mobile_cls }} < 0.1" | bc -l) )); then
  CLS_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.mobile_cls }} < 0.25" | bc -l) )); then
  CLS_STATUS="🟠 Needs Improvement"
else
  CLS_STATUS="🔴 Poor"
fi

# Mobile TBT/FID Status
if (( $(echo "${{ steps.scores.outputs.mobile_tbt }} < 200" | bc -l) )); then
  TBT_STATUS="🟢 Good"
elif (( $(echo "${{ steps.scores.outputs.mobile_tbt }} < 600" | bc -l) )); then
  TBT_STATUS="🟠 Needs Improvement"
else
  TBT_STATUS="🔴 Poor"
fi

echo "| Largest Contentful Paint (LCP) | $(echo "${{ steps.scores.outputs.mobile_lcp }} / 1" | bc)ms | $LCP_STATUS | < 2.5s |" >> $MARKDOWN_REPORT
echo "| Cumulative Layout Shift (CLS) | ${{ steps.scores.outputs.mobile_cls }} | $CLS_STATUS | < 0.1 |" >> $MARKDOWN_REPORT
echo "| Total Blocking Time (TBT) | $(echo "${{ steps.scores.outputs.mobile_tbt }} / 1" | bc)ms | $TBT_STATUS | < 200ms |" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Add additional metrics sections for desktop and mobile
echo "## Additional Metrics" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "### Desktop" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Metric | Value |" >> $MARKDOWN_REPORT
echo "|--------|-------|" >> $MARKDOWN_REPORT
echo "| First Contentful Paint (FCP) | $(echo "${{ steps.scores.outputs.desktop_fcp }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Speed Index (SI) | $(echo "${{ steps.scores.outputs.desktop_si }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Time to Interactive (TTI) | $(echo "${{ steps.scores.outputs.desktop_tti }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Total Page Size | $(echo "${{ steps.scores.outputs.desktop_total_bytes }} / 1024 / 1024" | bc -l | xargs printf "%.2f")MB |" >> $MARKDOWN_REPORT
echo "| DOM Size | ${{ steps.scores.outputs.desktop_dom_size }} elements |" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

echo "### Mobile" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Metric | Value |" >> $MARKDOWN_REPORT
echo "|--------|-------|" >> $MARKDOWN_REPORT
echo "| First Contentful Paint (FCP) | $(echo "${{ steps.scores.outputs.mobile_fcp }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Speed Index (SI) | $(echo "${{ steps.scores.outputs.mobile_si }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Time to Interactive (TTI) | $(echo "${{ steps.scores.outputs.mobile_tti }} / 1" | bc)ms |" >> $MARKDOWN_REPORT
echo "| Total Page Size | $(echo "${{ steps.scores.outputs.mobile_total_bytes }} / 1024 / 1024" | bc -l | xargs printf "%.2f")MB |" >> $MARKDOWN_REPORT
echo "| DOM Size | ${{ steps.scores.outputs.mobile_dom_size }} elements |" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Add optimization opportunities section
echo "## Optimization Opportunities" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "### Desktop" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Issue | Impact |" >> $MARKDOWN_REPORT
echo "|-------|--------|" >> $MARKDOWN_REPORT
echo "| Render Blocking Resources | ${{ steps.scores.outputs.desktop_render_blocking }} resources |" >> $MARKDOWN_REPORT
if [ "${{ steps.scores.outputs.desktop_unused_css }}" -gt "0" ]; then
  echo "| Unused CSS | $(echo "${{ steps.scores.outputs.desktop_unused_css }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
if [ "${{ steps.scores.outputs.desktop_unused_js }}" -gt "0" ]; then
  echo "| Unused JavaScript | $(echo "${{ steps.scores.outputs.desktop_unused_js }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
if [ "${{ steps.scores.outputs.desktop_offscreen_images }}" -gt "0" ]; then
  echo "| Offscreen Images | $(echo "${{ steps.scores.outputs.desktop_offscreen_images }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
echo "" >> $MARKDOWN_REPORT

echo "### Mobile" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT
echo "| Issue | Impact |" >> $MARKDOWN_REPORT
echo "|-------|--------|" >> $MARKDOWN_REPORT
echo "| Render Blocking Resources | ${{ steps.scores.outputs.mobile_render_blocking }} resources |" >> $MARKDOWN_REPORT
if [ "${{ steps.scores.outputs.mobile_unused_css }}" -gt "0" ]; then
  echo "| Unused CSS | $(echo "${{ steps.scores.outputs.mobile_unused_css }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
if [ "${{ steps.scores.outputs.mobile_unused_js }}" -gt "0" ]; then
  echo "| Unused JavaScript | $(echo "${{ steps.scores.outputs.mobile_unused_js }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
if [ "${{ steps.scores.outputs.mobile_offscreen_images }}" -gt "0" ]; then
  echo "| Offscreen Images | $(echo "${{ steps.scores.outputs.mobile_offscreen_images }} / 1024" | bc)KB |" >> $MARKDOWN_REPORT
fi
echo "" >> $MARKDOWN_REPORT

# Add screenshots section
echo "## Page Screenshots" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Check if desktop screenshot exists
if [ -f "performance-reports/$CURRENT_DATE/$PAGE_NAME/assets/above-fold.png" ]; then
  echo "### Desktop" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
  echo "![Desktop Screenshot](./assets/above-fold.png)" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
else
  echo "### Desktop" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
  echo "Desktop screenshot not available." >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
fi

# Check if mobile screenshot exists
if [ -f "performance-reports/$CURRENT_DATE/$PAGE_NAME/assets/mobile-above-fold.png" ]; then
  echo "### Mobile" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
  echo "![Mobile Screenshot](./assets/mobile-above-fold.png)" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
else
  echo "### Mobile" >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
  echo "Mobile screenshot not available." >> $MARKDOWN_REPORT
  echo "" >> $MARKDOWN_REPORT
fi

# Add links to HTML reports
echo "## Detailed Reports" >> $MARKDOWN_REPORT
echo "" >> $MARKDOWN_REPORT

# Check if HTML reports exist
if [ -f "performance-reports/$CURRENT_DATE/$PAGE_NAME/desktop.html" ]; then
  echo "- [Desktop Lighthouse Report](./desktop.html)" >> $MARKDOWN_REPORT
else
  echo "- Desktop Lighthouse Report not available." >> $MARKDOWN_REPORT
fi

if [ -f "performance-reports/$CURRENT_DATE/$PAGE_NAME/mobile.html" ]; then
  echo "- [Mobile Lighthouse Report](./mobile.html)" >> $MARKDOWN_REPORT
else
  echo "- Mobile Lighthouse Report not available." >> $MARKDOWN_REPORT
fi

echo "Report saved to $MARKDOWN_REPORT"