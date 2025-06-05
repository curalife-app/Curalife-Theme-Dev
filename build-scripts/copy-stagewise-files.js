#!/usr/bin/env node

/**
 * Copy and patch Stagewise Toolbar files
 *
 * This script copies the stagewise-toolbar files from node_modules and patches them
 * to fix browser compatibility issues and ensure proper functionality.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced logging with colors and levels
const logger = {
	info: (message, data = "") => console.log(`\x1b[36m🎭 ${message}\x1b[0m`, data),
	success: (message, data = "") => console.log(`\x1b[32m🎭 ${message}\x1b[0m`, data),
	warning: (message, data = "") => console.log(`\x1b[33m🎭 ${message}\x1b[0m`, data),
	error: (message, data = "") => console.log(`\x1b[31m🎭 ${message}\x1b[0m`, data)
};

// Configuration
const CONFIG = {
	nodeModulesPath: path.resolve(__dirname, "../node_modules/@stagewise/toolbar/dist"),
	buildAssetsPath: path.resolve(__dirname, "../Curalife-Theme-Build/assets"),
	jsFileName: "stagewise-toolbar.js",
	cssFileName: "stagewise-toolbar.css",
	possibleJsFiles: ["index.umd.cjs", "index.js", "bundle.js", "stagewise.js"],
	possibleCssFiles: ["index.css", "styles.css", "stagewise.css"]
};

// Browser compatibility polyfill
const BROWSER_POLYFILL = `
// Browser compatibility polyfill for Node.js globals
(function() {
	'use strict';

	if (typeof process === 'undefined') {
		window.process = {
			env: { NODE_ENV: 'development' },
			browser: true
		};
	}

	if (typeof global === 'undefined') {
		window.global = window;
	}

	if (typeof exports === 'undefined') {
		window.exports = {};
	}

	if (typeof module === 'undefined') {
		window.module = { exports: window.exports };
	}
})();

`;

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		logger.info(`Created directory: ${dirPath}`);
	}
}

/**
 * Find the first existing file from a list of possible files
 */
function findExistingFile(basePath, fileNames) {
	for (const fileName of fileNames) {
		const filePath = path.join(basePath, fileName);
		if (fs.existsSync(filePath)) {
			return { path: filePath, name: fileName };
		}
	}
	return null;
}

/**
 * Copy and patch JavaScript file
 */
function copyAndPatchJavaScript() {
	const sourceFile = findExistingFile(CONFIG.nodeModulesPath, CONFIG.possibleJsFiles);

	if (!sourceFile) {
		logger.warning(`No JavaScript file found in: ${CONFIG.nodeModulesPath}`);
		logger.info(`Searched for: ${CONFIG.possibleJsFiles.join(", ")}`);
		return false;
	}

	try {
		let jsContent = fs.readFileSync(sourceFile.path, "utf8");

		// Apply browser compatibility patches
		jsContent = BROWSER_POLYFILL + jsContent;

		// Additional patches for common issues
		jsContent = jsContent
			.replace(/require\(['"]([^'"]*)['"]\)/g, "window.$1 || {}") // Replace require calls
			.replace(/process\.env\.NODE_ENV/g, '"development"') // Replace process.env references
			.replace(/module\.exports\s*=/g, "window.StagewiseToolbar ="); // Ensure proper global exposure

		const destPath = path.join(CONFIG.buildAssetsPath, CONFIG.jsFileName);
		fs.writeFileSync(destPath, jsContent);

		logger.success(`Copied and patched JavaScript: ${sourceFile.name} → ${CONFIG.jsFileName}`);
		return true;
	} catch (error) {
		logger.error(`Failed to process JavaScript file: ${error.message}`);
		return false;
	}
}

/**
 * Copy CSS file
 */
function copyCssFile() {
	const sourceFile = findExistingFile(CONFIG.nodeModulesPath, CONFIG.possibleCssFiles);

	if (!sourceFile) {
		logger.warning(`No CSS file found in: ${CONFIG.nodeModulesPath}`);
		logger.info(`Searched for: ${CONFIG.possibleCssFiles.join(", ")}`);
		return false;
	}

	try {
		const destPath = path.join(CONFIG.buildAssetsPath, CONFIG.cssFileName);
		fs.copyFileSync(sourceFile.path, destPath);

		logger.success(`Copied CSS: ${sourceFile.name} → ${CONFIG.cssFileName}`);
		return true;
	} catch (error) {
		logger.error(`Failed to copy CSS file: ${error.message}`);
		return false;
	}
}

/**
 * Validate source directory
 */
function validateSourceDirectory() {
	if (!fs.existsSync(CONFIG.nodeModulesPath)) {
		logger.error(`Stagewise package not found: ${CONFIG.nodeModulesPath}`);
		logger.info("Install with: npm install --save-dev @stagewise/toolbar");
		return false;
	}

	const files = fs.readdirSync(CONFIG.nodeModulesPath);
	logger.info(`Found files in source directory: ${files.join(", ")}`);
	return true;
}

/**
 * Main execution
 */
async function main() {
	try {
		logger.info("Starting Stagewise files processing...");

		// Validate source
		if (!validateSourceDirectory()) {
			process.exit(1);
		}

		// Ensure build directory exists
		ensureDirectoryExists(CONFIG.buildAssetsPath);

		// Process files
		const jsSuccess = copyAndPatchJavaScript();
		const cssSuccess = copyCssFile();

		// Report results
		if (jsSuccess && cssSuccess) {
			logger.success("All Stagewise files processed successfully! 🎉");
		} else if (jsSuccess || cssSuccess) {
			logger.warning("Stagewise files partially processed - some files may be missing");
		} else {
			logger.error("Failed to process Stagewise files");
			process.exit(1);
		}
	} catch (error) {
		logger.error(`Unexpected error: ${error.message}`);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
