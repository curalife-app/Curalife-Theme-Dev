#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, "../../");
const THEME_SRC_DIR = path.join(BASE_DIR, "src");
const THEME_BUILD_DIR = path.join(BASE_DIR, "Curalife-Theme-Build");
const OUTPUT_FILE = path.join(__dirname, "../history/component-registry.json");

// Configure scan locations
const COMPONENTS_DIRS = [path.join(THEME_SRC_DIR, "sections"), path.join(THEME_SRC_DIR, "snippets")];

const PAGES_DIRS = [path.join(THEME_SRC_DIR, "templates")];

// Make sure directory exists
const historyDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(historyDir)) {
	fs.mkdirSync(historyDir, { recursive: true });
}

console.log(chalk.blue("🔍 Scanning theme files for component relationships..."));

/**
 * Component Registry Builder
 *
 * This script analyzes the theme to:
 * 1. Track which components are used on which pages
 * 2. Identify dependencies between components
 * 3. Create a registry file for visual regression testing
 */

// Store component relationships
const registry = {
	components: {},
	pages: {},
	lastUpdated: new Date().toISOString()
};

/**
 * Find all sections/components in the theme
 */
function findAllComponents() {
	console.log(chalk.blue("Finding all components..."));

	const sectionFiles = globSync("**/*.liquid", { cwd: THEME_SRC_DIR, absolute: true });

	sectionFiles.forEach(filePath => {
		const relativePath = path.relative(THEME_SRC_DIR, filePath);
		const componentName = path.basename(filePath, ".liquid");

		registry.components[componentName] = {
			path: relativePath,
			usedInPages: [],
			includedBy: [],
			includesComponents: [],
			versions: detectComponentVersions(filePath)
		};
	});

	console.log(chalk.green(`Found ${Object.keys(registry.components).length} components`));
	return registry.components;
}

/**
 * Detect if a component has version variants
 */
function detectComponentVersions(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const versionMatches = content.match(/version.*["']([0-9.]+)["']/g) || [];
		const versionPattern = /if section\.settings\.version.*?=.*?["']([0-9.]+)["']/g;

		const versions = [];
		let match;
		while ((match = versionPattern.exec(content)) !== null) {
			if (match[1] && !versions.includes(match[1])) {
				versions.push(match[1]);
			}
		}

		return versions.length ? versions : ["1.0"]; // Default version
	} catch (err) {
		console.log(chalk.yellow(`Could not analyze versions for ${filePath}: ${err.message}`));
		return ["1.0"];
	}
}

/**
 * Scan theme files to identify where components are used
 */
function analyzeComponentUsage() {
	console.log(chalk.blue("Analyzing component usage..."));

	// Find all template files
	const templateFiles = globSync("**/*.liquid", { cwd: THEME_SRC_DIR, absolute: true });

	templateFiles.forEach(templatePath => {
		const content = fs.readFileSync(templatePath, "utf8");
		const templateName = path.basename(templatePath, ".liquid");

		registry.pages[templateName] = {
			path: path.relative(THEME_SRC_DIR, templatePath),
			components: []
		};

		// Find all section inclusions
		const sectionPattern = /{%\s*section\s+['"]([^'"]+)['"]/g;
		let match;
		while ((match = sectionPattern.exec(content)) !== null) {
			const sectionName = match[1];

			if (registry.components[sectionName]) {
				// Add to page's component list
				if (!registry.pages[templateName].components.includes(sectionName)) {
					registry.pages[templateName].components.push(sectionName);
				}

				// Add to component's used in pages list
				if (!registry.components[sectionName].usedInPages.includes(templateName)) {
					registry.components[sectionName].usedInPages.push(templateName);
				}
			}
		}
	});

	// Find component dependencies (one component including another)
	Object.keys(registry.components).forEach(componentName => {
		const filePath = path.join(THEME_SRC_DIR, registry.components[componentName].path);

		try {
			const content = fs.readFileSync(filePath, "utf8");

			// Find includes/renders
			const includePattern = /{%\s*(include|render)\s+['"]([^'"]+)['"]/g;
			let match;
			while ((match = includePattern.exec(content)) !== null) {
				const includedComponent = match[2];

				if (registry.components[includedComponent]) {
					// Add to component's includes list
					if (!registry.components[componentName].includesComponents.includes(includedComponent)) {
						registry.components[componentName].includesComponents.push(includedComponent);
					}

					// Add to included component's includedBy list
					if (!registry.components[includedComponent].includedBy.includes(componentName)) {
						registry.components[includedComponent].includedBy.push(componentName);
					}
				}
			}
		} catch (err) {
			console.log(chalk.yellow(`Could not analyze dependencies for ${filePath}: ${err.message}`));
		}
	});

	console.log(chalk.green(`Analyzed ${Object.keys(registry.pages).length} pages`));
}

/**
 * Generate a file mapping for visual testing
 */
function generateVisualTestingMap() {
	console.log(chalk.blue("Generating visual testing map..."));

	const testMap = {
		components: {},
		pages: [],
		lastUpdated: new Date().toISOString()
	};

	// Add all components to the map
	Object.keys(registry.components).forEach(componentName => {
		const component = registry.components[componentName];

		if (component.usedInPages.length > 0) {
			// This component is directly used in pages
			testMap.components[componentName] = {
				testPages: component.usedInPages,
				highImpact: component.usedInPages.length > 5 || component.includedBy.length > 0
			};
		}
	});

	// Create a list of essential pages to test
	Object.keys(registry.pages).forEach(pageName => {
		if (registry.pages[pageName].components.length > 0) {
			testMap.pages.push(pageName);
		}
	});

	// Store the test map with the registry
	registry.testMap = testMap;

	return testMap;
}

/**
 * Save registry to file
 */
function saveRegistry() {
	// Ensure directory exists
	const dir = path.dirname(OUTPUT_FILE);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	try {
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(registry, null, 2));
		console.log(chalk.green(`Registry saved to ${OUTPUT_FILE}`));
	} catch (err) {
		console.error(chalk.red(`Failed to save registry: ${err.message}`));
	}
}

/**
 * Run the registry builder
 */
function buildRegistry() {
	console.log(chalk.cyan("Building Component Registry"));
	console.log(chalk.cyan("---------------------------"));

	findAllComponents();
	analyzeComponentUsage();
	generateVisualTestingMap();
	saveRegistry();

	console.log(chalk.cyan("---------------------------"));
	console.log(chalk.green("Component Registry Complete"));
}

// Execute the build
buildRegistry();

export default buildRegistry;
