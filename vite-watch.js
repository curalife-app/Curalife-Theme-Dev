#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import chokidar from "chokidar";
import { exec } from "child_process";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory configuration
const SRC_DIR = path.join(__dirname, "src");
const BUILD_DIR = path.join(__dirname, "Curalife-Theme-Build");

// Directory mappings from source to destination
const dirMappings = {
	"liquid/layout": "layout",
	"liquid/sections": "sections",
	"liquid/snippets": "snippets",
	"liquid/blocks": "snippets",
	"styles/css": "assets",
	styles: "assets",
	fonts: "assets",
	images: "assets",
	scripts: "assets"
};

// Basic stats to track
const stats = {
	startTime: null,
	filesCopied: 0,
	lastChanges: [],
	errors: 0
};

// Logging utilities with colors
const logLevels = {
	info: { color: chalk.blue, icon: "ℹ️" },
	success: { color: chalk.green, icon: "✅" },
	warning: { color: chalk.yellow, icon: "⚠️" },
	error: { color: chalk.red, icon: "❌" },
	file: { color: chalk.cyan, icon: "📄" },
	watch: { color: chalk.magenta, icon: "👀" }
};

// Format time for display
const formatTime = () => {
	const now = new Date();
	return now.toLocaleTimeString();
};

// Logger function
const log = (message, level = "info") => {
	const { color, icon } = logLevels[level] || logLevels.info;
	console.log(`${icon} ${color(message)}`);
};

// Ensure a directory exists
const ensureDirectoryExists = dirPath => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		return true;
	}
	return false;
};

// Get the destination path for a file
const getDestinationPath = sourcePath => {
	const isDebugMode = process.env.DEBUG_MODE === "true";

	// Normalize the path to handle Windows backslashes
	sourcePath = path.normalize(sourcePath);

	// Calculate the relative path from the source directory
	const relativePath = path.relative(SRC_DIR, sourcePath);
	const fileName = path.basename(sourcePath);

	if (isDebugMode) {
		log(`Relative path: ${relativePath}`, "info");
	}

	// Convert paths to forward slashes for consistent comparison
	const normalizedRelativePath = relativePath.replace(/\\/g, "/");

	// First try to find an exact match with a directory mapping
	for (const srcDir of Object.keys(dirMappings)) {
		const normalizedSrcDir = srcDir.replace(/\\/g, "/");

		if (normalizedRelativePath.startsWith(normalizedSrcDir)) {
			const destDir = dirMappings[srcDir];
			// Just use the filename for a flattened structure
			return path.join(BUILD_DIR, destDir, fileName);
		}
	}

	// Special handling for liquid files
	if (fileName.endsWith(".liquid")) {
		// Check if it's a section, snippet, layout, or block
		if (normalizedRelativePath.includes("sections")) {
			return path.join(BUILD_DIR, "sections", fileName);
		} else if (normalizedRelativePath.includes("snippets") || normalizedRelativePath.includes("blocks")) {
			return path.join(BUILD_DIR, "snippets", fileName);
		} else if (normalizedRelativePath.includes("layout")) {
			return path.join(BUILD_DIR, "layout", fileName);
		} else {
			// Default to snippets for other liquid files
			return path.join(BUILD_DIR, "snippets", fileName);
		}
	}

	// Default to assets folder for any unmatched files
	if (isDebugMode) {
		log(`No mapping found for ${relativePath}, defaulting to assets folder`, "warning");
	}
	return path.join(BUILD_DIR, "assets", fileName);
};

// Copy a file from source to destination
const copyFile = async sourcePath => {
	// Normalize the path to handle Windows backslashes
	sourcePath = path.normalize(sourcePath);
	const isDebugMode = process.env.DEBUG_MODE === "true";

	try {
		// Check if the source file exists
		if (!fs.existsSync(sourcePath)) {
			if (isDebugMode) {
				log(`Source file does not exist: ${sourcePath}`, "error");
			}
			return false;
		}

		// Get file stats to check if it's a directory
		const fileStats = fs.statSync(sourcePath);
		if (fileStats.isDirectory()) {
			if (isDebugMode) {
				log(`Skipping directory: ${sourcePath}`, "info");
			}
			return false;
		}

		if (isDebugMode) {
			log(`Processing file: ${sourcePath}`, "info");
		}

		// Get the destination path
		const destPath = getDestinationPath(sourcePath);
		if (!destPath) {
			if (isDebugMode) {
				log(`Could not determine destination path for: ${sourcePath}`, "error");
			}
			return false;
		}

		// Ensure the destination directory exists
		const destDir = path.dirname(destPath);
		if (!fs.existsSync(destDir)) {
			if (isDebugMode) {
				log(`Creating directory: ${destDir}`, "info");
			}
			fs.mkdirSync(destDir, { recursive: true });
		}

		// Copy the file
		fs.copyFileSync(sourcePath, destPath);
		stats.filesCopied++;

		// Add to recent changes list (for display purposes)
		const fileName = path.basename(sourcePath);
		const destFolder = path.relative(BUILD_DIR, destDir);

		// Make sure stats.lastChanges is initialized
		if (!Array.isArray(stats.lastChanges)) {
			stats.lastChanges = [];
		}

		// Keep track of last changes for reporting
		stats.lastChanges.unshift({ file: fileName, destination: destFolder, time: new Date() });
		if (stats.lastChanges.length > 5) {
			stats.lastChanges.pop();
		}

		if (isDebugMode) {
			log(`Copied ${fileName} to ${destFolder}`, "success");
		}

		return true;
	} catch (error) {
		log(`Error copying file ${sourcePath}: ${error.message}`, "error");
		stats.errors++;
		return false;
	}
};

// Initial copy of all files
const initialCopy = async () => {
	log("Performing initial copy of files...", "info");
	stats.filesCopied = 0;
	stats.errors = 0;
	let totalFilesProcessed = 0;
	let directoriesScanned = 0;
	const isDebugMode = process.env.DEBUG_MODE === "true";

	// Process each source directory
	for (const srcDir of Object.keys(dirMappings)) {
		const fullSrcDir = path.join(SRC_DIR, srcDir);

		// Skip if directory doesn't exist
		if (!fs.existsSync(fullSrcDir)) {
			log(`Source directory does not exist: ${fullSrcDir}`, "warning");
			continue;
		}

		directoriesScanned++;

		try {
			// Get all files recursively
			const files = await getAllFiles(fullSrcDir);
			totalFilesProcessed += files.length;

			if (isDebugMode) {
				log(`Found ${files.length} files in ${srcDir}`, "info");
			}

			// Copy each file
			for (const file of files) {
				await copyFile(file);
			}
		} catch (error) {
			log(`Error scanning directory ${srcDir}: ${error.message}`, "error");
			stats.errors++;
		}
	}

	// Provide a summary of the initial copy - keep it very brief
	if (stats.errors > 0) {
		log(`Initial copy completed with ${stats.errors} errors. (${stats.filesCopied} files copied)`, "warning");
	} else {
		log(`Initial copy complete. (${stats.filesCopied} files)`, "success");
	}

	return stats.filesCopied;
};

// Helper to get all files recursively
const getAllFiles = async dir => {
	const files = [];
	const isDebugMode = process.env.DEBUG_MODE === "true";

	// Log the directory we're scanning (only in debug mode)
	if (isDebugMode) {
		log(`Scanning directory: ${dir}`, "info");
	}

	try {
		const items = await fs.promises.readdir(dir, { withFileTypes: true });
		if (isDebugMode) {
			log(`Found ${items.length} items in ${dir}`, "info");
		}

		for (const item of items) {
			const fullPath = path.join(dir, item.name);

			try {
				if (item.isDirectory()) {
					if (isDebugMode) {
						log(`Found subdirectory: ${item.name}`, "info");
					}
					const subDirFiles = await getAllFiles(fullPath);
					files.push(...subDirFiles);
				} else {
					if (isDebugMode) {
						log(`Found file: ${item.name}`, "info");
					}
					files.push(fullPath);
				}
			} catch (error) {
				log(`Error processing ${fullPath}: ${error.message}`, "error");
			}
		}
	} catch (error) {
		log(`Error reading directory ${dir}: ${error.message}`, "error");
	}

	return files;
};

// Run a build command and wait for completion
const runBuild = async () => {
	log("Running initial build:light to prepare files...", "info");
	const isDebugMode = process.env.DEBUG_MODE === "true";

	return new Promise((resolve, reject) => {
		// Set environment variables to skip cleaning
		const env = {
			...process.env,
			VITE_SKIP_CLEAN: "true",
			// Disable verbose logging for build unless in debug mode
			VITE_VERBOSE_LOGGING: isDebugMode ? "true" : "false"
		};

		// Execute the build:light command
		const child = exec("npm run build:light", { env }, (error, stdout, stderr) => {
			if (error) {
				log(`Build failed: ${error.message}`, "error");
				reject(error);
				return;
			}

			log("Initial build completed successfully", "success");
			resolve();
		});

		// Forward output for visibility only in debug mode
		if (isDebugMode) {
			child.stdout.pipe(process.stdout);
			child.stderr.pipe(process.stderr);
		}
	});
};

// Print welcome banner
const printBanner = () => {
	// Check if debug mode is enabled
	const isDebugMode = process.env.DEBUG_MODE === "true";

	// Create divider with consistent width
	const divider = "━".repeat(70);

	console.log(chalk.cyan(`\n${divider}`));
	console.log(
		chalk.yellow.bold(`
   ██████╗██╗   ██╗██████╗  █████╗ ██╗     ██╗███████╗███████╗
  ██╔════╝██║   ██║██╔══██╗██╔══██╗██║     ██║██╔════╝██╔════╝
  ██║     ██║   ██║██████╔╝███████║██║     ██║█████╗  █████╗
  ██║     ██║   ██║██╔══██╗██╔══██║██║     ██║██╔══╝  ██╔══╝
  ╚██████╗╚██████╔╝██║  ██║██║  ██║███████╗██║██║     ███████╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝`)
	);

	console.log(chalk.green.bold(`  THEME WATCHER - File: Change Detection & Build Updates`));
	console.log(isDebugMode ? chalk.red.bold(`  DEBUG MODE ENABLED - VERBOSE LOGGING ACTIVE`) : chalk.blue.bold(`  Use --debug flag for verbose logging`));

	console.log(chalk.cyan(divider));
	console.log("");
	console.log(chalk.white(`Started at: ${new Date().toLocaleTimeString()}`));

	// Only show detailed paths and system info in debug mode
	if (isDebugMode) {
		console.log(chalk.white(`Source: ${SRC_DIR}`));
		console.log(chalk.white(`Build: ${BUILD_DIR}`));
	}

	console.log(chalk.cyan(divider));
	console.log("");
};

// Initialize watchers
const initializeWatchers = () => {
	log("Setting up file watcher...", "watch");
	const isDebugMode = process.env.DEBUG_MODE === "true";

	// Watch the entire src directory for better consistency
	const watchDir = SRC_DIR.replace(/\\/g, "/");
	log(`Setting up watcher for directory: ${watchDir}`, "watch");

	// Create watcher with optimized settings
	const watcher = chokidar.watch(watchDir, {
		ignored: [
			/(^|[\/\\])\../, // ignore dotfiles
			"**/node_modules/**", // ignore node_modules
			"**/Curalife-Theme-Build/**" // ignore build directory
		],
		persistent: true,
		ignoreInitial: true, // Don't process existing files on startup

		// Better detection settings for consistency with main watch.js
		usePolling: true, // Always use polling for better reliability
		interval: 100, // Poll more frequently - check every 100ms
		binaryInterval: 1000, // Poll interval for binary files
		awaitWriteFinish: false, // Don't wait for write to finish for better response time
		ignorePermissionErrors: true, // Ignore permission issues
		alwaysStat: true, // Always stat files for better change detection
		depth: 99 // Handle deep directories
	});

	// Use a flag to ensure we only log the ready message once
	let hasLoggedReadyMessage = false;

	// Log when the watcher is ready
	watcher.on("ready", () => {
		if (!hasLoggedReadyMessage) {
			log("Initial scan complete. File watcher active and ready", "success");
			log(`Actively watching ${watchDir} for changes...`, "watch");
			hasLoggedReadyMessage = true;
		}
	});

	// Direct event handlers for file changes
	watcher
		.on("add", filePath => {
			// Normalize path for logging
			const fileName = path.basename(filePath);
			log(`New file detected: ${fileName}`, "info");
			copyFile(filePath);
		})
		.on("change", filePath => {
			// Normalize path for logging
			const fileName = path.basename(filePath);
			log(`File changed: ${fileName}`, "info");
			copyFile(filePath);
		})
		.on("unlink", filePath => {
			// Normalize path for logging
			const fileName = path.basename(filePath);
			log(`File deleted: ${fileName}`, "warning");
			const destPath = getDestinationPath(filePath);
			// Delete the corresponding file in the build directory
			if (destPath && fs.existsSync(destPath)) {
				try {
					fs.unlinkSync(destPath);
					log(`Deleted ${fileName} from build directory`, "info");
				} catch (err) {
					log(`Error deleting ${fileName}: ${err.message}`, "error");
				}
			}
		})
		.on("error", error => {
			log(`Watcher error: ${error}`, "error");
		});

	return watcher;
};

// Main function
const main = async () => {
	let watcher = null;

	// Set environment variables
	process.env.VITE_WATCH_MODE = "true";

	// Check if debug mode is enabled via command line arguments
	const debugMode = process.argv.includes("--debug");
	process.env.DEBUG_MODE = debugMode ? "true" : "false";

	if (debugMode) {
		log("Debug mode enabled - verbose logging active", "info");
	}

	// Handle process termination
	const cleanup = () => {
		if (watcher) {
			watcher.close();
		}
		log("Watch process terminated", "warning");
	};

	process.on("SIGINT", () => {
		log("Received SIGINT, shutting down...", "warning");
		cleanup();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		log("Received SIGTERM, shutting down...", "warning");
		cleanup();
		process.exit(0);
	});

	try {
		// Print banner
		printBanner();

		// Set start time
		stats.startTime = new Date();

		// Log system information in debug mode
		if (debugMode) {
			log(`Node.js version: ${process.version}`, "info");
			log(`Operating System: ${process.platform} ${process.arch}`, "info");
			log(`Source directory: ${SRC_DIR}`, "info");
			log(`Build directory: ${BUILD_DIR}`, "info");
		}

		// Ensure build directory exists
		ensureDirectoryExists(BUILD_DIR);

		// Perform initial copy of all files
		log("Starting initial file copy...", "info");
		await initialCopy();

		// Initialize file watchers
		watcher = initializeWatchers();

		// Keep the process running
		console.log("");
		console.log(chalk.bold.green("✨ THEME WATCHER IS RUNNING ✨"));
		console.log(chalk.cyan("Your build folder is now being watched and automatically updated"));
		console.log(chalk.red.bold("\nPress Ctrl+C to stop watching"));
	} catch (error) {
		log(`Error: ${error.message}`, "error");
		cleanup();
		process.exit(1);
	}
};

// Run the main function
main().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});
