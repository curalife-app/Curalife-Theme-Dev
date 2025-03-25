#!/bin/bash
# This script generates HTML report templates for Lighthouse CI results
# Usage: ./generate-report-templates.sh [PAGE_NAME] [OUTPUT_DIR] [REPORT_DATE]

# Get parameters
PAGE_NAME=$1
OUTPUT_DIR=$2
REPORT_DATE=$3

# Exit if required parameters are missing
if [ -z "$PAGE_NAME" ] || [ -z "$OUTPUT_DIR" ] || [ -z "$REPORT_DATE" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: ./generate-report-templates.sh [PAGE_NAME] [OUTPUT_DIR] [REPORT_DATE]"
  exit 1
fi

# Ensure the output directory exists
mkdir -p "$OUTPUT_DIR"

# Load metrics from env file if it exists
METRICS_ENV_FILE="../../../performance-reports/$PAGE_NAME-details/metrics-values.env"
if [ -f "$METRICS_ENV_FILE" ]; then
  echo "Loading metrics from $METRICS_ENV_FILE"
  source "$METRICS_ENV_FILE"
else
  echo "Warning: Metrics file not found at $METRICS_ENV_FILE"
  # Set default values
  DESKTOP_PERF=0
  DESKTOP_A11Y=0
  DESKTOP_BP=0
  DESKTOP_SEO=0
  DESKTOP_LCP=0
  DESKTOP_FID=0
  DESKTOP_CLS=0
  DESKTOP_TBT=0

  MOBILE_PERF=0
  MOBILE_A11Y=0
  MOBILE_BP=0
  MOBILE_SEO=0
  MOBILE_LCP=0
  MOBILE_FID=0
  MOBILE_CLS=0
  MOBILE_TBT=0
fi

# Check for placeholder values (42 or 50 for desktop, 24 or 40 for mobile)
IS_DESKTOP_PLACEHOLDER=false
IS_MOBILE_PLACEHOLDER=false

# Check for explicit placeholder values (42)
if [ "$DESKTOP_PERF" = "42" ] || [ "$DESKTOP_A11Y" = "42" ] || [ "$DESKTOP_BP" = "42" ] || [ "$DESKTOP_SEO" = "42" ]; then
  IS_DESKTOP_PLACEHOLDER=true
  echo "WARNING: Desktop report contains placeholder values (42). It will be marked as placeholder data."
fi

# Check for fixed values (all 50s)
if [ "$DESKTOP_PERF" = "50" ] && [ "$DESKTOP_A11Y" = "50" ] && [ "$DESKTOP_BP" = "50" ] && [ "$DESKTOP_SEO" = "50" ]; then
  IS_DESKTOP_PLACEHOLDER=true
  echo "WARNING: Desktop report contains fixed placeholder values (all 50s). It will be marked as placeholder data."
fi

# Check for explicit placeholder values (24)
if [ "$MOBILE_PERF" = "24" ] || [ "$MOBILE_A11Y" = "24" ] || [ "$MOBILE_BP" = "24" ] || [ "$MOBILE_SEO" = "24" ]; then
  IS_MOBILE_PLACEHOLDER=true
  echo "WARNING: Mobile report contains placeholder values (24). It will be marked as placeholder data."
fi

# Check for fixed values (performance=40, others=50)
if [ "$MOBILE_PERF" = "40" ] && [ "$MOBILE_A11Y" = "50" ] && [ "$MOBILE_BP" = "50" ] && [ "$MOBILE_SEO" = "50" ]; then
  IS_MOBILE_PLACEHOLDER=true
  echo "WARNING: Mobile report contains fixed placeholder values (40/50). It will be marked as placeholder data."
fi

# Function to create LCP value in seconds with proper formatting
format_lcp() {
  local lcp_value=$1
  # Format to 2 decimal places
  echo "$(echo "scale=2; $lcp_value/1000" | bc -l)"
}

# Format the desktop LCP value
DESKTOP_LCP_SEC=$(format_lcp $DESKTOP_LCP)
MOBILE_LCP_SEC=$(format_lcp $MOBILE_LCP)

# Pre-calculate CSS classes based on scores for desktop
if [ "${DESKTOP_PERF:=0}" -ge 90 ]; then
  DESKTOP_PERF_CLASS="score-good"
elif [ "${DESKTOP_PERF:=0}" -ge 50 ]; then
  DESKTOP_PERF_CLASS="score-average"
else
  DESKTOP_PERF_CLASS="score-poor"
fi

if [ "${DESKTOP_A11Y:=0}" -ge 90 ]; then
  DESKTOP_A11Y_CLASS="score-good"
elif [ "${DESKTOP_A11Y:=0}" -ge 70 ]; then
  DESKTOP_A11Y_CLASS="score-average"
else
  DESKTOP_A11Y_CLASS="score-poor"
fi

if [ "${DESKTOP_BP:=0}" -ge 90 ]; then
  DESKTOP_BP_CLASS="score-good"
elif [ "${DESKTOP_BP:=0}" -ge 70 ]; then
  DESKTOP_BP_CLASS="score-average"
else
  DESKTOP_BP_CLASS="score-poor"
fi

if [ "${DESKTOP_SEO:=0}" -ge 90 ]; then
  DESKTOP_SEO_CLASS="score-good"
elif [ "${DESKTOP_SEO:=0}" -ge 70 ]; then
  DESKTOP_SEO_CLASS="score-average"
else
  DESKTOP_SEO_CLASS="score-poor"
fi

# Pre-calculate CWV classes for desktop
if [ $(echo "${DESKTOP_LCP:=0} < 2500" | bc -l) -eq 1 ]; then
  DESKTOP_LCP_CLASS="metric-good"
elif [ $(echo "${DESKTOP_LCP:=0} < 4000" | bc -l) -eq 1 ]; then
  DESKTOP_LCP_CLASS="metric-average"
else
  DESKTOP_LCP_CLASS="metric-poor"
fi

if [ "${DESKTOP_TBT:=0}" -lt 200 ]; then
  DESKTOP_TBT_CLASS="metric-good"
elif [ "${DESKTOP_TBT:=0}" -lt 600 ]; then
  DESKTOP_TBT_CLASS="metric-average"
else
  DESKTOP_TBT_CLASS="metric-poor"
fi

if [ $(echo "${DESKTOP_CLS:=0} < 0.1" | bc -l) -eq 1 ]; then
  DESKTOP_CLS_CLASS="metric-good"
elif [ $(echo "${DESKTOP_CLS:=0} < 0.25" | bc -l) -eq 1 ]; then
  DESKTOP_CLS_CLASS="metric-average"
else
  DESKTOP_CLS_CLASS="metric-poor"
fi

# Pre-calculate CSS classes based on scores for mobile
if [ "${MOBILE_PERF:=0}" -ge 90 ]; then
  MOBILE_PERF_CLASS="score-good"
elif [ "${MOBILE_PERF:=0}" -ge 50 ]; then
  MOBILE_PERF_CLASS="score-average"
else
  MOBILE_PERF_CLASS="score-poor"
fi

if [ "${MOBILE_A11Y:=0}" -ge 90 ]; then
  MOBILE_A11Y_CLASS="score-good"
elif [ "${MOBILE_A11Y:=0}" -ge 70 ]; then
  MOBILE_A11Y_CLASS="score-average"
else
  MOBILE_A11Y_CLASS="score-poor"
fi

if [ "${MOBILE_BP:=0}" -ge 90 ]; then
  MOBILE_BP_CLASS="score-good"
elif [ "${MOBILE_BP:=0}" -ge 70 ]; then
  MOBILE_BP_CLASS="score-average"
else
  MOBILE_BP_CLASS="score-poor"
fi

if [ "${MOBILE_SEO:=0}" -ge 90 ]; then
  MOBILE_SEO_CLASS="score-good"
elif [ "${MOBILE_SEO:=0}" -ge 70 ]; then
  MOBILE_SEO_CLASS="score-average"
else
  MOBILE_SEO_CLASS="score-poor"
fi

# Pre-calculate CWV classes for mobile
if [ $(echo "${MOBILE_LCP:=0} < 2500" | bc -l) -eq 1 ]; then
  MOBILE_LCP_CLASS="metric-good"
elif [ $(echo "${MOBILE_LCP:=0} < 4000" | bc -l) -eq 1 ]; then
  MOBILE_LCP_CLASS="metric-average"
else
  MOBILE_LCP_CLASS="metric-poor"
fi

if [ "${MOBILE_TBT:=0}" -lt 200 ]; then
  MOBILE_TBT_CLASS="metric-good"
elif [ "${MOBILE_TBT:=0}" -lt 600 ]; then
  MOBILE_TBT_CLASS="metric-average"
else
  MOBILE_TBT_CLASS="metric-poor"
fi

if [ $(echo "${MOBILE_CLS:=0} < 0.1" | bc -l) -eq 1 ]; then
  MOBILE_CLS_CLASS="metric-good"
elif [ $(echo "${MOBILE_CLS:=0} < 0.25" | bc -l) -eq 1 ]; then
  MOBILE_CLS_CLASS="metric-average"
else
  MOBILE_CLS_CLASS="metric-poor"
fi

# Prepare placeholder warning HTML
if [ "$IS_DESKTOP_PLACEHOLDER" = true ]; then
  DESKTOP_PLACEHOLDER_WARNING='
    <div class="placeholder-warning mb-4">
      <h4><i class="bi bi-exclamation-triangle-fill me-2"></i>Placeholder Data Warning</h4>
      <p>This report contains <strong>placeholder data</strong>, not actual Lighthouse test results. The test either failed to run or the results could not be processed correctly.</p>
      <p>All values shown here are placeholders and do not represent real performance metrics.</p>
    </div>
  '
else
  DESKTOP_PLACEHOLDER_WARNING=""
fi

if [ "$IS_MOBILE_PLACEHOLDER" = true ]; then
  MOBILE_PLACEHOLDER_WARNING='
    <div class="placeholder-warning mb-4">
      <h4><i class="bi bi-exclamation-triangle-fill me-2"></i>Placeholder Data Warning</h4>
      <p>This report contains <strong>placeholder data</strong>, not actual Lighthouse test results. The test either failed to run or the results could not be processed correctly.</p>
      <p>All values shown here are placeholders and do not represent real performance metrics.</p>
    </div>
  '
else
  MOBILE_PLACEHOLDER_WARNING=""
fi

# Create desktop.html template
DESKTOP_HTML="${OUTPUT_DIR}/desktop.html"
echo "Creating desktop.html report at $DESKTOP_HTML"

# Create HTML file structure
cat > "$DESKTOP_HTML" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PAGE_NAME} - Desktop Performance Report | Curalife</title>
  <link rel="icon" href="https://cdn.shopify.com/s/files/1/0016/8633/0243/files/favicon-32x32.png?v=1618828796" type="image/png">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <style>
    :root {
      --primary-color: #00837b;
      --primary-light: #e6f7f5;
      --secondary-color: #f26b3c;
      --dark-color: #2c3e50;
      --good: #0CCE6B;
      --average: #FFA400;
      --poor: #FF4E42;
      --background: #f8f9fa;
    }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      background-color: var(--background);
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 1.5rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: transform 0.3s, box-shadow 0.3s;
      border: none;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .score-card {
      text-align: center;
      padding: 1.5rem;
    }
    .score-value {
      font-size: 3rem;
      font-weight: bold;
      position: relative;
      display: inline-block;
      width: 100px;
      height: 100px;
      line-height: 100px;
      border-radius: 50%;
      color: white;
      margin-bottom: 15px;
    }
    .score-good { background-color: var(--good); }
    .score-average { background-color: var(--average); }
    .score-poor { background-color: var(--poor); }
    .score-label {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--dark-color);
    }
    .metric-good { color: var(--good); }
    .metric-average { color: var(--average); }
    .metric-poor { color: var(--poor); }
    .section-title {
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 15px;
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 10px;
    }
    .placeholder-warning {
      background-color: #fff3cd;
      color: #856404;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1><i class="bi bi-laptop me-2"></i>${PAGE_NAME} - Desktop Report</h1>
      <p class="mb-0">Test run on ${REPORT_DATE}</p>
    </div>
    <div>
      <a href="../../../index.html" class="btn btn-outline-light"><i class="bi bi-arrow-left me-2"></i>Back to Dashboard</a>
    </div>
  </div>

  <div class="container-fluid p-0">
    ${DESKTOP_PLACEHOLDER_WARNING}

    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_PERF_CLASS}">${DESKTOP_PERF}</div>
          <div class="score-label">Performance</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_A11Y_CLASS}">${DESKTOP_A11Y}</div>
          <div class="score-label">Accessibility</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_BP_CLASS}">${DESKTOP_BP}</div>
          <div class="score-label">Best Practices</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_SEO_CLASS}">${DESKTOP_SEO}</div>
          <div class="score-label">SEO</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <h3 class="section-title"><i class="bi bi-speedometer2 me-2"></i>Core Web Vitals</h3>
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Largest Contentful Paint</h5>
              <div class="fs-2 fw-bold ${DESKTOP_LCP_CLASS}">${DESKTOP_LCP_SEC}s</div>
              <div class="mt-2"><small>Target: < 2.5s</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Total Blocking Time</h5>
              <div class="fs-2 fw-bold ${DESKTOP_TBT_CLASS}">${DESKTOP_TBT}ms</div>
              <div class="mt-2"><small>Target: < 200ms</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Cumulative Layout Shift</h5>
              <div class="fs-2 fw-bold ${DESKTOP_CLS_CLASS}">${DESKTOP_CLS}</div>
              <div class="mt-2"><small>Target: < 0.1</small></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-4 mb-4">
      <a href="../../../index.html" class="btn btn-primary"><i class="bi bi-speedometer2 me-2"></i>Back to Main Dashboard</a>
    </div>
  </div>

  <footer class="text-center text-muted mt-4">
    <p><small>Generated on ${REPORT_DATE} by Lighthouse CI GitHub Action</small></p>
  </footer>
</body>
</html>
EOF

# Create mobile.html template with similar changes
MOBILE_HTML="${OUTPUT_DIR}/mobile.html"
echo "Creating mobile.html report at $MOBILE_HTML"

# Create HTML file structure
cat > "$MOBILE_HTML" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PAGE_NAME} - Mobile Performance Report | Curalife</title>
  <link rel="icon" href="https://cdn.shopify.com/s/files/1/0016/8633/0243/files/favicon-32x32.png?v=1618828796" type="image/png">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <style>
    :root {
      --primary-color: #00837b;
      --primary-light: #e6f7f5;
      --secondary-color: #f26b3c;
      --dark-color: #2c3e50;
      --good: #0CCE6B;
      --average: #FFA400;
      --poor: #FF4E42;
      --background: #f8f9fa;
    }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      background-color: var(--background);
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: white;
      padding: 1.5rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      transition: transform 0.3s, box-shadow 0.3s;
      border: none;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .score-card {
      text-align: center;
      padding: 1.5rem;
    }
    .score-value {
      font-size: 3rem;
      font-weight: bold;
      position: relative;
      display: inline-block;
      width: 100px;
      height: 100px;
      line-height: 100px;
      border-radius: 50%;
      color: white;
      margin-bottom: 15px;
    }
    .score-good { background-color: var(--good); }
    .score-average { background-color: var(--average); }
    .score-poor { background-color: var(--poor); }
    .score-label {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--dark-color);
    }
    .metric-good { color: var(--good); }
    .metric-average { color: var(--average); }
    .metric-poor { color: var(--poor); }
    .section-title {
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 15px;
      border-bottom: 2px solid var(--primary-light);
      padding-bottom: 10px;
    }
    .placeholder-warning {
      background-color: #fff3cd;
      color: #856404;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1><i class="bi bi-phone me-2"></i>${PAGE_NAME} - Mobile Report</h1>
      <p class="mb-0">Test run on ${REPORT_DATE}</p>
    </div>
    <div>
      <a href="../../../index.html" class="btn btn-outline-light"><i class="bi bi-arrow-left me-2"></i>Back to Dashboard</a>
    </div>
  </div>

  <div class="container-fluid p-0">
    ${MOBILE_PLACEHOLDER_WARNING}

    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_PERF_CLASS}">${MOBILE_PERF}</div>
          <div class="score-label">Performance</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_A11Y_CLASS}">${MOBILE_A11Y}</div>
          <div class="score-label">Accessibility</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_BP_CLASS}">${MOBILE_BP}</div>
          <div class="score-label">Best Practices</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_SEO_CLASS}">${MOBILE_SEO}</div>
          <div class="score-label">SEO</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <h3 class="section-title"><i class="bi bi-speedometer2 me-2"></i>Core Web Vitals</h3>
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Largest Contentful Paint</h5>
              <div class="fs-2 fw-bold ${MOBILE_LCP_CLASS}">${MOBILE_LCP_SEC}s</div>
              <div class="mt-2"><small>Target: < 2.5s</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Total Blocking Time</h5>
              <div class="fs-2 fw-bold ${MOBILE_TBT_CLASS}">${MOBILE_TBT}ms</div>
              <div class="mt-2"><small>Target: < 200ms</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Cumulative Layout Shift</h5>
              <div class="fs-2 fw-bold ${MOBILE_CLS_CLASS}">${MOBILE_CLS}</div>
              <div class="mt-2"><small>Target: < 0.1</small></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-4 mb-4">
      <a href="../../../index.html" class="btn btn-primary"><i class="bi bi-speedometer2 me-2"></i>Back to Main Dashboard</a>
    </div>
  </div>

  <footer class="text-center text-muted mt-4">
    <p><small>Generated on ${REPORT_DATE} by Lighthouse CI GitHub Action</small></p>
  </footer>
</body>
</html>
EOF

echo "Created HTML report templates at $OUTPUT_DIR:"
ls -la "$OUTPUT_DIR/"