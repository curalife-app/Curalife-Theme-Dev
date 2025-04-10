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
    <title>Lighthouse Performance Trends</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        h1 { color: #333; text-align: center; }
        .message { text-align: center; margin: 50px; color: #666; }
    </style>
</head>
<body>
    <h1>Lighthouse Performance Trends</h1>
    <div class="message">
        <p>No historical data is available yet. Data will appear after multiple test runs.</p>
    </div>
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
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ddd;
        }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .chart-container {
            margin-bottom: 40px;
            padding: 20px;
            border-radius: 5px;
            background-color: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .metric-card {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .tab.active {
            border: 1px solid #ddd;
            border-bottom-color: white;
            border-radius: 5px 5px 0 0;
            margin-bottom: -1px;
            background-color: white;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .date-range {
            margin-bottom: 20px;
        }
        select {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        @media (max-width: 768px) {
            .metric-card {
                grid-template-columns: 1fr;
            }
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin-top: 0;
            font-size: 16px;
        }
        .score {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .score-change {
            font-size: 14px;
        }
        .positive-change {
            color: green;
        }
        .negative-change {
            color: red;
        }
        .trend-indicator {
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Lighthouse Performance Trends</h1>

        <div class="dashboard-header">
            <div>
                <h2>Historical Performance Metrics</h2>
                <p>Last updated: <span id="lastUpdated">${CURRENT_DATE}</span></p>
            </div>
            <div class="date-range">
                <label for="timeRange">Time Range:</label>
                <select id="timeRange" onchange="updateCharts()">
                    <option value="7">Last 7 days</option>
                    <option value="30" selected>Last 30 days</option>
                    <option value="60">Last 60 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="all">All time</option>
                </select>
            </div>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="switchTab('desktop')">Desktop</div>
            <div class="tab" onclick="switchTab('mobile')">Mobile</div>
        </div>

        <div id="summary" class="summary-cards">
            <!-- Summary cards will be generated dynamically -->
        </div>

        <div id="desktopContent" class="tab-content active">
            <div class="chart-container">
                <canvas id="desktopPerformanceChart"></canvas>
            </div>

            <h3>Core Web Vitals</h3>
            <div class="metric-card">
                <div class="chart-container">
                    <canvas id="desktopLCPChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="desktopCLSChart"></canvas>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="desktopTBTChart"></canvas>
            </div>
        </div>

        <div id="mobileContent" class="tab-content">
            <div class="chart-container">
                <canvas id="mobilePerformanceChart"></canvas>
            </div>

            <h3>Core Web Vitals</h3>
            <div class="metric-card">
                <div class="chart-container">
                    <canvas id="mobileLCPChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="mobileCLSChart"></canvas>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="mobileTBTChart"></canvas>
            </div>
        </div>
    </div>

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