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

# Function to create LCP value in seconds with proper formatting
format_lcp() {
  local lcp_value=$1
  # Format to 2 decimal places
  echo "$(echo "scale=2; $lcp_value/1000" | bc -l)"
}

# Format the desktop LCP value
DESKTOP_LCP_SEC=$(format_lcp $DESKTOP_LCP)
MOBILE_LCP_SEC=$(format_lcp $MOBILE_LCP)

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
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_PERF:=0 >= 90 ? 'score-good' : (DESKTOP_PERF >= 50 ? 'score-average' : 'score-poor')}">${DESKTOP_PERF:=0}</div>
          <div class="score-label">Performance</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_A11Y:=0 >= 90 ? 'score-good' : (DESKTOP_A11Y >= 70 ? 'score-average' : 'score-poor')}">${DESKTOP_A11Y:=0}</div>
          <div class="score-label">Accessibility</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_BP:=0 >= 90 ? 'score-good' : (DESKTOP_BP >= 70 ? 'score-average' : 'score-poor')}">${DESKTOP_BP:=0}</div>
          <div class="score-label">Best Practices</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${DESKTOP_SEO:=0 >= 90 ? 'score-good' : (DESKTOP_SEO >= 70 ? 'score-average' : 'score-poor')}">${DESKTOP_SEO:=0}</div>
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
              <div class="fs-2 fw-bold ${DESKTOP_LCP:=0 < 2500 ? 'metric-good' : (DESKTOP_LCP < 4000 ? 'metric-average' : 'metric-poor')}">${DESKTOP_LCP_SEC}s</div>
              <div class="mt-2"><small>Target: < 2.5s</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Total Blocking Time</h5>
              <div class="fs-2 fw-bold ${DESKTOP_TBT:=0 < 200 ? 'metric-good' : (DESKTOP_TBT < 600 ? 'metric-average' : 'metric-poor')}">${DESKTOP_TBT:=0}ms</div>
              <div class="mt-2"><small>Target: < 200ms</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Cumulative Layout Shift</h5>
              <div class="fs-2 fw-bold ${DESKTOP_CLS:=0 < 0.1 ? 'metric-good' : (DESKTOP_CLS < 0.25 ? 'metric-average' : 'metric-poor')}">${DESKTOP_CLS:=0}</div>
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
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_PERF:=0 >= 90 ? 'score-good' : (MOBILE_PERF >= 50 ? 'score-average' : 'score-poor')}">${MOBILE_PERF:=0}</div>
          <div class="score-label">Performance</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_A11Y:=0 >= 90 ? 'score-good' : (MOBILE_A11Y >= 70 ? 'score-average' : 'score-poor')}">${MOBILE_A11Y:=0}</div>
          <div class="score-label">Accessibility</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_BP:=0 >= 90 ? 'score-good' : (MOBILE_BP >= 70 ? 'score-average' : 'score-poor')}">${MOBILE_BP:=0}</div>
          <div class="score-label">Best Practices</div>
          <div class="mt-2"><small>Target: 90+</small></div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card score-card">
          <div class="score-value ${MOBILE_SEO:=0 >= 90 ? 'score-good' : (MOBILE_SEO >= 70 ? 'score-average' : 'score-poor')}">${MOBILE_SEO:=0}</div>
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
              <div class="fs-2 fw-bold ${MOBILE_LCP:=0 < 2500 ? 'metric-good' : (MOBILE_LCP < 4000 ? 'metric-average' : 'metric-poor')}">${MOBILE_LCP_SEC}s</div>
              <div class="mt-2"><small>Target: < 2.5s</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Total Blocking Time</h5>
              <div class="fs-2 fw-bold ${MOBILE_TBT:=0 < 200 ? 'metric-good' : (MOBILE_TBT < 600 ? 'metric-average' : 'metric-poor')}">${MOBILE_TBT:=0}ms</div>
              <div class="mt-2"><small>Target: < 200ms</small></div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h5>Cumulative Layout Shift</h5>
              <div class="fs-2 fw-bold ${MOBILE_CLS:=0 < 0.1 ? 'metric-good' : (MOBILE_CLS < 0.25 ? 'metric-average' : 'metric-poor')}">${MOBILE_CLS:=0}</div>
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