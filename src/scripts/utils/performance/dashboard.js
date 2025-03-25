/**
 * Performance Dashboard Module
 *
 * This module creates a development-only dashboard to visualize
 * Core Web Vitals metrics collected during testing.
 */

import { getStoredMetrics, clearStoredMetrics } from "./web-vitals.js";

// Dashboard state
let isDashboardVisible = false;

// Initialize the dashboard (development only)
export function initPerformanceDashboard() {
	// Only initialize in development
	if (process.env.NODE_ENV !== "development") {
		return;
	}

	// Create dashboard toggle button
	createDashboardToggle();

	// Create keyboard shortcut (Alt+Shift+P)
	document.addEventListener("keydown", event => {
		if (event.altKey && event.shiftKey && event.key === "P") {
			toggleDashboard();
		}
	});
}

// Create the toggle button
function createDashboardToggle() {
	const button = document.createElement("button");
	button.id = "performance-dashboard-toggle";
	button.innerHTML = "📊";
	button.setAttribute("aria-label", "Toggle Performance Dashboard");
	button.title = "Toggle Performance Dashboard (Alt+Shift+P)";

	// Style the button
	Object.assign(button.style, {
		position: "fixed",
		bottom: "20px",
		right: "20px",
		zIndex: "9999",
		width: "40px",
		height: "40px",
		borderRadius: "50%",
		backgroundColor: "#4338ca",
		color: "white",
		border: "none",
		boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
		cursor: "pointer",
		fontSize: "20px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center"
	});

	// Add event listener
	button.addEventListener("click", toggleDashboard);

	// Append to document
	document.body.appendChild(button);
}

// Toggle the dashboard visibility
function toggleDashboard() {
	if (isDashboardVisible) {
		const dashboard = document.getElementById("performance-dashboard");
		if (dashboard) {
			dashboard.remove();
		}
		isDashboardVisible = false;
	} else {
		createDashboard();
		isDashboardVisible = true;
	}
}

// Create the dashboard UI
function createDashboard() {
	// Create dashboard container
	const dashboard = document.createElement("div");
	dashboard.id = "performance-dashboard";

	// Style the dashboard
	Object.assign(dashboard.style, {
		position: "fixed",
		top: "20px",
		right: "20px",
		bottom: "20px",
		width: "400px",
		backgroundColor: "white",
		boxShadow: "0 0 20px rgba(0, 0, 0, 0.3)",
		borderRadius: "8px",
		zIndex: "9998",
		overflow: "hidden",
		display: "flex",
		flexDirection: "column",
		fontFamily: "system-ui, -apple-system, sans-serif"
	});

	// Create dashboard header
	const header = document.createElement("div");
	Object.assign(header.style, {
		padding: "15px 20px",
		borderBottom: "1px solid #e5e7eb",
		backgroundColor: "#4338ca",
		color: "white",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center"
	});

	// Add header title
	const title = document.createElement("h2");
	title.textContent = "Performance Dashboard";
	Object.assign(title.style, {
		margin: "0",
		fontSize: "18px",
		fontWeight: "600"
	});

	// Add close button
	const closeButton = document.createElement("button");
	closeButton.innerHTML = "&times;";
	closeButton.setAttribute("aria-label", "Close Dashboard");
	Object.assign(closeButton.style, {
		background: "none",
		border: "none",
		color: "white",
		fontSize: "24px",
		cursor: "pointer",
		padding: "0",
		lineHeight: "1"
	});
	closeButton.addEventListener("click", toggleDashboard);

	// Add buttons container
	const buttonsContainer = document.createElement("div");
	Object.assign(buttonsContainer.style, {
		padding: "10px 20px",
		borderBottom: "1px solid #e5e7eb",
		display: "flex",
		gap: "10px"
	});

	// Add refresh button
	const refreshButton = document.createElement("button");
	refreshButton.textContent = "Refresh";
	styleButton(refreshButton);
	refreshButton.addEventListener("click", () => updateDashboardContent(dashboard));

	// Add clear data button
	const clearButton = document.createElement("button");
	clearButton.textContent = "Clear Data";
	styleButton(clearButton, "#ef4444");
	clearButton.addEventListener("click", () => {
		clearStoredMetrics();
		updateDashboardContent(dashboard);
	});

	// Add content container
	const content = document.createElement("div");
	content.className = "dashboard-content";
	Object.assign(content.style, {
		padding: "20px",
		overflowY: "auto",
		flex: "1"
	});

	// Assemble the dashboard
	header.appendChild(title);
	header.appendChild(closeButton);
	buttonsContainer.appendChild(refreshButton);
	buttonsContainer.appendChild(clearButton);
	dashboard.appendChild(header);
	dashboard.appendChild(buttonsContainer);
	dashboard.appendChild(content);

	// Add dashboard to document
	document.body.appendChild(dashboard);

	// Populate with data
	updateDashboardContent(dashboard);
}

// Helper function to style buttons
function styleButton(button, bgColor = "#4338ca") {
	Object.assign(button.style, {
		padding: "8px 12px",
		backgroundColor: bgColor,
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "14px"
	});
}

// Update the dashboard content with metrics data
function updateDashboardContent(dashboard) {
	const contentContainer = dashboard.querySelector(".dashboard-content");
	if (!contentContainer) return;

	// Clear existing content
	contentContainer.innerHTML = "";

	// Get stored metrics
	const metrics = getStoredMetrics();

	if (metrics.length === 0) {
		const emptyMessage = document.createElement("div");
		emptyMessage.textContent = "No metrics collected yet. Browse the site to collect performance data.";
		Object.assign(emptyMessage.style, {
			textAlign: "center",
			padding: "40px 20px",
			color: "#6b7280",
			fontSize: "16px"
		});
		contentContainer.appendChild(emptyMessage);
		return;
	}

	// Process and group metrics
	const metricsByType = {};
	const metricsByPage = {};

	metrics.forEach(metric => {
		// Group by metric type
		if (!metricsByType[metric.name]) {
			metricsByType[metric.name] = [];
		}
		metricsByType[metric.name].push(metric);

		// Group by page
		const pagePath = metric.page.path;
		if (!metricsByPage[pagePath]) {
			metricsByPage[pagePath] = [];
		}
		metricsByPage[pagePath].push(metric);
	});

	// Create metric summary section
	const summarySection = createSection("Summary");
	contentContainer.appendChild(summarySection);

	// Add metric type summaries
	Object.keys(metricsByType).forEach(metricName => {
		const metricData = metricsByType[metricName];
		const values = metricData.map(m => m.value);
		const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

		// Determine rating color
		let color = "#10b981"; // good - green
		if (metricName === "LCP" && avgValue > 2500) {
			color = avgValue > 4000 ? "#ef4444" : "#f59e0b"; // poor or needs improvement
		} else if (metricName === "FID" && avgValue > 100) {
			color = avgValue > 300 ? "#ef4444" : "#f59e0b";
		} else if (metricName === "CLS" && avgValue > 0.1) {
			color = avgValue > 0.25 ? "#ef4444" : "#f59e0b";
		} else if (metricName === "FCP" && avgValue > 1800) {
			color = avgValue > 3000 ? "#ef4444" : "#f59e0b";
		} else if (metricName === "TTFB" && avgValue > 800) {
			color = avgValue > 1800 ? "#ef4444" : "#f59e0b";
		} else if (metricName === "INP" && avgValue > 200) {
			color = avgValue > 500 ? "#ef4444" : "#f59e0b";
		}

		// Format value based on metric type
		let formattedValue;
		if (metricName === "CLS") {
			formattedValue = avgValue.toFixed(3);
		} else {
			formattedValue = `${Math.round(avgValue)}ms`;
		}

		// Create metric row
		const metricRow = document.createElement("div");
		Object.assign(metricRow.style, {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			padding: "10px 0",
			borderBottom: "1px solid #e5e7eb"
		});

		// Add metric name
		const nameElement = document.createElement("div");
		nameElement.textContent = getMetricFullName(metricName);
		Object.assign(nameElement.style, {
			fontWeight: "500"
		});

		// Add metric value
		const valueElement = document.createElement("div");
		valueElement.textContent = formattedValue;
		Object.assign(valueElement.style, {
			fontWeight: "600",
			color: color
		});

		metricRow.appendChild(nameElement);
		metricRow.appendChild(valueElement);
		summarySection.appendChild(metricRow);
	});

	// Create page breakdown section
	const pageSection = createSection("Page Breakdown");
	contentContainer.appendChild(pageSection);

	// Add page summaries
	Object.keys(metricsByPage).forEach(pagePath => {
		const pageMetrics = metricsByPage[pagePath];

		// Create page row
		const pageRow = document.createElement("div");
		Object.assign(pageRow.style, {
			padding: "10px 0",
			borderBottom: "1px solid #e5e7eb"
		});

		// Add page path
		const pathElement = document.createElement("div");
		pathElement.textContent = pagePath;
		Object.assign(pathElement.style, {
			fontWeight: "500",
			marginBottom: "5px"
		});

		// Add metrics grid
		const metricsGrid = document.createElement("div");
		Object.assign(metricsGrid.style, {
			display: "grid",
			gridTemplateColumns: "repeat(3, 1fr)",
			gap: "5px",
			fontSize: "13px"
		});

		// Get latest metrics for each type
		const latestMetrics = {};
		pageMetrics.forEach(metric => {
			if (!latestMetrics[metric.name] || new Date(metric.timestamp) > new Date(latestMetrics[metric.name].timestamp)) {
				latestMetrics[metric.name] = metric;
			}
		});

		// Add metric tiles
		Object.values(latestMetrics).forEach(metric => {
			const metricTile = document.createElement("div");
			Object.assign(metricTile.style, {
				padding: "5px",
				backgroundColor: getMetricColor(metric.name, metric.value),
				color: "white",
				borderRadius: "4px",
				textAlign: "center"
			});

			const metricValue = metric.name === "CLS" ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;

			metricTile.textContent = `${metric.name}: ${metricValue}`;
			metricsGrid.appendChild(metricTile);
		});

		pageRow.appendChild(pathElement);
		pageRow.appendChild(metricsGrid);
		pageSection.appendChild(pageRow);
	});

	// Create trends section (simplified for now)
	const trendsSection = createSection("Trends");
	const trendsMessage = document.createElement("p");
	trendsMessage.textContent = `${metrics.length} data points collected. View detailed trends by exporting data.`;
	trendsSection.appendChild(trendsMessage);
	contentContainer.appendChild(trendsSection);
}

// Helper to create a section in the dashboard
function createSection(title) {
	const section = document.createElement("div");
	Object.assign(section.style, {
		marginBottom: "25px"
	});

	const sectionTitle = document.createElement("h3");
	sectionTitle.textContent = title;
	Object.assign(sectionTitle.style, {
		fontSize: "16px",
		fontWeight: "600",
		marginBottom: "10px",
		paddingBottom: "5px",
		borderBottom: "2px solid #4338ca"
	});

	section.appendChild(sectionTitle);
	return section;
}

// Helper to get a full name for a metric
function getMetricFullName(shortName) {
	const names = {
		LCP: "Largest Contentful Paint",
		FID: "First Input Delay",
		CLS: "Cumulative Layout Shift",
		FCP: "First Contentful Paint",
		TTFB: "Time to First Byte",
		INP: "Interaction to Next Paint"
	};

	return names[shortName] || shortName;
}

// Helper to get color based on metric value
function getMetricColor(name, value) {
	// Default good color
	let color = "#10b981";

	// Determine color based on metric thresholds
	switch (name) {
		case "LCP":
			if (value > 4000) color = "#ef4444";
			else if (value > 2500) color = "#f59e0b";
			break;
		case "FID":
			if (value > 300) color = "#ef4444";
			else if (value > 100) color = "#f59e0b";
			break;
		case "CLS":
			if (value > 0.25) color = "#ef4444";
			else if (value > 0.1) color = "#f59e0b";
			break;
		case "FCP":
			if (value > 3000) color = "#ef4444";
			else if (value > 1800) color = "#f59e0b";
			break;
		case "TTFB":
			if (value > 1800) color = "#ef4444";
			else if (value > 800) color = "#f59e0b";
			break;
		case "INP":
			if (value > 500) color = "#ef4444";
			else if (value > 200) color = "#f59e0b";
			break;
	}

	return color;
}
