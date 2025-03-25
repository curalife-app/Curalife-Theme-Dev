#!/bin/bash
set -e

# This script generates an HTML dashboard with trend charts for Lighthouse metrics
# It uses historical data collected from previous runs

CURRENT_DATE=$1
HISTORY_DIR="performance-reports/history"
OUTPUT_DIR="performance-reports"

# Ensure directories exist
mkdir -p "$HISTORY_DIR"
mkdir -p "$OUTPUT_DIR"

# Check if historical data exists
if [ ! -f "$HISTORY_DIR/historical-data.json" ]; then
  echo "No historical data found. Creating an empty dashboard."
  cat > "$OUTPUT_DIR/trends.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Performance Trends | Curalife</title>
    <link rel="icon" href="https://cdn.shopify.com/s/files/1/0016/8633/0243/files/favicon-32x32.png?v=1618828796" type="image/png">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        :root {
            --primary-color: #00837b;
            --primary-light: #e6f7f5;
            --secondary-color: #f26b3c;
            --dark-color: #2c3e50;
            --background: #f8f9fa;
            --card-bg: #ffffff;
            --text-color: #333333;
            --border-radius: 10px;
            --shadow: 0 4px 12px rgba(0,0,0,0.1);
            --good: #0CCE6B;
            --average: #FFA400;
            --poor: #FF4E42;
        }
        body {
            font-family: "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background);
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .dashboard-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 2rem;
            border-radius: var(--border-radius);
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .dashboard-title {
            margin: 0;
            font-weight: 600;
        }
        .card {
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            border: none;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-bottom: 1.5rem;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .empty-state {
            text-align: center;
            padding: 3rem 2rem;
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
        }
        .empty-state-icon {
            font-size: 4rem;
            color: var(--secondary-color);
            margin-bottom: 1.5rem;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 0.8; transform: scale(1); }
        }
        .empty-state-title {
            color: var(--dark-color);
            font-weight: 600;
            margin-bottom: 1rem;
        }
        .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            padding: 0.5rem 1.5rem;
            border-radius: 30px;
            transition: all 0.2s;
        }
        .btn-primary:hover {
            background-color: #006d66;
            border-color: #006d66;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .trend-info-card {
            border-left: 4px solid var(--primary-color);
            background-color: var(--primary-light);
            padding: 1.5rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
        }
        .trend-info-title {
            color: var(--primary-color);
            font-weight: 600;
            margin-bottom: 1rem;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 2rem;
        }
        .info-card {
            background-color: var(--card-bg);
            border-radius: var(--border-radius);
            padding: 1.5rem;
            box-shadow: var(--shadow);
        }
        .info-card .icon {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: var(--primary-color);
        }
        .info-card h4 {
            color: var(--dark-color);
            font-weight: 600;
            margin-bottom: 0.75rem;
        }
        .next-run {
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: var(--border-radius);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow);
            margin-top: 2rem;
            display: inline-block;
        }
        .footer {
            margin-top: 3rem;
            padding: 1.5rem 0;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
            border-top: 1px solid #dee2e6;
        }
        @media (max-width: 768px) {
            .dashboard-header {
                flex-direction: column;
                text-align: center;
            }
            .dashboard-header .btn {
                margin-top: 1rem;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard-header">
        <div>
            <h1 class="dashboard-title"><i class="bi bi-graph-up-arrow me-3"></i>Performance Trends Dashboard</h1>
            <p class="mb-0 mt-2">Historical performance tracking for Curalife.com</p>
        </div>
        <div>
            <a href="index.html" class="btn btn-outline-light">
                <i class="bi bi-speedometer2 me-2"></i>Back to Dashboard
            </a>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-body">
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="bi bi-clock-history"></i>
                </div>
                <h2 class="empty-state-title">Building Performance History</h2>
                <p class="lead mb-4">The performance trends dashboard is currently collecting data and will be available after multiple test runs have been completed.</p>
                <div class="next-run">
                    <i class="bi bi-calendar-check me-2"></i>Next scheduled run: <strong>Daily at 8:00 AM and 6:00 PM</strong>
                </div>
            </div>
        </div>
    </div>

    <div class="trend-info-card">
        <h3 class="trend-info-title"><i class="bi bi-info-circle me-2"></i>About Performance Trends</h3>
        <p>The trends dashboard provides valuable insights about your website's performance over time, helping you:</p>
        <ul>
            <li>Track improvements and regressions</li>
            <li>Identify patterns in performance metrics</li>
            <li>Monitor the impact of website changes</li>
            <li>Ensure consistent user experience across key pages</li>
        </ul>
    </div>

    <div class="info-grid">
        <div class="info-card">
            <div class="icon"><i class="bi bi-speedometer2"></i></div>
            <h4>Core Web Vitals Tracking</h4>
            <p>Once data is collected, this dashboard will display trends for LCP, CLS, and TBT/FID metrics over time, helping you understand how changes affect real user experiences.</p>
        </div>
        <div class="info-card">
            <div class="icon"><i class="bi bi-bar-chart-line"></i></div>
            <h4>Performance Score Analysis</h4>
            <p>Track overall Lighthouse performance scores to understand how your site compares to Google's performance standards and benchmarks.</p>
        </div>
        <div class="info-card">
            <div class="icon"><i class="bi bi-phone"></i></div>
            <h4>Device Comparison</h4>
            <p>Compare mobile vs. desktop performance trends to identify device-specific issues and optimization opportunities.</p>
        </div>
    </div>

    <footer class="footer">
        <div class="container">
            <p>Generated by Lighthouse CI GitHub Action on ${CURRENT_DATE}</p>
        </div>
    </footer>
</body>
</html>
EOF
  echo "Empty trends dashboard created."
  exit 0
fi

# Find all page history files
PAGE_HISTORY_FILES=$(find "$HISTORY_DIR" -name "*-history.json")

# Generate the trends dashboard HTML
cat > "$OUTPUT_DIR/trends.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Performance Trends</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-moment@1.0.0/dist/chartjs-adapter-moment.min.js"></script>
    <style>
        :root {
            --primary-color: #4285f4;
            --secondary-color: #34a853;
            --accent-color: #ea4335;
            --warning-color: #fbbc05;
            --light-gray: #f8f9fa;
            --dark-gray: #343a40;

            --performance-color: #0CCE6B;
            --accessibility-color: #0D96F2;
            --best-practices-color: #928FFF;
            --seo-color: #FF8C00;

            --lcp-color: #0CCE6B;
            --cls-color: #FF4E42;
            --tbt-color: #FFA400;
            --fid-color: #FF8C00;

            --good: #0CCE6B;
            --average: #FFA400;
            --poor: #FF4E42;
        }
        body {
            font-family: "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: var(--light-gray);
        }
        .page-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .dashboard-header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            position: relative;
        }
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 1.5rem;
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .card-header {
            background-color: rgba(0,0,0,0.03);
            border-bottom: none;
            font-weight: 600;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 2rem;
        }
        .trend-card {
            text-align: center;
            padding: 1.5rem;
            border-radius: 10px;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .trend-value {
            font-size: 1.8rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }
        .trend-change {
            display: inline-flex;
            align-items: center;
            font-weight: 500;
            padding: 0.3rem 0.8rem;
            border-radius: 30px;
            font-size: 0.85rem;
        }
        .trend-up {
            background-color: rgba(52, 168, 83, 0.15);
            color: #34a853;
        }
        .trend-down {
            background-color: rgba(234, 67, 53, 0.15);
            color: #ea4335;
        }
        .trend-neutral {
            background-color: rgba(251, 188, 5, 0.15);
            color: #fbbc05;
        }
        .chart-container {
            height: 350px;
            margin-bottom: 2rem;
            position: relative;
        }
        .nav-tabs .nav-link {
            font-weight: 500;
            color: #555;
            padding: 0.75rem 1.25rem;
        }
        .nav-tabs .nav-link.active {
            font-weight: 600;
            color: var(--primary-color);
            border-bottom: 3px solid var(--primary-color);
        }
        .tab-content {
            padding: 1.5rem;
        }
        .date-filter {
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
        }
        .page-selector {
            padding: 0.5rem 1rem;
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            font-size: 0.9rem;
        }
        .insights-container {
            padding: 1.5rem;
            background-color: white;
            border-radius: 10px;
            margin-bottom: 2rem;
        }
        .insight-card {
            border-left: 4px solid var(--primary-color);
            padding: 1rem;
            margin-bottom: 1rem;
            background-color: rgba(66, 133, 244, 0.05);
            border-radius: 5px;
        }
        .target-line {
            background-color: rgba(234, 67, 53, 0.2);
            padding: 0.5rem;
            border-radius: 5px;
            margin-bottom: 1rem;
            text-align: center;
            font-weight: 500;
        }
        .footer {
            margin-top: 3rem;
            padding: 1.5rem 0;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="dashboard-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <i class="bi bi-graph-up-arrow fs-1 me-3"></i>
                <div>
                    <h1 class="mb-0">Performance Trends Dashboard</h1>
                    <p class="mb-0 mt-2">Historical performance tracking for Curalife.com</p>
                </div>
            </div>
            <div>
                <p class="mb-0">Last updated: <span id="lastUpdatedDate">${CURRENT_DATE}</span></p>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Performance Score Trends</h5>
                        <div>
                            <select id="timeRangeSelector" class="date-filter me-2">
                                <option value="7">Last 7 days</option>
                                <option value="30" selected>Last 30 days</option>
                                <option value="60">Last 60 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="all">All time</option>
                            </select>
                            <select id="pageSelector" class="page-selector">
                                <option value="all">All Pages</option>
                                <!-- Page options will be added dynamically -->
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="performanceTrendChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="mb-0">Quick Stats</h5>
                    </div>
                    <div class="card-body">
                        <div id="summaryStats">
                            <!-- Trend stats will be added dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header">
                <ul class="nav nav-tabs card-header-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="desktop-tab" data-bs-toggle="tab" data-bs-target="#desktop-panel" type="button" role="tab">Desktop Metrics</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="mobile-tab" data-bs-toggle="tab" data-bs-target="#mobile-panel" type="button" role="tab">Mobile Metrics</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="comparison-tab" data-bs-toggle="tab" data-bs-target="#comparison-panel" type="button" role="tab">Desktop vs. Mobile</button>
                    </li>
                </ul>
            </div>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="desktop-panel" role="tabpanel">
                    <h5 class="mb-3">Core Web Vitals - Desktop</h5>
                    <div class="target-line">Target: LCP < 2.5s | CLS < 0.1 | TBT < 200ms</div>
                    <div class="row">
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Largest Contentful Paint (LCP)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="desktopLCPChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Cumulative Layout Shift (CLS)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="desktopCLSChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Total Blocking Time (TBT)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="desktopTBTChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">First Contentful Paint (FCP)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="desktopFCPChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="mobile-panel" role="tabpanel">
                    <h5 class="mb-3">Core Web Vitals - Mobile</h5>
                    <div class="target-line">Target: LCP < 2.5s | CLS < 0.1 | TBT < 200ms</div>
                    <div class="row">
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Largest Contentful Paint (LCP)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="mobileLCPChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Cumulative Layout Shift (CLS)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="mobileCLSChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Total Blocking Time (TBT)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="mobileTBTChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">First Contentful Paint (FCP)</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="mobileFCPChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="comparison-panel" role="tabpanel">
                    <h5 class="mb-3">Desktop vs. Mobile Comparison</h5>
                    <div class="row">
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Performance Score</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="performanceComparisonChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h6 class="mb-0">Largest Contentful Paint</h6>
                                </div>
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="lcpComparisonChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">Performance Insights</h5>
            </div>
            <div class="card-body">
                <div id="insights-container">
                    <div class="insight-card">
                        <h5><i class="bi bi-lightbulb me-2"></i> Performance Trend Analysis</h5>
                        <p>Automatic trend analysis will identify performance patterns, regressions, and improvements based on collected data over time.</p>
                    </div>
                    <div class="insight-card">
                        <h5><i class="bi bi-graph-up me-2"></i> Optimization Opportunities</h5>
                        <p>The system will detect patterns in metrics to suggest the most impactful optimization opportunities for your site.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="text-center mt-4 mb-5">
            <a href="index.html" class="btn btn-primary">
                <i class="bi bi-speedometer2 me-2"></i>Back to Dashboard
            </a>
        </div>
    </div>

    <footer class="footer">
        <div class="container">
            <p>Generated by Lighthouse CI GitHub Action</p>
        </div>
    </footer>

    <script>
        // Historical data from JSON files
        const historicalData = {
EOF

# Embed each page's historical data as JavaScript variables
for history_file in $PAGE_HISTORY_FILES; do
  page_name=$(basename "$history_file" | sed 's/-history.json//')
  echo "            '$page_name': $(cat "$history_file")," >> "$OUTPUT_DIR/trends.html"
done

# Continue the HTML template
cat >> "$OUTPUT_DIR/trends.html" << 'EOF'
        };

        // Global chart objects
        const charts = {};

        // Colors for different pages
        const pageColors = [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
        ];

        // Utility functions
        function formatDate(dateStr) {
            return moment(dateStr).format('MMM D');
        }

        function formatScore(score) {
            return parseInt(score);
        }

        function calculateChange(currentScore, previousScore) {
            if (!previousScore) return { value: 0, trend: 'neutral' };
            const change = currentScore - previousScore;
            return {
                value: change.toFixed(1),
                trend: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
            };
        }

        // Initialize dashboard
        function initDashboard() {
            createSummaryCards();
            createAllCharts();
        }

        // Create summary cards for latest scores
        function createSummaryCards() {
            const summaryContainer = document.getElementById('summary');
            summaryContainer.innerHTML = '';

            const deviceType = document.getElementById('desktopContent').classList.contains('active') ? 'desktop' : 'mobile';

            Object.keys(historicalData).forEach((page, index) => {
                const pageData = historicalData[page].data;
                if (!pageData || pageData.length === 0) return;

                const latestData = pageData[0];
                const previousData = pageData.length > 1 ? pageData[1] : null;

                const performance = latestData[deviceType].performance;
                const previousPerformance = previousData ? previousData[deviceType].performance : null;
                const change = calculateChange(performance, previousPerformance);

                const card = document.createElement('div');
                card.className = 'summary-card';
                card.innerHTML = `
                    <h3>${page}</h3>
                    <div class="score">${formatScore(performance)}</div>
                    <div class="score-change ${change.trend === 'positive' ? 'positive-change' : change.trend === 'negative' ? 'negative-change' : ''}">
                        ${change.value > 0 ? '+' : ''}${change.value}
                        <span class="trend-indicator">${change.trend === 'positive' ? '↑' : change.trend === 'negative' ? '↓' : '→'}</span>
                    </div>
                `;
                summaryContainer.appendChild(card);
            });
        }

        // Update charts based on time range
        function updateCharts() {
            const timeRange = parseInt(document.getElementById('timeRange').value);

            Object.keys(historicalData).forEach(page => {
                let filteredData;

                if (timeRange === 'all' || isNaN(timeRange)) {
                    filteredData = historicalData[page].data;
                } else {
                    const cutoffDate = moment().subtract(timeRange, 'days');
                    filteredData = historicalData[page].data.filter(item =>
                        moment(item.date).isAfter(cutoffDate)
                    );
                }

                // Reverse to get chronological order
                filteredData = filteredData.slice().reverse();

                updatePageCharts(page, filteredData);
            });

            createSummaryCards();
        }

        // Tab switching
        function switchTab(tabName) {
            // Update tab status
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Activate selected tab
            event.target.classList.add('active');
            document.getElementById(tabName + 'Content').classList.add('active');

            // Recreate charts for the active tab
            createSummaryCards();
        }

        // Create all charts
        function createAllCharts() {
            createPerformanceCharts();
            createCoreWebVitalsCharts();
        }

        // Create performance score charts
        function createPerformanceCharts() {
            createMultiLineChart('desktopPerformanceChart', 'Performance Score - Desktop', 'performance', 'desktop');
            createMultiLineChart('mobilePerformanceChart', 'Performance Score - Mobile', 'performance', 'mobile');
        }

        // Create Core Web Vitals charts
        function createCoreWebVitalsCharts() {
            // Desktop
            createMultiLineChart('desktopLCPChart', 'Largest Contentful Paint - Desktop', 'lcp', 'desktop', true, false, [2500, 4000]);
            createMultiLineChart('desktopCLSChart', 'Cumulative Layout Shift - Desktop', 'cls', 'desktop', false, false, [0.1, 0.25]);
            createMultiLineChart('desktopTBTChart', 'Total Blocking Time - Desktop', 'tbt', 'desktop', true, false, [200, 600]);

            // Mobile
            createMultiLineChart('mobileLCPChart', 'Largest Contentful Paint - Mobile', 'lcp', 'mobile', true, false, [2500, 4000]);
            createMultiLineChart('mobileCLSChart', 'Cumulative Layout Shift - Mobile', 'cls', 'mobile', false, false, [0.1, 0.25]);
            createMultiLineChart('mobileTBTChart', 'Total Blocking Time - Mobile', 'tbt', 'mobile', true, false, [200, 600]);
        }

        // Create a multi-line chart
        function createMultiLineChart(canvasId, title, metric, deviceType, convertToSeconds = false, inverse = false, thresholds = null) {
            const ctx = document.getElementById(canvasId).getContext('2d');

            // Prepare datasets
            const datasets = [];
            Object.keys(historicalData).forEach((page, index) => {
                const color = pageColors[index % pageColors.length];
                const pageData = historicalData[page].data.slice().reverse(); // Use chronological order

                if (!pageData || pageData.length === 0) return;

                const data = pageData.map(item => {
                    let value = item[deviceType][metric];
                    if (convertToSeconds) value = value / 1000;
                    return value;
                });

                datasets.push({
                    label: page,
                    data: data,
                    backgroundColor: color.replace('1)', '0.1)'),
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.2
                });
            });

            // Prepare labels (dates)
            const labels = [];
            if (historicalData[Object.keys(historicalData)[0]]) {
                const firstPageData = historicalData[Object.keys(historicalData)[0]].data.slice().reverse();
                labels.push(...firstPageData.map(item => formatDate(item.date)));
            }

            // Create annotation lines for thresholds if provided
            let annotations = {};
            if (thresholds) {
                annotations = {
                    goodThreshold: {
                        type: 'line',
                        yMin: thresholds[0],
                        yMax: thresholds[0],
                        borderColor: 'rgba(75, 192, 92, 0.5)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: 'Good',
                            position: 'start'
                        }
                    },
                    poorThreshold: {
                        type: 'line',
                        yMin: thresholds[1],
                        yMax: thresholds[1],
                        borderColor: 'rgba(255, 99, 132, 0.5)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            enabled: true,
                            content: 'Poor',
                            position: 'start'
                        }
                    }
                };
            }

            // Chart configuration
            if (charts[canvasId]) {
                charts[canvasId].destroy();
            }

            charts[canvasId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'bottom'
                        },
                        annotation: {
                            annotations: annotations
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: metric === 'cls',
                            title: {
                                display: true,
                                text: convertToSeconds ? 'Seconds' : (metric === 'performance' ? 'Score' : 'Value')
                            },
                            reverse: inverse
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        }

        // Update charts for a specific page
        function updatePageCharts(page, filteredData) {
            // Implementation for updating specific page charts would go here
            // This is simplified for now - we're just recreating all charts
            createAllCharts();
        }

        // Initialize dashboard on page load
        document.addEventListener('DOMContentLoaded', initDashboard);
    </script>
</body>
</html>
EOF

echo "Trend dashboard generated at $OUTPUT_DIR/trends.html"