#!/usr/bin/env node

/**
 * Copy and patch Stagewise Toolbar files
 *
 * This script copies the stagewise-toolbar files from node_modules and patches them
 * to fix browser compatibility issues (like the 'process is not defined' error).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (message, type = "info") => {
	const colors = {
		info: "\x1b[36m", // cyan
		success: "\x1b[32m", // green
		error: "\x1b[31m", // red
		warning: "\x1b[33m" // yellow
	};
	const reset = "\x1b[0m";
	console.log(`${colors[type] || colors.info}🎭 ${message}${reset}`);
};

// Paths
const nodeModulesPath = path.resolve(__dirname, "../node_modules/@stagewise/toolbar/dist");
const buildAssetsPath = path.resolve(__dirname, "../Curalife-Theme-Build/assets");

// Ensure build assets directory exists
if (!fs.existsSync(buildAssetsPath)) {
	fs.mkdirSync(buildAssetsPath, { recursive: true });
}

try {
	// Copy and patch JavaScript file - try multiple possible source files
	const possibleJsFiles = ["index.umd.cjs", "index.js"];
	const destJsPath = path.join(buildAssetsPath, "stagewise-toolbar.js");

	let jsFileCopied = false;

	for (const fileName of possibleJsFiles) {
		const sourceJsPath = path.join(nodeModulesPath, fileName);

		if (fs.existsSync(sourceJsPath)) {
			let jsContent = fs.readFileSync(sourceJsPath, "utf8");

			// Patch the process global variable issue
			// Add a simple polyfill at the top of the file
			const processPolyfill = `
// Browser compatibility polyfill for Node.js globals
if (typeof process === 'undefined') {
  window.process = { env: { NODE_ENV: 'development' } };
}
if (typeof global === 'undefined') {
  window.global = window;
}

`;

			jsContent = processPolyfill + jsContent;

			fs.writeFileSync(destJsPath, jsContent);
			log(`Copied and patched stagewise-toolbar.js from ${fileName}`, "success");
			jsFileCopied = true;
			break;
		}
	}

	if (!jsFileCopied) {
		log(`No suitable JS file found in: ${nodeModulesPath}`, "error");
	}

	// Copy CSS file
	const sourceCssPath = path.join(nodeModulesPath, "index.css");
	const destCssPath = path.join(buildAssetsPath, "stagewise-toolbar.css");

	if (fs.existsSync(sourceCssPath)) {
		fs.copyFileSync(sourceCssPath, destCssPath);
		log(`Copied stagewise-toolbar.css`, "success");
	} else {
		log(`Source CSS file not found: ${sourceCssPath}`, "warning");
	}

	log("Stagewise files processed successfully!", "success");
} catch (error) {
	log(`Error processing stagewise files: ${error.message}`, "error");
	process.exit(1);
}
