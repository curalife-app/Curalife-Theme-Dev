/**
 * Simple Shopify + Vite Development Script
 *
 * A simplified approach to integrate Shopify theme development with Vite.
 * This script:
 * 1. Builds the theme once with Vite
 * 2. Runs Shopify CLI theme dev command to serve the theme locally
 * 3. Watches files for changes and copies them to the build directory
 *
 * This simplified approach is more likely to work across different environments.
 */

import { spawn } from "child_process";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const SRC_DIR = path.join(__dirname, "src");
const BUILD_DIR = path.join(__dirname, "Curalife-Theme-Build");

// Map source directories to build directories
const dirMappings = {
	fonts: "assets",
	images: "assets",
	"styles/css": "assets",
	scripts: "assets",
	"liquid/layout": "layout",
	"liquid/sections": "sections",
	"liquid/snippets": "snippets",
	"liquid/blocks": "blocks"
};

// ANSI color codes for console output
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	red: "\x1b[31m"
};

// Utility functions
const log = (message, color = colors.blue) => {
	const timestamp = new Date().toLocaleTimeString();
	console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
};

const error = message => {
	log(`ERROR: ${message}`, colors.red);
};

// Copy a file from source to destination
const copyFile = sourcePath => {
	try {
		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Determine destination directory
		const sourceDir = Object.keys(dirMappings).find(dir => relPath.startsWith(dir));

		if (!sourceDir) {
			return;
		}

		const fileName = path.basename(sourcePath);
		const destDir = path.join(BUILD_DIR, dirMappings[sourceDir]);
		const destPath = path.join(destDir, fileName);

		// Ensure destination directory exists
		if (!fs.existsSync(destDir)) {
			fs.mkdirSync(destDir, { recursive: true });
		}

		// Copy the file
		fs.copyFileSync(sourcePath, destPath);
		log(`Copied: ${fileName} → ${dirMappings[sourceDir]}`, colors.green);
	} catch (err) {
		error(`Failed to copy ${sourcePath}: ${err.message}`);
	}
};

// Delete a file from destination when source is deleted
const deleteFile = sourcePath => {
	try {
		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Determine destination directory
		const sourceDir = Object.keys(dirMappings).find(dir => relPath.startsWith(dir));

		if (!sourceDir) {
			return;
		}

		const fileName = path.basename(sourcePath);
		const destPath = path.join(BUILD_DIR, dirMappings[sourceDir], fileName);

		// Delete the file if it exists
		if (fs.existsSync(destPath)) {
			fs.unlinkSync(destPath);
			log(`Deleted: ${fileName}`, colors.yellow);
		}
	} catch (err) {
		error(`Failed to delete ${sourcePath}: ${err.message}`);
	}
};

// Set up file watcher
const setupWatcher = () => {
	log("Setting up file watcher...", colors.magenta);

	// Create glob patterns for files to watch
	const watchPatterns = Object.keys(dirMappings).map(dir => path.join(SRC_DIR, dir, "**", "*.*"));

	// Set up watcher with chokidar
	const watcher = chokidar.watch(watchPatterns, {
		ignored: /(^|[\/\\])\../,
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
	});

	// Watch events
	watcher
		.on("add", path => copyFile(path))
		.on("change", path => copyFile(path))
		.on("unlink", path => deleteFile(path));

	log("File watcher started", colors.green);

	return watcher;
};

// Run build command
const runBuild = () => {
	return new Promise((resolve, reject) => {
		log("Building theme...", colors.magenta);

		const build = spawn("npm", ["run", "build"], { shell: true, stdio: "inherit" });

		build.on("close", code => {
			if (code === 0) {
				log("Build completed successfully", colors.green);
				resolve();
			} else {
				error(`Build failed with code ${code}`);
				reject(new Error(`Build process exited with code ${code}`));
			}
		});
	});
};

// Start Shopify theme dev
const startShopifyThemeDev = () => {
	log("Starting Shopify theme preview with development mode...", colors.magenta);

	// Convert to a path that works in Windows command line
	const buildDirPath = BUILD_DIR.replace(/\\/g, "/");
	log(`Build directory: ${buildDirPath}`, colors.cyan);

	// Try Shopify CLI theme dev command with quotes for paths containing spaces
	// Add --query parameter with dev_mode=1 to enable development mode
	const themeDev = spawn("shopify", ["theme", "dev", "--path", `"${buildDirPath}"`, "--query", "dev_mode=1"], {
		shell: true,
		stdio: "inherit"
	});

	themeDev.on("error", err => {
		error(`Failed to start Shopify theme dev: ${err.message}`);
		log("Shopify CLI may not be installed correctly. Try installing it with:", colors.yellow);
		log("npm install -g @shopify/cli @shopify/theme", colors.yellow);
	});

	return themeDev;
};

// Main function
const main = async () => {
	console.clear();
	log("=".repeat(70), colors.cyan);
	log("CURALIFE SHOPIFY THEME DEVELOPMENT", colors.magenta);
	log("=".repeat(70), colors.cyan);

	try {
		// Build the theme
		await runBuild();

		// Set up file watcher
		const watcher = setupWatcher();

		// Start Shopify theme dev
		const themeDev = startShopifyThemeDev();

		// Handle cleanup on exit
		const cleanup = () => {
			log("Shutting down...", colors.yellow);
			if (themeDev) {
				themeDev.kill();
			}
			watcher.close();
			process.exit(0);
		};

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
	} catch (err) {
		error(`Development process failed: ${err.message}`);
		process.exit(1);
	}
};

// Run the script
main();
