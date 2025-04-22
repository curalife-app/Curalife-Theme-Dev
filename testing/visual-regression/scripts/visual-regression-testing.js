#!/usr/bin/env node

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { globSync } from "glob";
import chalk from "chalk";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, "../../");
const REGISTRY_FILE = path.join(__dirname, "../history/component-registry.json");
const CHANGES_FILE = path.join(__dirname, "../history/component-changes.json");
const BASELINE_DIR = path.join(__dirname, "../baseline");
const RESULTS_DIR = path.join(__dirname, "../results");
const DIFFS_DIR = path.join(__dirname, "../diffs");
const REPORTS_DIR = path.join(__dirname, "../reports");

// Parse command line arguments
const args = process.argv.slice(2);
const UPDATE_BASELINES = args.includes("--update-baselines");
const ONLY_CHANGED = args.includes("--only-changed");

// Viewport sizes to capture
const VIEWPORTS = [
	{ name: "mobile", width: 375, height: 667 },
	{ name: "tablet", width: 768, height: 1024 },
	{ name: "desktop", width: 1280, height: 800 }
];

// Ensure directories exist
[BASELINE_DIR, RESULTS_DIR, DIFFS_DIR, REPORTS_DIR].forEach(dir => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
});

// Check prerequisites
if (!fs.existsSync(REGISTRY_FILE)) {
	console.error(chalk.red("❌ Component registry not found! Please run the component registry builder first."));
	process.exit(1);
}

// Load component registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));

// Load changes if available and only testing changed components
let changedComponents = [];
if (ONLY_CHANGED) {
	if (fs.existsSync(CHANGES_FILE)) {
		try {
			const changes = JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8"));
			changedComponents = changes.changedComponents.map(component => component.name);
			if (changedComponents.length === 0) {
				console.log(chalk.yellow("No changed components detected. Nothing to test."));
				process.exit(0);
			}
		} catch (error) {
			console.warn(chalk.yellow("⚠️ Could not read changes file. Will test all components."));
		}
	} else {
		console.warn(chalk.yellow("⚠️ No changes file found. Will test all components."));
		ONLY_CHANGED = false;
	}
}

/**
 * Take screenshots of components
 */
async function captureScreenshots() {
	console.log(chalk.blue(`🔍 Capturing screenshots of ${ONLY_CHANGED ? "changed" : "all"} components...`));

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: null,
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});

	try {
		const testResults = {
			timestamp: new Date().toISOString(),
			summary: {
				tested: 0,
				passed: 0,
				failed: 0,
				notBaseline: 0
			},
			components: []
		};

		// For each component in registry
		for (const component of registry.components) {
			// Skip if only testing changed components and this one hasn't changed
			if (ONLY_CHANGED && !changedComponents.includes(component.name)) {
				continue;
			}

			const componentResults = {
				name: component.name,
				type: component.type,
				viewports: []
			};

			console.log(chalk.cyan(`Testing component: ${component.name}`));

			// Skip if no usedIn pages (standalone components)
			if (component.usedIn.length === 0) {
				console.log(chalk.yellow(`  ⚠️ No usage found for ${component.name}, skipping...`));
				continue;
			}

			// Take the first page that uses this component
			const usagePage = component.usedIn[0];
			const pageUrl = `http://localhost:9292/${usagePage.path}`;

			const page = await browser.newPage();

			try {
				await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 30000 });

				// Find the component on the page by its class or data attribute
				// This is a simplified approach - in a real implementation, you'd need a more robust selector strategy
				const componentSelector =
					component.type === "sections"
						? `[data-section-id="${component.name}"], .section-${component.name}, #shopify-section-${component.name}`
						: `.${component.name}, [data-snippet="${component.name}"]`;

				// Wait for selector
				try {
					await page.waitForSelector(componentSelector, { timeout: 5000 });
				} catch (err) {
					console.log(chalk.yellow(`  ⚠️ Could not find component ${component.name} on page ${pageUrl} using selector ${componentSelector}`));
					componentResults.error = `Component not found on page using selector: ${componentSelector}`;
					testResults.components.push(componentResults);
					testResults.summary.tested++;
					testResults.summary.notBaseline++;
					continue;
				}

				// Take screenshots for each viewport
				for (const viewport of VIEWPORTS) {
					await page.setViewport({ width: viewport.width, height: viewport.height });

					// Wait for any viewport-specific animations to complete
					await page.waitForTimeout(500);

					// Get the bounding box of the component
					const boundingBox = await page.evaluate(selector => {
						const element = document.querySelector(selector);
						if (!element) return null;

						const { x, y, width, height } = element.getBoundingClientRect();
						return { x, y, width, height };
					}, componentSelector);

					if (!boundingBox) {
						console.log(chalk.yellow(`  ⚠️ Could not get bounding box for ${component.name} on ${viewport.name}`));
						continue;
					}

					// Ensure we capture the entire component
					const clip = {
						x: boundingBox.x,
						y: boundingBox.y,
						width: boundingBox.width,
						height: boundingBox.height
					};

					// Create directory structure
					const resultDir = path.join(RESULTS_DIR, component.type, component.name);
					if (!fs.existsSync(resultDir)) {
						fs.mkdirSync(resultDir, { recursive: true });
					}

					const baselineDir = path.join(BASELINE_DIR, component.type, component.name);
					if (!fs.existsSync(baselineDir) && UPDATE_BASELINES) {
						fs.mkdirSync(baselineDir, { recursive: true });
					}

					const diffDir = path.join(DIFFS_DIR, component.type, component.name);
					if (!fs.existsSync(diffDir)) {
						fs.mkdirSync(diffDir, { recursive: true });
					}

					// Take screenshot
					const screenshotPath = path.join(resultDir, `${viewport.name}.png`);
					await page.screenshot({
						path: screenshotPath,
						clip
					});

					console.log(chalk.green(`  ✅ Captured ${viewport.name} screenshot for ${component.name}`));

					// If updating baselines, just copy the result as the new baseline
					const baselinePath = path.join(baselineDir, `${viewport.name}.png`);
					if (UPDATE_BASELINES) {
						fs.copyFileSync(screenshotPath, baselinePath);
						componentResults.viewports.push({
							name: viewport.name,
							result: "baseline-updated",
							diffPercentage: 0
						});
						continue;
					}

					// Compare with baseline if it exists
					let comparisonResult;
					if (fs.existsSync(baselinePath)) {
						comparisonResult = await compareImages(baselinePath, screenshotPath, path.join(diffDir, `${viewport.name}.png`));
						componentResults.viewports.push({
							name: viewport.name,
							result: comparisonResult.match ? "pass" : "fail",
							diffPercentage: comparisonResult.diffPercentage,
							diffPixels: comparisonResult.diffPixels
						});

						if (comparisonResult.match) {
							console.log(chalk.green(`  ✅ ${viewport.name} comparison passed for ${component.name}`));
						} else {
							console.log(chalk.red(`  ❌ ${viewport.name} comparison failed for ${component.name} (${comparisonResult.diffPercentage.toFixed(2)}% different)`));
						}
					} else {
						console.log(chalk.yellow(`  ⚠️ No baseline found for ${component.name} on ${viewport.name}`));
						componentResults.viewports.push({
							name: viewport.name,
							result: "no-baseline"
						});
					}
				}
			} catch (err) {
				console.error(chalk.red(`  ❌ Error testing ${component.name}: ${err.message}`));
				componentResults.error = err.message;
			} finally {
				await page.close();
			}

			// Determine component overall result
			if (componentResults.error) {
				componentResults.result = "error";
				testResults.summary.failed++;
			} else if (componentResults.viewports.some(v => v.result === "no-baseline")) {
				componentResults.result = "no-baseline";
				testResults.summary.notBaseline++;
			} else if (componentResults.viewports.some(v => v.result === "fail")) {
				componentResults.result = "fail";
				testResults.summary.failed++;
			} else if (componentResults.viewports.every(v => v.result === "baseline-updated")) {
				componentResults.result = "baseline-updated";
				testResults.summary.passed++;
			} else {
				componentResults.result = "pass";
				testResults.summary.passed++;
			}

			testResults.components.push(componentResults);
			testResults.summary.tested++;
		}

		// Save test results
		const timestamp = new Date().toISOString().replace(/:/g, "-");
		const reportFile = path.join(REPORTS_DIR, `test-report-${timestamp}.json`);
		fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));

		// Generate HTML report
		generateHtmlReport(testResults, timestamp);

		return testResults;
	} finally {
		await browser.close();
	}
}

/**
 * Compare two images and generate a diff image
 */
async function compareImages(baselinePath, currentPath, diffPath) {
	const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
	const current = PNG.sync.read(fs.readFileSync(currentPath));

	// Ensure images are same size
	if (baseline.width !== current.width || baseline.height !== current.height) {
		// Resize to match baseline (simplified approach)
		return {
			match: false,
			diffPercentage: 100,
			diffPixels: Math.max(baseline.width * baseline.height, current.width * current.height)
		};
	}

	const { width, height } = baseline;
	const diff = new PNG({ width, height });

	// Compare images pixel by pixel
	const diffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, { threshold: 0.1 });
	const diffPercentage = (diffPixels / (width * height)) * 100;

	// Create diff image
	fs.writeFileSync(diffPath, PNG.sync.write(diff));

	// Consider images matching if less than 0.5% different
	return {
		match: diffPercentage < 0.5,
		diffPercentage,
		diffPixels
	};
}

/**
 * Generate an HTML report from test results
 */
function generateHtmlReport(results, timestamp) {
	const reportPath = path.join(REPORTS_DIR, `test-report-${timestamp}.html`);

	// Generate HTML content
	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      flex: 1;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .summary-card.pass {
      background-color: #d4edda;
      border-left: 5px solid #28a745;
    }
    .summary-card.fail {
      background-color: #f8d7da;
      border-left: 5px solid #dc3545;
    }
    .summary-card.warning {
      background-color: #fff3cd;
      border-left: 5px solid #ffc107;
    }
    .component-row {
      margin-bottom: 30px;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .component-row.pass {
      border-left: 5px solid #28a745;
    }
    .component-row.fail {
      border-left: 5px solid #dc3545;
    }
    .component-row.no-baseline {
      border-left: 5px solid #ffc107;
    }
    .component-row.error {
      border-left: 5px solid #6c757d;
    }
    .component-row h3 {
      margin-top: 0;
    }
    .viewport-results {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    .viewport-card {
      flex: 1;
      min-width: 300px;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .viewport-card h4 {
      margin-top: 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .badge.pass {
      background-color: #d4edda;
      color: #155724;
    }
    .badge.fail {
      background-color: #f8d7da;
      color: #721c24;
    }
    .badge.no-baseline {
      background-color: #fff3cd;
      color: #856404;
    }
    .badge.error {
      background-color: #f5f5f5;
      color: #6c757d;
    }
    .badge.updated {
      background-color: #cce5ff;
      color: #004085;
    }
    .timestamp {
      color: #6c757d;
      font-size: 0.9em;
      margin-top: 10px;
    }
    .image-comparison {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }
    .image-card {
      flex: 1;
      min-width: 200px;
      text-align: center;
    }
    .image-card img {
      max-width: 100%;
      border: 1px solid #ddd;
    }
    .image-card p {
      margin: 5px 0;
      font-size: 14px;
    }
    .progress-bar {
      height: 10px;
      margin-top: 10px;
      border-radius: 5px;
      overflow: hidden;
    }
    .progress-inner {
      height: 100%;
      display: flex;
    }
    .progress-pass {
      background-color: #28a745;
    }
    .progress-fail {
      background-color: #dc3545;
    }
    .progress-warning {
      background-color: #ffc107;
    }
    h1 img {
      height: 30px;
      margin-right: 10px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <h1>📊 Visual Regression Test Report</h1>
  <p class="timestamp">Generated on ${new Date(results.timestamp).toLocaleString()}</p>

  <div class="summary">
    <div class="summary-card ${results.summary.failed > 0 ? "fail" : "pass"}">
      <h3>Test Results</h3>
      <p><strong>Tested:</strong> ${results.summary.tested} components</p>
      <p><strong>Passed:</strong> ${results.summary.passed} components</p>
      <p><strong>Failed:</strong> ${results.summary.failed} components</p>
      <p><strong>No Baseline:</strong> ${results.summary.notBaseline} components</p>

      <div class="progress-bar">
        <div class="progress-inner">
          <div class="progress-pass" style="width: ${(results.summary.passed / results.summary.tested) * 100}%"></div>
          <div class="progress-fail" style="width: ${(results.summary.failed / results.summary.tested) * 100}%"></div>
          <div class="progress-warning" style="width: ${(results.summary.notBaseline / results.summary.tested) * 100}%"></div>
        </div>
      </div>
    </div>

    <div class="summary-card ${results.summary.failed > 0 ? "fail" : results.summary.notBaseline > 0 ? "warning" : "pass"}">
      <h3>Summary</h3>
      <p><strong>Status:</strong> ${results.summary.failed > 0 ? "❌ Test Failed" : results.summary.notBaseline > 0 ? "⚠️ Incomplete Test" : "✅ Test Passed"}</p>
      <p><strong>Mode:</strong> ${UPDATE_BASELINES ? "Baseline Update" : "Component Testing"}</p>
      <p><strong>Scope:</strong> ${ONLY_CHANGED ? "Changed Components" : "All Components"}</p>
      <p><strong>Recommendation:</strong> ${
				results.summary.failed > 0 ? "Review failed components and fix issues" : results.summary.notBaseline > 0 ? "Create baselines for missing components" : "All tests passing, no action needed"
			}</p>
    </div>
  </div>

  <h2>Component Results</h2>

  ${results.components
		.map(
			component => `
    <div class="component-row ${component.result}">
      <h3>${component.name} <span class="badge ${component.result === "baseline-updated" ? "updated" : component.result}">${
				component.result === "pass"
					? "Pass"
					: component.result === "fail"
						? "Fail"
						: component.result === "no-baseline"
							? "No Baseline"
							: component.result === "baseline-updated"
								? "Baseline Updated"
								: "Error"
			}</span></h3>
      <p><strong>Type:</strong> ${component.type}</p>
      ${component.error ? `<p><strong>Error:</strong> ${component.error}</p>` : ""}

      <div class="viewport-results">
        ${component.viewports
					.map(
						viewport => `
          <div class="viewport-card">
            <h4>${viewport.name} <span class="badge ${viewport.result === "baseline-updated" ? "updated" : viewport.result}">${
							viewport.result === "pass"
								? "Pass"
								: viewport.result === "fail"
									? "Fail"
									: viewport.result === "no-baseline"
										? "No Baseline"
										: viewport.result === "baseline-updated"
											? "Baseline Updated"
											: "Error"
						}</span></h4>

            ${
							viewport.result === "fail"
								? `
              <p><strong>Difference:</strong> ${viewport.diffPercentage.toFixed(2)}% (${viewport.diffPixels} pixels)</p>

              <div class="image-comparison">
                <div class="image-card">
                  <img src="../baseline/${component.type}/${component.name}/${viewport.name}.png" alt="Baseline">
                  <p>Baseline</p>
                </div>
                <div class="image-card">
                  <img src="../results/${component.type}/${component.name}/${viewport.name}.png" alt="Current">
                  <p>Current</p>
                </div>
                <div class="image-card">
                  <img src="../diffs/${component.type}/${component.name}/${viewport.name}.png" alt="Diff">
                  <p>Difference</p>
                </div>
              </div>
            `
								: viewport.result === "pass"
									? `
              <p>Looks good! No visual differences detected.</p>
            `
									: viewport.result === "no-baseline"
										? `
              <p>No baseline image found for comparison.</p>
              <div class="image-card">
                <img src="../results/${component.type}/${component.name}/${viewport.name}.png" alt="Current">
                <p>Current</p>
              </div>
            `
										: viewport.result === "baseline-updated"
											? `
              <p>Baseline has been updated with the current image.</p>
              <div class="image-card">
                <img src="../baseline/${component.type}/${component.name}/${viewport.name}.png" alt="Updated Baseline">
                <p>Updated Baseline</p>
              </div>
            `
											: ""
						}
          </div>
        `
					)
					.join("")}
      </div>
    </div>
  `
		)
		.join("")}

  <footer>
    <p class="timestamp">Report generated by Visual Testing Platform</p>
  </footer>
</body>
</html>
  `;

	fs.writeFileSync(reportPath, html);
	console.log(chalk.green(`✅ HTML report generated: ${reportPath}`));

	return reportPath;
}

/**
 * Main function
 */
async function runVisualTests() {
	console.log(chalk.blue(`🖼️ Starting visual regression testing...`));
	console.log(chalk.blue(`Mode: ${UPDATE_BASELINES ? "Updating baselines" : "Testing components"}`));
	console.log(chalk.blue(`Scope: ${ONLY_CHANGED ? "Changed components only" : "All components"}`));

	try {
		const results = await captureScreenshots();

		console.log(chalk.green(`\n✅ Visual testing complete!`));
		console.log(chalk.cyan(`Tested: ${results.summary.tested} components`));
		console.log(chalk.green(`Passed: ${results.summary.passed} components`));

		if (results.summary.failed > 0) {
			console.log(chalk.red(`Failed: ${results.summary.failed} components`));
		}

		if (results.summary.notBaseline > 0) {
			console.log(chalk.yellow(`No baseline: ${results.summary.notBaseline} components`));
			console.log(chalk.yellow(`Run with --update-baselines to create missing baselines`));
		}

		return results;
	} catch (error) {
		console.error(chalk.red(`❌ Error running visual tests: ${error.message}`));
		process.exit(1);
	}
}

// Run the visual tests
runVisualTests();
