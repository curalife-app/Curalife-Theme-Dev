#!/usr/bin/env node

/**
 * This script allows you to run the Lighthouse CI workflow locally
 * It simulates the GitHub Actions workflow by running the same scripts
 * but in a local environment
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const pages = [
	{ name: "homepage", url: "https://curalife.com/" },
	{ name: "product", url: "https://curalife.com/products/curalin" }
];

// Create necessary directories
const baseDir = path.resolve(__dirname, "../../../lighthouse-local-tests");
if (!fs.existsSync(baseDir)) {
	fs.mkdirSync(baseDir, { recursive: true });
}

// Make sure scripts are executable
console.log("Making scripts executable...");
try {
	execSync("chmod +x .github/workflows/scripts/*.sh", { stdio: "inherit" });
} catch (error) {
	console.log("Failed to make scripts executable, but continuing...");
}

// Function to run tests for a single page
function runTestsForPage(page) {
	console.log(`\n=== Running tests for ${page.name}: ${page.url} ===\n`);

	// Create results directory
	const resultsDir = path.join(baseDir, `${page.name}-lighthouse-results`);
	if (!fs.existsSync(resultsDir)) {
		fs.mkdirSync(resultsDir, { recursive: true });
	}

	// Run Lighthouse
	console.log(`Running Lighthouse for ${page.url}...`);
	try {
		execSync(`.github/workflows/scripts/run-lighthouse.sh "${page.url}" "${page.name}" "${resultsDir}"`, {
			stdio: "inherit"
		});
	} catch (error) {
		console.error(`Error running Lighthouse for ${page.name}:`, error.message);
	}

	// Process the results
	console.log(`\nProcessing results for ${page.name}...`);
	try {
		execSync(`.github/workflows/scripts/process-results.sh "${page.name}" "${resultsDir}" "$(date +%Y-%m-%d)"`, {
			stdio: "inherit"
		});
	} catch (error) {
		console.error(`Error processing results for ${page.name}:`, error.message);
	}

	return resultsDir;
}

// Function to generate the final dashboard
function generateDashboard() {
	console.log("\n=== Generating dashboard ===\n");

	// Create performance-reports directory
	const reportsDir = path.join(baseDir, "performance-reports");
	if (!fs.existsSync(reportsDir)) {
		fs.mkdirSync(reportsDir, { recursive: true });
	}

	// Run generate-dashboard.sh
	try {
		execSync(`.github/workflows/scripts/generate-dashboard.sh "${baseDir}"`, {
			stdio: "inherit"
		});
	} catch (error) {
		console.error("Error generating dashboard:", error.message);
	}

	console.log(`\nDashboard generated at: ${path.join(baseDir, "performance-reports", "index.html")}`);
}

// Main function
async function main() {
	console.log("=== Starting Local Lighthouse CI Testing ===\n");

	// Run tests for each page
	for (const page of pages) {
		runTestsForPage(page);
	}

	// Generate the dashboard
	generateDashboard();

	console.log("\n=== Testing completed ===");
	console.log(`Results available at: ${baseDir}`);
}

// Run the main function
main().catch(error => {
	console.error("Error:", error);
	process.exit(1);
});
