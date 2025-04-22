#!/usr/bin/env node

/**
 * Complete Build Script for Curalife Theme
 *
 * This script provides a one-time build process that:
 * 1. Copies files from src directory to the build directory
 * 2. Processes Tailwind CSS
 * 3. Follows the same structure and patterns as the watch.js script
 * 4. Provides clear logging and error handling
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, exec } from "child_process";
import chalk from "chalk";
import { glob } from "glob";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, "src");
const BUILD_DIR = path.join(__dirname, "Curalife-Theme-Build");

// Dracula Theme Colors
const draculaColors = {
	background: "#282A36",
	currentLine: "#44475A",
	foreground: "#F8F8F2",
	comment: "#6272A4",
	cyan: "#8BE9FD",
	green: "#50FA7B",
	orange: "#FFB86C",
	pink: "#FF79C6",
	purple: "#BD93F9",
	red: "#FF5555",
	yellow: "#F1FA8C"
};

// Directory mappings from source to destination
const dirMappings = {
	"liquid/layout": "layout",
	"liquid/sections": "sections",
	"liquid/snippets": "snippets",
	"liquid/blocks": "blocks",
	"styles/css": "assets",
	styles: "assets",
	fonts: "assets",
	images: "assets",
	scripts: "assets"
};

// Stats tracking
const stats = {
	startTime: new Date(),
	filesCopied: 0,
	filesProcessed: 0,
	errors: 0
};

// Logging configuration
const log = (message, level = "info") => {
	const levels = {
		info: { color: chalk.hex(draculaColors.cyan), icon: "ℹ️" },
		success: { color: chalk.hex(draculaColors.green), icon: "✅" },
		warning: { color: chalk.hex(draculaColors.orange), icon: "⚠️" },
		error: { color: chalk.hex(draculaColors.red), icon: "❌" },
		vite: { color: chalk.hex(draculaColors.purple), icon: "🔄" },
		shopify: { color: chalk.hex(draculaColors.pink), icon: "🛒" },
		tailwind: { color: chalk.hex(draculaColors.cyan), icon: "🎨" },
		file: { color: chalk.hex(draculaColors.yellow), icon: "📄" },
		build: { color: chalk.hex(draculaColors.purple), icon: "🔨" }
	};

	const { color, icon } = levels[level] || levels.info;
	console.log(`${icon} ${color(message)}`);
};

/**
 * Print welcome banner
 */
const printBanner = () => {
	const isDebugMode = process.argv.includes("--debug");
	const divider = "━".repeat(70);

	console.log(chalk.hex(draculaColors.cyan)(`\n${divider}`));
	console.log(
		chalk.hex(draculaColors.pink).bold(`
   ██████╗██╗   ██╗██████╗  █████╗ ██╗     ██╗███████╗███████╗
  ██╔════╝██║   ██║██╔══██╗██╔══██╗██║     ██║██╔════╝██╔════╝
  ██║     ██║   ██║██████╔╝███████║██║     ██║█████╗  █████╗
  ██║     ██║   ██║██╔══██╗██╔══██║██║     ██║██╔══╝  ██╔══╝
  ╚██████╗╚██████╔╝██║  ██║██║  ██║███████╗██║██║     ███████╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝`)
	);

	console.log(chalk.hex(draculaColors.green).bold(`  THEME BUILDER - Complete Build Process`));
	console.log(isDebugMode ? chalk.hex(draculaColors.red).bold(`  DEBUG MODE ENABLED - VERBOSE LOGGING ACTIVE`) : chalk.hex(draculaColors.purple).bold(`  Use --debug flag for verbose logging`));

	console.log(chalk.hex(draculaColors.cyan)(divider));
	console.log("");
	console.log(chalk.hex(draculaColors.foreground)(`Started at: ${new Date().toLocaleTimeString()}`));

	if (isDebugMode) {
		console.log(chalk.hex(draculaColors.comment)(`Source: ${SRC_DIR}`));
		console.log(chalk.hex(draculaColors.comment)(`Build: ${BUILD_DIR}`));
		console.log(chalk.hex(draculaColors.comment)(`Node.js version: ${process.version}`));
		console.log(chalk.hex(draculaColors.comment)(`Operating system: ${process.platform}`));
	}

	console.log(chalk.hex(draculaColors.cyan)(divider));
	console.log("");
};

/**
 * Ensure a directory exists
 */
const ensureDirectoryExists = dirPath => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		return true;
	}
	return false;
};

/**
 * Get the destination path for a file
 * @param {string} sourcePath - The source file path
 * @returns {Object} - Object containing destPath and destFolder
 */
const getDestination = sourcePath => {
	const isDebugMode = process.argv.includes("--debug");

	// Normalize the path to handle Windows backslashes
	sourcePath = path.normalize(sourcePath);

	// Calculate the relative path from the source directory
	const relativePath = path.relative(SRC_DIR, sourcePath);
	const fileName = path.basename(sourcePath);

	if (isDebugMode) {
		log(`Processing relative path: ${relativePath}`, "info");
	}

	// Find which source directory this file belongs to
	let destDir = null;

	// First try to find an exact match with a directory mapping
	// Convert paths to forward slashes for consistent comparison
	const normalizedRelativePath = relativePath.replace(/\\/g, "/");

	for (const srcDir of Object.keys(dirMappings)) {
		const normalizedSrcDir = srcDir.replace(/\\/g, "/");

		if (normalizedRelativePath.startsWith(normalizedSrcDir)) {
			destDir = dirMappings[srcDir];
			if (isDebugMode) {
				log(`Found mapping: ${srcDir} -> ${destDir}`, "info");
			}
			break;
		}
	}

	// If no mapping found, determine by file extension
	if (!destDir) {
		// Special handling for liquid files
		if (fileName.endsWith(".liquid")) {
			// Check if it's a section, snippet, layout, or block
			if (normalizedRelativePath.includes("sections")) {
				destDir = "sections";
			} else if (normalizedRelativePath.includes("snippets") || normalizedRelativePath.includes("blocks")) {
				destDir = "snippets";
			} else if (normalizedRelativePath.includes("layout")) {
				destDir = "layout";
			} else {
				// Default to snippets for other liquid files
				destDir = "snippets";
			}

			if (isDebugMode) {
				log(`Liquid file detected: ${fileName}, using folder: ${destDir}`, "info");
			}
		} else {
			// Default to assets for any unmatched files
			destDir = "assets";

			if (isDebugMode) {
				log(`No mapping found for ${relativePath}, defaulting to assets folder`, "warning");
			}
		}
	}

	const destFolder = path.join(BUILD_DIR, destDir);
	const destPath = path.join(destFolder, fileName);

	return { destPath, destFolder, destDir };
};

/**
 * Copy a file from source to destination
 * @param {string} filePath - The source file path
 * @returns {Promise<boolean>} - Whether the file was copied successfully
 */
const copyFile = async filePath => {
	const isDebugMode = process.argv.includes("--debug");

	try {
		// Check if the source file exists
		if (!fs.existsSync(filePath)) {
			if (isDebugMode) {
				log(`Source file does not exist: ${filePath}`, "error");
			}
			return false;
		}

		// Get file stats to check if it's a directory
		const fileStats = fs.statSync(filePath);
		if (fileStats.isDirectory()) {
			if (isDebugMode) {
				log(`Skipping directory: ${filePath}`, "info");
			}
			return false;
		}

		const fileName = path.basename(filePath);

		if (isDebugMode) {
			log(`Processing file: ${filePath}`, "info");
		}

		// Get the destination folder using the helper function
		const { destPath, destFolder, destDir } = getDestination(filePath);

		if (!destFolder) {
			log(`Could not determine destination folder for: ${fileName}`, "error");
			return false;
		}

		// Create the destination folder if it doesn't exist
		await fs.promises.mkdir(destFolder, { recursive: true });

		// Copy the file
		await fs.promises.copyFile(filePath, destPath);
		stats.filesCopied++;

		if (isDebugMode) {
			log(`Copied: ${filePath} -> ${destPath}`, "success");
		}
		return true;
	} catch (error) {
		stats.errors++;
		log(`Error copying file ${filePath}: ${error.message}`, "error");
		return false;
	}
};

/**
 * Find and copy all files from source to destination
 */
const copyAllFiles = async () => {
	const isDebugMode = process.argv.includes("--debug");
	log("Copying all files to build directory...", "build");

	try {
		// Create the build directory if it doesn't exist
		ensureDirectoryExists(BUILD_DIR);

		// Find all files in the source directory
		const files = await glob("**/*", { cwd: SRC_DIR, nodir: true });

		log(`Found ${files.length} files to process`, "info");

		// Copy each file
		let copied = 0;
		for (const relativeFilePath of files) {
			const sourceFilePath = path.join(SRC_DIR, relativeFilePath);
			const success = await copyFile(sourceFilePath);

			if (success) copied++;

			// Log progress every 50 files
			if (copied % 50 === 0 && copied > 0) {
				log(`Processed ${copied}/${files.length} files...`, "info");
			}
		}

		log(`Copied ${copied} files successfully`, "success");
		return true;
	} catch (error) {
		stats.errors++;
		log(`Error copying files: ${error.message}`, "error");
		return false;
	}
};

/**
 * Get the appropriate npx command based on the environment
 */
const getNpxCommand = () => {
	return process.platform === "win32" ? "npx.cmd" : "npx";
};

/**
 * Run the Tailwind build process
 */
const runTailwindBuild = async () => {
	log("Building Tailwind CSS...", "tailwind");

	return new Promise((resolve, reject) => {
		const npxCommand = getNpxCommand();

		// Use different approach for Windows
		let buildCommand;
		if (process.platform === "win32") {
			// For Windows, use exec instead of spawn
			buildCommand = exec(`${npxCommand} tailwindcss -i ./src/styles/tailwind.css -o ./Curalife-Theme-Build/assets/tailwind.css --minify`);
		} else {
			buildCommand = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--minify"]);
		}

		buildCommand.stdout.on("data", data => {
			const output = data.toString().trim();
			if (output) log(output, "tailwind");
		});

		buildCommand.stderr.on("data", data => {
			const output = data.toString().trim();
			if (output) log(output, "error");
		});

		buildCommand.on("close", code => {
			if (code === 0) {
				log("Tailwind CSS built successfully", "success");
				resolve();
			} else {
				stats.errors++;
				log(`Tailwind CSS build failed with code ${code}`, "error");
				reject(new Error(`Tailwind CSS build failed with code ${code}`));
			}
		});
	});
};

/**
 * Run Vite build for scripts and other assets
 */
const runViteBuild = async () => {
	log("Running Vite build...", "vite");

	return new Promise((resolve, reject) => {
		// Set environment variables for the Vite build
		const env = {
			...process.env,
			NODE_ENV: "production",
			VITE_SKIP_CLEAN: "true", // Skip cleaning since we've already copied files
			VITE_VERBOSE_LOGGING: process.argv.includes("--debug") ? "true" : "false"
		};

		// Use different approach for Windows
		let viteCommand;
		if (process.platform === "win32") {
			// For Windows, use exec instead of spawn
			viteCommand = exec("vite build", { env });
		} else {
			viteCommand = spawn("vite", ["build"], { env });
		}

		viteCommand.stdout.on("data", data => {
			const output = data.toString().trim();
			if (output) log(output, "vite");
		});

		viteCommand.stderr.on("data", data => {
			const output = data.toString().trim();
			if (output) log(output, "error");
		});

		viteCommand.on("close", code => {
			if (code === 0) {
				log("Vite build completed successfully", "success");
				resolve();
			} else {
				stats.errors++;
				log(`Vite build failed with code ${code}`, "error");
				reject(new Error(`Vite build failed with code ${code}`));
			}
		});
	});
};

/**
 * Print build summary
 */
const printSummary = () => {
	const endTime = new Date();
	const duration = (endTime - stats.startTime) / 1000;

	console.log(chalk.hex(draculaColors.cyan)(`\n${"━".repeat(70)}`));
	console.log(chalk.hex(draculaColors.green).bold(`  BUILD COMPLETED in ${duration.toFixed(2)} seconds`));
	console.log(chalk.hex(draculaColors.cyan)(`${"━".repeat(70)}`));
	console.log("");
	console.log(chalk.hex(draculaColors.yellow)(`Files copied: ${stats.filesCopied}`));

	if (stats.errors > 0) {
		console.log(chalk.hex(draculaColors.red)(`Errors encountered: ${stats.errors}`));
	} else {
		console.log(chalk.hex(draculaColors.green)(`Build completed successfully with no errors!`));
	}
	console.log("");
};

/**
 * Main function to execute the build process
 */
const main = async () => {
	try {
		// Print welcome banner
		printBanner();

		// Copy all files from source to destination
		await copyAllFiles();

		// Run Tailwind build
		await runTailwindBuild();

		// Run Vite build (for scripts and other assets)
		// Skip this step if --no-vite flag is provided
		if (!process.argv.includes("--no-vite")) {
			await runViteBuild();
		}

		// Print build summary
		printSummary();

		process.exit(stats.errors > 0 ? 1 : 0);
	} catch (error) {
		log(`Build failed: ${error.message}`, "error");
		process.exit(1);
	}
};

// Execute the main function
main();
