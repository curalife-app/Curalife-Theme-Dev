#!/bin/bash

# This script formats Lighthouse results for GitHub Actions step summary
# Usage: ./format-summary.sh [PAGE_NAME]

# Get parameters
PAGE_NAME=$1

# Exit if required parameters are missing
if [ -z "$PAGE_NAME" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./format-summary.sh [PAGE_NAME]"
  exit 1
fi

echo "## 🚦 Lighthouse Results for $PAGE_NAME" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY

# Helper function to get emoji based on score
function get_emoji() {
  local score=$1
  if (( $(echo "$score >= 90" | bc -l) )); then
    echo "🟢"
  elif (( $(echo "$score >= 75" | bc -l) )); then
    echo "🟠"
  else
    echo "🔴"
  fi
}

# Desktop results
if [ -n "$desktop_perf" ]; then
  echo "### 💻 Desktop" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "| Metric | Score | Core Web Vitals |" >> $GITHUB_STEP_SUMMARY
  echo "| ------ | ----- | --------------- |" >> $GITHUB_STEP_SUMMARY

  PERF_EMOJI=$(get_emoji $desktop_perf)
  A11Y_EMOJI=$(get_emoji $desktop_a11y)
  BP_EMOJI=$(get_emoji $desktop_bp)
  SEO_EMOJI=$(get_emoji $desktop_seo)

  LCP_MS=$(echo "$desktop_lcp / 1" | bc)
  FID_MS=$(echo "$desktop_fid / 1" | bc)
  CLS="$desktop_cls"

  # LCP status
  if (( $(echo "$LCP_MS < 2500" | bc -l) )); then
    LCP_STATUS="🟢"
  elif (( $(echo "$LCP_MS < 4000" | bc -l) )); then
    LCP_STATUS="🟠"
  else
    LCP_STATUS="🔴"
  fi

  # FID status
  if (( $(echo "$FID_MS < 100" | bc -l) )); then
    FID_STATUS="🟢"
  elif (( $(echo "$FID_MS < 300" | bc -l) )); then
    FID_STATUS="🟠"
  else
    FID_STATUS="🔴"
  fi

  # CLS status
  if (( $(echo "$CLS < 0.1" | bc -l) )); then
    CLS_STATUS="🟢"
  elif (( $(echo "$CLS < 0.25" | bc -l) )); then
    CLS_STATUS="🟠"
  else
    CLS_STATUS="🔴"
  fi

  echo "| ${PERF_EMOJI} Performance | $desktop_perf% | LCP: ${LCP_MS}ms ${LCP_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${A11Y_EMOJI} Accessibility | $desktop_a11y% | FID: ${FID_MS}ms ${FID_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${BP_EMOJI} Best Practices | $desktop_bp% | CLS: ${CLS} ${CLS_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${SEO_EMOJI} SEO | $desktop_seo% | |" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
fi

# Mobile results
if [ -n "$mobile_perf" ]; then
  echo "### 📱 Mobile" >> $GITHUB_STEP_SUMMARY
  echo "" >> $GITHUB_STEP_SUMMARY
  echo "| Metric | Score | Core Web Vitals |" >> $GITHUB_STEP_SUMMARY
  echo "| ------ | ----- | --------------- |" >> $GITHUB_STEP_SUMMARY

  PERF_EMOJI=$(get_emoji $mobile_perf)
  A11Y_EMOJI=$(get_emoji $mobile_a11y)
  BP_EMOJI=$(get_emoji $mobile_bp)
  SEO_EMOJI=$(get_emoji $mobile_seo)

  LCP_MS=$(echo "$mobile_lcp / 1" | bc)
  FID_MS=$(echo "$mobile_fid / 1" | bc)
  CLS="$mobile_cls"

  # LCP status
  if (( $(echo "$LCP_MS < 2500" | bc -l) )); then
    LCP_STATUS="🟢"
  elif (( $(echo "$LCP_MS < 4000" | bc -l) )); then
    LCP_STATUS="🟠"
  else
    LCP_STATUS="🔴"
  fi

  # FID status
  if (( $(echo "$FID_MS < 100" | bc -l) )); then
    FID_STATUS="🟢"
  elif (( $(echo "$FID_MS < 300" | bc -l) )); then
    FID_STATUS="🟠"
  else
    FID_STATUS="🔴"
  fi

  # CLS status
  if (( $(echo "$CLS < 0.1" | bc -l) )); then
    CLS_STATUS="🟢"
  elif (( $(echo "$CLS < 0.25" | bc -l) )); then
    CLS_STATUS="🟠"
  else
    CLS_STATUS="🔴"
  fi

  echo "| ${PERF_EMOJI} Performance | $mobile_perf% | LCP: ${LCP_MS}ms ${LCP_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${A11Y_EMOJI} Accessibility | $mobile_a11y% | FID: ${FID_MS}ms ${FID_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${BP_EMOJI} Best Practices | $mobile_bp% | CLS: ${CLS} ${CLS_STATUS} |" >> $GITHUB_STEP_SUMMARY
  echo "| ${SEO_EMOJI} SEO | $mobile_seo% | |" >> $GITHUB_STEP_SUMMARY
fi

echo "" >> $GITHUB_STEP_SUMMARY
echo "See attached artifacts for detailed reports." >> $GITHUB_STEP_SUMMARY