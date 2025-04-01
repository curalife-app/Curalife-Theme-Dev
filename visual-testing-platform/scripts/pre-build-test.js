#!/usr/bin/env node

import { execSync } from "child_process";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Pre-Build Testing Workflow
 *
 * This script orchestrates the pre-build testing process:
 * 1. Analyze component changes
 * 2. Run visual regression tests on changed components
 * 3. Generate reports and prompt for confirmation
 */

// Configuration
const CONFIG = {
	registryFile: path.join(__dirname, "../history/component-registry.json"),
	changesFile: path.join(__dirname, "../history/component-changes.json"),
	reportsDir: path.join(__dirname, "../reports"),
	highRiskThreshold: 10, // Number of impacted pages that constitutes high risk
	mediumRiskThreshold: 3 // Number of impacted pages that constitutes medium risk
};

// Create a readline interface for user input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Helper function to run commands and handle errors
function runCommand(command, options = {}) {
	try {
		return execSync(command, {
			encoding: "utf-8",
			stdio: options.silent ? "pipe" : "inherit",
			...options
		});
	} catch (error) {
		if (options.ignoreErrors) {
			return "";
		}
		console.error(chalk.red(`Command failed: ${command}`));
		console.error(chalk.red(error.message));
		process.exit(1);
	}
}

// Get the most recent report file
function getMostRecentReport() {
	if (!fs.existsSync(CONFIG.reportsDir)) {
		return null;
	}

	const reports = fs
		.readdirSync(CONFIG.reportsDir)
		.filter(file => file.startsWith("test-report-") && file.endsWith(".json"))
		.map(file => ({
			file,
			time: fs.statSync(path.join(CONFIG.reportsDir, file)).mtime.getTime()
		}))
		.sort((a, b) => b.time - a.time);

	if (reports.length === 0) {
		return null;
	}

	return JSON.parse(fs.readFileSync(path.join(CONFIG.reportsDir, reports[0].file), "utf8"));
}

// Check if the registry exists and has changes
async function checkComponentChanges() {
	console.log(chalk.blue("🔍 Checking for component changes..."));

	// First ensure we have a component registry
	if (!fs.existsSync(CONFIG.registryFile)) {
		console.log(chalk.yellow("Component registry not found. Creating it now..."));
		runCommand("node visual-testing-platform/scripts/component-registry.js");
	}

	// Run the component change detection
	try {
		runCommand("node visual-testing-platform/scripts/detect-component-changes.js");

		// Check if there are any changes
		if (fs.existsSync(CONFIG.changesFile)) {
			const changes = JSON.parse(fs.readFileSync(CONFIG.changesFile, "utf8"));

			if (changes.changedComponents.length === 0) {
				console.log(chalk.green("✅ No component changes detected. Safe to proceed with build."));
				return { hasChanges: false };
			}

			return {
				hasChanges: true,
				changes,
				riskLevel: calculateRiskLevel(changes)
			};
		} else {
			console.log(chalk.yellow("⚠️ Could not find component changes file. Assuming no changes."));
			return { hasChanges: false };
		}
	} catch (error) {
		console.error(chalk.red(`Error detecting component changes: ${error.message}`));

		// Ask user if they want to continue anyway
		const answer = await askQuestion(chalk.yellow("Would you like to proceed with the build despite the error? (y/N): "));

		if (answer.toLowerCase() !== "y") {
			process.exit(1);
		}

		return { hasChanges: false, hadError: true };
	}
}

// Calculate risk level based on changes
function calculateRiskLevel(changes) {
	const impactedPagesCount = changes.impactedPages.length;

	if (impactedPagesCount >= CONFIG.highRiskThreshold) {
		return "high";
	} else if (impactedPagesCount >= CONFIG.mediumRiskThreshold) {
		return "medium";
	} else {
		return "low";
	}
}

// Run visual regression tests on changed components
async function runVisualTests() {
	console.log(chalk.blue("🖼️ Running visual regression tests on changed components..."));

	try {
		runCommand("node visual-testing-platform/scripts/visual-regression-testing.js --only-changed");
		return true;
	} catch (error) {
		console.error(chalk.red(`Error running visual tests: ${error.message}`));

		// Ask user if they want to continue anyway
		const answer = await askQuestion(chalk.yellow("Visual tests failed. Would you like to proceed with the build anyway? (y/N): "));

		return answer.toLowerCase() === "y";
	}
}

// Ask user for confirmation
function askQuestion(question) {
	return new Promise(resolve => {
		rl.question(question, answer => {
			resolve(answer);
		});
	});
}

// Main function to run the pre-build testing process
async function runPreBuildTests() {
	console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
	console.log(chalk.cyan("📋 PRE-BUILD SAFETY CHECK"));
	console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
	console.log();

	try {
		// Step 1: Analyze component changes
		const changeResult = await checkComponentChanges();

		// If no changes, we can proceed with the build
		if (!changeResult.hasChanges) {
			const answer = await askQuestion(chalk.green("No changes detected. Proceed with build? (Y/n): "));

			if (answer.toLowerCase() === "n") {
				console.log(chalk.yellow("Build cancelled by user."));
				process.exit(0);
			}

			rl.close();
			return true;
		}

		// We have changes, show details and assess risk
		console.log(chalk.yellow("\n⚠️ Component changes detected!"));
		console.log(chalk.white(`Changed components: ${changeResult.changes.changedComponents.length}`));
		console.log(chalk.white(`Impacted pages: ${changeResult.changes.impactedPages.length}`));
		console.log(chalk.white(`Risk level: ${changeResult.riskLevel.toUpperCase()}`));

		// If high risk, show a stronger warning
		if (changeResult.riskLevel === "high") {
			console.log(chalk.red("\n⚠️ HIGH RISK CHANGES DETECTED!"));
			console.log(chalk.red("These changes could potentially impact many pages."));

			const answer = await askQuestion(chalk.yellow("Run visual regression tests to validate changes? (Y/n): "));

			if (answer.toLowerCase() === "n") {
				console.log(chalk.red("⚠️ Skipping visual tests on high-risk changes is not recommended."));

				const proceedAnswer = await askQuestion(chalk.red("Are you absolutely sure you want to proceed without testing? (yes/N): "));

				if (proceedAnswer.toLowerCase() !== "yes") {
					console.log(chalk.yellow("Build cancelled by user."));
					process.exit(0);
				}
			} else {
				// Run visual tests
				const testsSuccessful = await runVisualTests();

				if (!testsSuccessful) {
					const proceedAnswer = await askQuestion(chalk.red("Visual tests failed. Are you sure you want to proceed with the build? (yes/N): "));

					if (proceedAnswer.toLowerCase() !== "yes") {
						console.log(chalk.yellow("Build cancelled by user."));
						process.exit(0);
					}
				}
			}
		} else {
			// Medium or low risk, still recommend testing
			const answer = await askQuestion(chalk.yellow(`${changeResult.riskLevel.toUpperCase()} RISK: Run visual regression tests to validate changes? (Y/n): `));

			if (answer.toLowerCase() !== "n") {
				await runVisualTests();
			}
		}

		// Get latest test report
		const testReport = getMostRecentReport();

		if (testReport) {
			console.log(chalk.cyan("\n📊 Test Report Summary:"));
			console.log(chalk.white(`Tested components: ${testReport.summary.tested}`));
			console.log(chalk.green(`Passed: ${testReport.summary.passed}`));

			if (testReport.summary.failed > 0) {
				console.log(chalk.red(`Failed: ${testReport.summary.failed}`));
			}

			if (testReport.summary.notBaseline > 0) {
				console.log(chalk.yellow(`No baseline: ${testReport.summary.notBaseline}`));
			}
		}

		// Final confirmation
		const finalAnswer = await askQuestion(chalk.yellow("\nHave you reviewed the changes and wish to proceed with the build? (y/N): "));

		if (finalAnswer.toLowerCase() !== "y") {
			console.log(chalk.yellow("Build cancelled by user."));
			process.exit(0);
		}

		console.log(chalk.green("\n✅ Pre-build checks complete. Proceeding with build..."));
		rl.close();
		return true;
	} catch (error) {
		console.error(chalk.red(`\n❌ Error during pre-build tests: ${error.message}`));

		const answer = await askQuestion(chalk.yellow("An error occurred. Would you like to proceed with the build anyway? (y/N): "));

		if (answer.toLowerCase() !== "y") {
			console.log(chalk.yellow("Build cancelled due to pre-build test failure."));
			process.exit(1);
		}

		rl.close();
		return true;
	}
}

// Run the pre-build tests
runPreBuildTests();

export default runPreBuildTests;
