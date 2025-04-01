#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, "../../");
const REGISTRY_FILE = path.join(__dirname, "../history/component-registry.json");
const CHANGES_FILE = path.join(__dirname, "../history/component-changes.json");

// Ensure directories exist
const historyDir = path.dirname(REGISTRY_FILE);
if (!fs.existsSync(historyDir)) {
	fs.mkdirSync(historyDir, { recursive: true });
}

// Check if registry exists
if (!fs.existsSync(REGISTRY_FILE)) {
	console.error(chalk.red("❌ Component registry not found! Please run the component registry builder first."));
	process.exit(1);
}

/**
 * Get modification time for a file
 */
function getFileModTime(filePath) {
	try {
		const stats = fs.statSync(filePath);
		return stats.mtime.getTime();
	} catch (error) {
		return 0; // File doesn't exist or can't be accessed
	}
}

/**
 * Get git diff for a specific file
 */
function getGitDiff(filePath) {
	try {
		// Try to get the diff from the last commit for this file
		return execSync(`git diff HEAD -- "${filePath}"`, { encoding: "utf8" });
	} catch (error) {
		// If that fails (maybe file is not in git), return empty string
		return "";
	}
}

/**
 * Get last modification date from git history
 */
function getLastGitModification(filePath) {
	try {
		const output = execSync(`git log -1 --format="%ad" -- "${filePath}"`, { encoding: "utf8" }).trim();
		return output ? new Date(output).getTime() : 0;
	} catch (error) {
		return 0;
	}
}

/**
 * Check if a file has been modified since a specific time
 */
function isFileModifiedSince(filePath, sinceTime) {
	const modTime = getFileModTime(filePath);
	const gitModTime = getLastGitModification(filePath);

	// Use the most recent timestamp between file system and git
	const mostRecentMod = Math.max(modTime, gitModTime);

	return mostRecentMod > sinceTime;
}

/**
 * Detect which components have changed
 * @returns {Object} Results with changed components and impacted pages
 */
function detectChangedComponents() {
	console.log(chalk.blue("🔍 Detecting changed components..."));

	// Load the component registry
	const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));

	// Get the last check time (if exists)
	let lastCheckTime = 0;
	if (fs.existsSync(CHANGES_FILE)) {
		try {
			const lastChanges = JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8"));
			lastCheckTime = new Date(lastChanges.metadata.detectedAt).getTime();
		} catch (error) {
			console.warn(chalk.yellow("⚠️ Could not read previous changes file, checking against all components."));
		}
	}

	// Store detection results
	const results = {
		metadata: {
			detectedAt: new Date().toISOString(),
			lastCheckAt: lastCheckTime ? new Date(lastCheckTime).toISOString() : null
		},
		changedComponents: [],
		impactedPages: new Set(),
		impactedComponents: new Set(),
		gitDiffs: {}
	};

	// Check each component for changes
	for (const component of registry.components) {
		const fullPath = path.join(BASE_DIR, component.fullPath);

		if (isFileModifiedSince(fullPath, lastCheckTime)) {
			results.changedComponents.push({
				name: component.name,
				type: component.type,
				path: component.path,
				impactLevel: component.usedIn.length
			});

			// Record git diff for this component
			const gitDiff = getGitDiff(fullPath);
			if (gitDiff) {
				results.gitDiffs[component.path] = gitDiff;
			}

			// Find all pages and components that would be impacted by this change
			component.usedIn.forEach(usage => {
				if (usage.type === "template") {
					results.impactedPages.add(usage.name);
				} else if (usage.type === "section") {
					results.impactedComponents.add(usage.name);
				}
			});
		}
	}

	// Convert sets to arrays for JSON serialization
	results.impactedPages = Array.from(results.impactedPages);
	results.impactedComponents = Array.from(results.impactedComponents);

	// Sort components by impact level (highest first)
	results.changedComponents.sort((a, b) => b.impactLevel - a.impactLevel);

	// Save the results for later use
	fs.writeFileSync(CHANGES_FILE, JSON.stringify(results, null, 2));

	return results;
}

/**
 * Run the component change detection and print a report
 */
function runComponentChangeDetection() {
	try {
		const changes = detectChangedComponents();

		if (changes.changedComponents.length === 0) {
			console.log(chalk.green("✅ No component changes detected since last check."));
			return changes;
		}

		// Print summary report
		console.log(chalk.yellow(`\n🔄 Found ${changes.changedComponents.length} changed components`));
		console.log(chalk.yellow(`📄 Potentially impacting ${changes.impactedPages.length} pages`));

		// List changed components
		console.log(chalk.cyan("\nChanged components:"));
		changes.changedComponents.forEach(component => {
			console.log(chalk.white(`- ${component.name} (${component.type}): impacts ${component.impactLevel} places`));
		});

		// List impacted pages if not too many
		if (changes.impactedPages.length > 0 && changes.impactedPages.length <= 10) {
			console.log(chalk.cyan("\nImpacted pages:"));
			changes.impactedPages.forEach(page => {
				console.log(chalk.white(`- ${page}`));
			});
		} else if (changes.impactedPages.length > 10) {
			console.log(chalk.cyan(`\nImpacted pages: ${changes.impactedPages.length} (too many to list)`));
		}

		console.log(chalk.green(`\n✅ Change detection completed. Results saved to ${CHANGES_FILE}`));

		return changes;
	} catch (error) {
		console.error(chalk.red(`❌ Error detecting component changes: ${error.message}`));
		process.exit(1);
	}
}

// Run the change detection
const changes = runComponentChangeDetection();

// Export for use by other scripts
export default changes;
