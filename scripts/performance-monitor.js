#!/usr/bin/env node

/**
 * Performance Monitoring Script
 *
 * This script provides continuous performance monitoring by:
 * 1. Running Lighthouse tests at scheduled intervals
 * 2. Comparing results over time
 * 3. Generating reports showing performance trends
 * 4. Alerting on performance regressions
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import http from "http";
import { promisify } from "util";
import { spawn } from "child_process";

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const reportDir = path.join(projectRoot, "performance-reports");

// Ensure the reports directory exists
if (!fs.existsSync(reportDir)) {
	fs.mkdirSync(reportDir, { recursive: true });
}

// Configuration
const config = {
	// Pages to test
	pages: [
		{ name: "home", url: "http://localhost:9292/" },
		{ name: "collection", url: "http://localhost:9292/collections/all" },
		{ name: "product", url: "http://localhost:9292/products/sample-product" }
	],

	// Testing intervals in milliseconds
	intervals: {
		desktop: 24 * 60 * 60 * 1000, // Daily for desktop
		mobile: 24 * 60 * 60 * 1000 // Daily for mobile
	},

	// Performance thresholds
	thresholds: {
		performance: 80,
		accessibility: 90,
		"best-practices": 90,
		seo: 85,
		pwa: 50
	}
};

// Check if a server is running at the specified URL
async function checkServerAvailability() {
	return new Promise(resolve => {
		const checkProcess = spawn("node", [path.join(__dirname, "check-server.js")]);

		checkProcess.on("close", code => {
			resolve(code === 0);
		});
	});
}

// Main monitoring function
async function startMonitoring() {
	console.log("🔍 Starting performance monitoring...");
	console.log(`📊 Reports will be saved to: ${reportDir}`);

	// Check if server is running
	console.log("🔍 Checking if development server is running...");
	const serverAvailable = await checkServerAvailability();

	if (!serverAvailable) {
		console.error(`❌ Server is not running at ${config.pages[0].url}`);
		console.error(`   Please start the server with 'npm run shopify' before running performance tests.`);
		process.exit(1);
	}

	console.log("✅ Server is running and available.");

	// Initial run for baseline if no previous reports
	const hasBaseline = fs.existsSync(path.join(reportDir, "baseline-desktop.html"));
	if (!hasBaseline) {
		console.log("⏳ Creating initial baseline reports...");
		await runLighthouse("desktop", "baseline");
		await runLighthouse("mobile", "baseline");
		console.log("✅ Baseline reports created.");
	}

	// Schedule regular monitoring
	console.log("📅 Scheduling regular performance checks...");

	// Run desktop tests
	await runLighthouse("desktop", getCurrentDateString());
	setInterval(async () => {
		// Check server before each test
		const isAvailable = await checkServerAvailability();
		if (isAvailable) {
			await runLighthouse("desktop", getCurrentDateString());
		} else {
			console.error(`❌ Server is not available. Skipping desktop test.`);
		}
	}, config.intervals.desktop);

	// Run mobile tests
	setTimeout(async () => {
		// Check server before each test
		const isAvailable = await checkServerAvailability();
		if (isAvailable) {
			await runLighthouse("mobile", getCurrentDateString());
			setInterval(async () => {
				const stillAvailable = await checkServerAvailability();
				if (stillAvailable) {
					await runLighthouse("mobile", getCurrentDateString());
				} else {
					console.error(`❌ Server is not available. Skipping mobile test.`);
				}
			}, config.intervals.mobile);
		} else {
			console.error(`❌ Server is not available. Skipping mobile test.`);
		}
	}, config.intervals.mobile / 2); // Offset mobile tests

	// Compare with baseline
	await compareWithBaseline();

	console.log("✅ Performance monitoring is running. Press Ctrl+C to stop.");
}

// Run Lighthouse for all pages
async function runLighthouse(device, label) {
	console.log(`🚀 Running ${device} tests with label "${label}"...`);

	for (const page of config.pages) {
		const outputPath = path.join(reportDir, `${label}-${device}-${page.name}.html`);

		console.log(`   Testing ${page.name} page...`);

		try {
			execSync(`npx lighthouse ${page.url} --preset=${device} --output=html --output-path="${outputPath}" --chrome-flags="--headless"`, { stdio: "inherit" });

			// Also save JSON for analysis
			const jsonPath = outputPath.replace(".html", ".json");
			execSync(`npx lighthouse ${page.url} --preset=${device} --output=json --output-path="${jsonPath}" --chrome-flags="--headless"`, { stdio: "inherit" });

			console.log(`   ✅ ${device} report saved to: ${outputPath}`);
		} catch (error) {
			console.error(`   ❌ Error testing ${page.name}: ${error.message}`);
		}
	}
}

// Compare current results with baseline
async function compareWithBaseline() {
	console.log("📊 Comparing current results with baseline...");

	// Get all baseline and latest reports
	const baselineReports = findJsonReports("baseline");
	const latestLabel = getCurrentDateString();
	const latestReports = findJsonReports(latestLabel);

	if (baselineReports.length === 0) {
		console.log("   ⚠️ No baseline reports found. Run with --baseline flag to create them.");
		return;
	}

	if (latestReports.length === 0) {
		console.log("   ⚠️ No current reports found.");
		return;
	}

	// Create comparison report
	const comparisonReport = {
		timestamp: new Date().toISOString(),
		comparisons: []
	};

	// Compare each baseline report with its corresponding latest report
	for (const baselineReport of baselineReports) {
		const { device, page } = parseReportFilename(baselineReport);
		const matchingLatestReport = latestReports.find(report => {
			const info = parseReportFilename(report);
			return info.device === device && info.page === page;
		});

		if (!matchingLatestReport) {
			console.log(`   ⚠️ No matching current report for ${device} ${page}`);
			continue;
		}

		try {
			// Read reports
			const baselineData = JSON.parse(fs.readFileSync(path.join(reportDir, baselineReport), "utf8"));

			const latestData = JSON.parse(fs.readFileSync(path.join(reportDir, matchingLatestReport), "utf8"));

			// Compare categories
			const comparison = {
				page,
				device,
				categories: {},
				metrics: {}
			};

			// Compare category scores
			for (const category of Object.keys(baselineData.categories)) {
				const baselineScore = Math.round(baselineData.categories[category].score * 100);
				const latestScore = Math.round(latestData.categories[category].score * 100);
				const diff = latestScore - baselineScore;

				comparison.categories[category] = {
					baseline: baselineScore,
					current: latestScore,
					diff,
					status: getDiffStatus(diff)
				};
			}

			// Compare key metrics
			const keyMetrics = ["first-contentful-paint", "largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time", "interactive", "speed-index"];

			for (const metric of keyMetrics) {
				const baselineMetric = baselineData.audits[metric];
				const latestMetric = latestData.audits[metric];

				if (baselineMetric && latestMetric) {
					const baselineValue = baselineMetric.numericValue;
					const latestValue = latestMetric.numericValue;

					// For most metrics, lower is better (except scores which are 0-1)
					const isCls = metric === "cumulative-layout-shift";
					const normalizedBaseline = isCls ? baselineValue : Math.round(baselineValue);
					const normalizedLatest = isCls ? latestValue : Math.round(latestValue);

					// For metrics, negative diff is improvement (except scores)
					const diff = normalizedLatest - normalizedBaseline;
					const status =
						isCls || metric.includes("score")
							? getDiffStatus(diff * -1) // Invert for times (lower is better)
							: getDiffStatus(diff * -1);

					comparison.metrics[metric] = {
						baseline: normalizedBaseline,
						current: normalizedLatest,
						diff,
						unit: isCls ? "" : "ms",
						status
					};
				}
			}

			comparisonReport.comparisons.push(comparison);

			// Log comparison
			console.log(`\n   📊 ${device.toUpperCase()} - ${page.toUpperCase()}`);
			console.log("   ----------------------");

			// Log category scores
			console.log("   Category Scores:");
			for (const [category, data] of Object.entries(comparison.categories)) {
				const diffIcon = data.status === "improvement" ? "✅" : data.status === "regression" ? "❌" : "➖";
				console.log(`     ${category}: ${data.baseline} → ${data.current} (${diffIcon} ${data.diff > 0 ? "+" : ""}${data.diff})`);
			}

			// Log key metrics
			console.log("\n   Key Metrics:");
			for (const [metric, data] of Object.entries(comparison.metrics)) {
				const diffIcon = data.status === "improvement" ? "✅" : data.status === "regression" ? "❌" : "➖";
				const diffPrefix = data.diff > 0 ? "+" : "";
				console.log(`     ${metric}: ${data.baseline}${data.unit} → ${data.current}${data.unit} (${diffIcon} ${diffPrefix}${data.diff}${data.unit})`);
			}
		} catch (error) {
			console.error(`   ❌ Error comparing reports: ${error.message}`);
		}
	}

	// Save comparison report
	const comparisonPath = path.join(reportDir, `comparison-${latestLabel}.json`);
	fs.writeFileSync(comparisonPath, JSON.stringify(comparisonReport, null, 2));
	console.log(`\n✅ Comparison report saved to: ${comparisonPath}`);
}

// Helper to get status from diff value
function getDiffStatus(diff) {
	if (diff > 0) return "improvement";
	if (diff < 0) return "regression";
	return "neutral";
}

// Helper to parse report filename
function parseReportFilename(filename) {
	// Format: label-device-page.json
	const parts = path.basename(filename, ".json").split("-");

	// Handle baseline-desktop-home.json format
	let label, device, page;

	if (parts.length === 3) {
		[label, device, page] = parts;
	} else if (parts.length > 3) {
		label = parts[0];
		device = parts[1];
		page = parts.slice(2).join("-");
	}

	return { label, device, page };
}

// Helper to find JSON reports with a specific label
function findJsonReports(label) {
	return fs
		.readdirSync(reportDir)
		.filter(file => file.startsWith(label) && file.endsWith(".json"))
		.filter(file => !file.includes("comparison")); // Exclude comparison reports
}

// Helper to get current date string
function getCurrentDateString() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Start monitoring
startMonitoring().catch(error => {
	console.error("❌ Error in performance monitoring:", error);
	process.exit(1);
});
