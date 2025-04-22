#!/usr/bin/env node

/**
 * Enhanced Watch Script for Curalife Theme
 *
 * This script provides a robust file watching system that:
 * 1. Watches the src directory for changes and copies files to the build directory
 * 2. Processes Tailwind CSS when style files change
 * 3. Optionally runs Shopify hot reload for combined mode
 * 4. Uses debounced file operations to prevent race conditions
 * 5. Provides clear logging and error handling
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, exec } from "child_process";
import chalk from "chalk";
import chokidar from "chokidar";
import { writeFileSync } from "fs";
import os from "os";

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

// Track child processes for cleanup
const childProcesses = [];

// Stats tracking
const stats = {
	startTime: new Date(),
	filesCopied: 0,
	filesProcessed: 0,
	errors: 0,
	lastChanges: []
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
		watch: { color: chalk.hex(draculaColors.purple), icon: "👀" }
	};

	const { color, icon } = levels[level] || levels.info;
	console.log(`${icon} ${color(message)}`);
};

// Create a cache to store Tailwind class information by file path
const tailwindClassCache = new Map();

// Helper function to extract Tailwind classes from content
const extractTailwindClasses = content => {
	const classRegex = /class=["']([^"']*)["']|className=["']([^"']*)["']/gi;
	const tailwindPatterns =
		/(?:^|\s)(bg-|text-|p-|m-|px-|py-|pt-|pb-|pr-|pl-|mx-|my-|mt-|mb-|mr-|ml-|w-|h-|min-w-|min-h-|max-w-|max-h-|flex|grid|border|rounded|shadow|opacity-|scale-|rotate-|translate-|skew-|transform|transition|duration-|delay-|ease-|animate-|cursor-|select-|resize-|sr-|ring-|blur-|brightness-|contrast-|drop-|grayscale-|hue-|invert-|saturate-|sepia-|backdrop-|!|hover:|focus:|active:|disabled:|visited:|first:|last:|odd:|even:|dark:|lg:|md:|sm:|xl:|2xl:)([^\\s]*)/gi;

	const matches = [];
	let match;

	// Extract all class and className attributes
	while ((match = classRegex.exec(content)) !== null) {
		const classString = match[1] || match[2] || "";

		// Now extract Tailwind-specific classes from the class string
		const classes = classString.split(/\s+/);
		for (const cls of classes) {
			// Check if this class matches Tailwind patterns
			if (tailwindPatterns.test(cls)) {
				matches.push(cls);
			}
		}
	}

	// Return a sorted set of unique Tailwind classes
	return [...new Set(matches)].sort().join(",");
};

// Change this line to use the system's temporary directory
const TAILWIND_READY_FLAG = path.join(os.tmpdir(), `.curalife-tailwind-ready-${Date.now()}`);

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

	console.log(chalk.hex(draculaColors.green).bold(`  THEME WATCHER - Enhanced File Watching & Build Updates`));
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
 * Combines the functionality of the old getDestinationPath and getDestinationFolder
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
			} else if (normalizedRelativePath.includes("snippets")) {
				destDir = "snippets";
			} else if (normalizedRelativePath.includes("blocks")) {
				destDir = "blocks";
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

		// Log message about the file being copied
		if (isDebugMode) {
			log(`Copying file: ${fileName} to ${path.relative(BUILD_DIR, destFolder)}`, "file");
		}

		// Copy the file
		await fs.promises.copyFile(filePath, destPath);
		stats.filesCopied++;

		// Only log detailed copied files info in debug mode
		if (isDebugMode) {
			log(`Copy successful: ${fileName} to ${destFolder}`, "file");
		}

		return true;
	} catch (error) {
		log(`Error copying file ${path.basename(filePath)}: ${error.message}`, "error");
		stats.errors++;
		return false;
	}
};

/**
 * Helper to get all files recursively
 */
const getAllFiles = async dir => {
	const files = [];
	const isDebugMode = process.argv.includes("--debug");

	try {
		const items = await fs.promises.readdir(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);

			try {
				if (item.isDirectory()) {
					const subDirFiles = await getAllFiles(fullPath);
					files.push(...subDirFiles);
				} else {
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

/**
 * Find files matching a pattern in a directory
 * @param {string} directory - The directory to search in
 * @param {string} pattern - The glob pattern to match
 * @returns {Promise<string[]>} - Array of matching file paths
 */
const findFiles = async (directory, pattern) => {
	const files = await getAllFiles(directory);

	// Simple glob pattern matching
	// Convert glob pattern to regex
	const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

	const regex = new RegExp(`^${regexPattern}$`);

	// Filter files by the pattern
	return files.filter(file => {
		// For simplified matching, just check if the filename contains the pattern parts
		const relativePath = path.relative(directory, file);

		// Handle ** pattern (any subdirectory)
		if (pattern.includes("**")) {
			const parts = pattern.split("**");
			return parts.every(part => {
				if (!part) return true; // Empty part (e.g., "**/*.js" has empty first part)
				return relativePath.includes(part.replace(/\*/g, ""));
			});
		}

		// Simple extension check for common patterns like "**/*.js"
		if (pattern.endsWith("*" + path.extname(file))) {
			return true;
		}

		return regex.test(relativePath);
	});
};

/**
 * Initial copy of all files
 */
const initialCopy = async () => {
	log("Performing initial copy of files...", "info");
	stats.filesCopied = 0;
	stats.errors = 0;
	const isDebugMode = process.argv.includes("--debug");

	// In non-debug mode, show a progress indicator
	let progressInterval;
	let progressDots = 0;

	if (!isDebugMode) {
		// Set up a progress indicator for non-debug mode
		progressInterval = setInterval(() => {
			process.stdout.write("\r");
			process.stdout.write(`${chalk.hex(draculaColors.cyan)("Copying files")}${".".repeat(progressDots)}`);
			progressDots = (progressDots + 1) % 4;
		}, 500);
	}

	try {
		// Process each source directory
		for (const srcDir of Object.keys(dirMappings)) {
			const fullSrcDir = path.join(SRC_DIR, srcDir);

			// Skip if directory doesn't exist
			if (!fs.existsSync(fullSrcDir)) {
				if (isDebugMode) {
					log(`Source directory does not exist: ${fullSrcDir}`, "warning");
				}
				continue;
			}

			try {
				// Get all files recursively
				const files = await getAllFiles(fullSrcDir);

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
	} finally {
		// Clear the progress indicator
		if (!isDebugMode && progressInterval) {
			clearInterval(progressInterval);
			// Clear the progress line
			process.stdout.write("\r");
			// Add spaces to clear the whole line
			process.stdout.write(" ".repeat(80));
			// Return to the beginning of the line
			process.stdout.write("\r");
		}
	}

	// Provide a summary of the initial copy
	if (stats.errors > 0) {
		log(`Initial copy completed with ${stats.errors} errors. (${stats.filesCopied} files copied)`, "warning");
	} else {
		log(`Initial copy complete. (${stats.filesCopied} files)`, "success");
	}

	return stats.filesCopied;
};

/**
 * Get the appropriate command based on the platform
 */
const getNpxCommand = () => {
	// On Windows, we need to use npx.cmd
	return process.platform === "win32" ? "npx.cmd" : "npx";
};

/**
 * Run Tailwind CSS processing
 */
const runTailwindBuild = async () => {
	log("Processing Tailwind CSS...", "tailwind");

	// Create or update flag file to indicate Tailwind is processing
	try {
		// Remove any existing ready flag
		if (fs.existsSync(TAILWIND_READY_FLAG)) {
			fs.unlinkSync(TAILWIND_READY_FLAG);
		}
	} catch (err) {
		// Ignore errors removing flag file
	}

	return new Promise((resolve, reject) => {
		// Use proper npx command based on platform
		const npxCommand = getNpxCommand();

		// Force development mode and explicitly disable minification for the main file
		const env = { ...process.env, NODE_ENV: "development" };

		// Run tailwindcss directly with explicit flags to disable minification
		const tailwindProcess = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--minify=false"], {
			stdio: "pipe",
			env: env,
			shell: true // Use shell on Windows for better command resolution
		});

		// Add to the list of child processes for cleanup
		childProcesses.push(tailwindProcess);

		// Capture and log stdout
		tailwindProcess.stdout.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.log(`${chalk.hex(draculaColors.cyan)("[TAILWIND] ")}${line}`);
				}
			});
		});

		// Capture and log stderr
		tailwindProcess.stderr.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.error(`${chalk.hex(draculaColors.cyan)("[TAILWIND] ")}${chalk.hex(draculaColors.red)(line)}`);
				}
			});
		});

		// Handle process completion
		tailwindProcess.on("close", code => {
			if (code === 0) {
				log("Tailwind CSS (non-minified) processed successfully", "success");

				// Now run the minified version
				log("Processing minified Tailwind CSS...", "tailwind");

				// Create minified version
				const minifyProcess = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.min.css", "--minify"], {
					stdio: "pipe",
					env: { ...process.env, NODE_ENV: "production" }, // Use production for minified version
					shell: true
				});

				// Add to the list of child processes for cleanup
				childProcesses.push(minifyProcess);

				// Capture and log stdout for minified process
				minifyProcess.stdout.on("data", data => {
					const lines = data.toString().trim().split("\n");
					lines.forEach(line => {
						if (line.trim()) {
							console.log(`${chalk.hex(draculaColors.pink)("[TAILWIND-MIN] ")}${line}`);
						}
					});
				});

				// Capture and log stderr for minified process
				minifyProcess.stderr.on("data", data => {
					const lines = data.toString().trim().split("\n");
					lines.forEach(line => {
						if (line.trim()) {
							console.error(`${chalk.hex(draculaColors.pink)("[TAILWIND-MIN] ")}${chalk.hex(draculaColors.red)(line)}`);
						}
					});
				});

				// Handle minified process completion
				minifyProcess.on("close", minCode => {
					if (minCode === 0) {
						log("Tailwind CSS (minified) processed successfully", "success");

						// Create signal file to indicate Tailwind is ready
						try {
							writeFileSync(TAILWIND_READY_FLAG, new Date().toISOString(), "utf8");
							log("Signaled Tailwind completion for browser refresh", "success");
						} catch (err) {
							log(`Error creating Tailwind ready flag: ${err.message}`, "error");
						}

						resolve();
					} else {
						log(`Tailwind CSS minified processing failed with code ${minCode}`, "error");
						// Continue with resolve since at least the non-minified version worked
						resolve();
					}
				});
			} else {
				log(`Tailwind CSS processing failed with code ${code}`, "error");
				reject(new Error(`Tailwind processing exited with code ${code}`));
			}
		});
	});
};

/**
 * Process a file change or addition
 */
const processFileChange = async filePath => {
	const isDebugMode = process.argv.includes("--debug");
	const fileName = path.basename(filePath);

	// Always log when a file change is detected
	log(`Change detected: ${fileName}`, "watch");

	// Skip processing temporary test files
	if (filePath.includes(".watcher-test")) {
		if (isDebugMode) {
			log(`Skipping watcher test file: ${filePath}`, "info");
		}
		return;
	}

	// Copy the file to the build directory - ensuring it actually gets copied
	const success = await copyFile(filePath);

	if (!success) {
		log(`Failed to copy ${fileName} to build directory`, "error");
		return;
	}

	// Tailwind 4.0: Check if file might affect styles and needs Tailwind processing
	const fileExtension = path.extname(filePath).toLowerCase();

	// CSS files that should trigger Tailwind rebuild
	const isCssFile = fileExtension === ".css" || fileExtension === ".scss";

	// Non-CSS files that might contain Tailwind classes
	const mightContainTailwindClasses = fileExtension === ".liquid" || fileExtension === ".js" || fileExtension === ".jsx" || fileExtension === ".html";

	// Check if the file path suggests it's related to styling
	const isStyleRelated = filePath.includes("styles") || filePath.includes("css") || filePath.includes("tailwind");

	// Always rebuild for CSS files or style-related content
	if (isCssFile || isStyleRelated) {
		log(`Running Tailwind because of style file change: ${fileName}`, "tailwind");
		runTailwindBuild().catch(err => {
			log(`Tailwind build error: ${err.message}`, "error");
		});
		return;
	}

	// For non-CSS files, we need to check if Tailwind classes have actually changed
	if (mightContainTailwindClasses) {
		try {
			// Read the file content
			const fileContent = fs.readFileSync(filePath, "utf8");

			// Extract Tailwind classes from the current content
			const currentTailwindClasses = extractTailwindClasses(fileContent);

			// Get previously cached Tailwind classes for this file
			const previousTailwindClasses = tailwindClassCache.get(filePath) || "";

			// Update the cache with current classes
			tailwindClassCache.set(filePath, currentTailwindClasses);

			// Only rebuild if the Tailwind classes have actually changed
			if (currentTailwindClasses !== previousTailwindClasses) {
				if (currentTailwindClasses) {
					log(`Running Tailwind because Tailwind classes changed in: ${fileName}`, "tailwind");
					if (isDebugMode && previousTailwindClasses) {
						log(`Previous classes: ${previousTailwindClasses}`, "info");
						log(`Current classes: ${currentTailwindClasses}`, "info");
					}
					runTailwindBuild().catch(err => {
						log(`Tailwind build error: ${err.message}`, "error");
					});
				} else if (previousTailwindClasses) {
					// If classes were removed entirely, also rebuild
					log(`Running Tailwind because Tailwind classes were removed from: ${fileName}`, "tailwind");
					runTailwindBuild().catch(err => {
						log(`Tailwind build error: ${err.message}`, "error");
					});
				} else {
					// No classes before or after change
					if (isDebugMode) {
						log(`No Tailwind classes detected in ${fileName}, skipping rebuild`, "info");
					}
				}
			} else if (isDebugMode) {
				if (currentTailwindClasses) {
					log(`Tailwind classes unchanged in ${fileName}, skipping rebuild`, "info");
				} else {
					log(`No Tailwind classes detected in ${fileName}, skipping rebuild`, "info");
				}
			}
		} catch (err) {
			log(`Error checking file for Tailwind classes: ${err.message}`, "error");

			// If we can't check the file, process it to be safe
			log(`Running Tailwind as fallback due to error checking: ${fileName}`, "tailwind");
			runTailwindBuild().catch(err => {
				log(`Tailwind build error: ${err.message}`, "error");
			});
		}
	}
};

/**
 * Initialize file watchers with enhanced Windows support
 */
const initializeWatchers = () => {
	log("Setting up enhanced file watcher...", "watch");
	const isDebugMode = process.argv.includes("--debug");
	const isWindows = process.platform === "win32";

	// Convert SRC_DIR to forward slashes for consistency
	const watchDir = SRC_DIR.replace(/\\/g, "/");

	log(`Setting up watcher for directory: ${watchDir}`, "watch");

	// Create Windows-optimized watcher settings
	const watchSettings = {
		ignored: [
			/(^|[\/\\])\../, // ignore dotfiles
			"**/node_modules/**", // ignore node_modules
			"**/Curalife-Theme-Build/**" // ignore build directory
		],
		persistent: true,
		ignoreInitial: true, // Don't process existing files on startup

		// Force polling on all platforms for reliability
		usePolling: true,
		interval: 100, // Poll more frequently - check every 100ms
		binaryInterval: 1000, // Poll interval for binary files
		awaitWriteFinish: false, // Don't wait for write to finish, process immediately
		ignorePermissionErrors: true, // Ignore permission issues
		alwaysStat: true, // Always stat files for better change detection

		// Add depth setting to ensure deep directory scanning
		depth: 99
	};

	if (isDebugMode) {
		log(`Watch settings: ${JSON.stringify(watchSettings, null, 2)}`, "info");
	}

	// Create watcher with optimized settings
	const watcher = chokidar.watch(watchDir, watchSettings);

	// Log when the watcher is ready
	watcher.on("ready", () => {
		log("Initial scan complete. Enhanced file watcher active and ready", "success");
		log(`Actively watching ${watchDir} for changes...`, "watch");
	});

	// Track the last Tailwind log to avoid duplicates
	let lastTailwindLog = "";
	let tailwindDoneCounter = 0;
	let shouldSuppressTailwindLogs = false;

	// Direct event handlers for file changes
	watcher
		.on("add", filePath => {
			// Always log when a file is added
			log(`New file detected: ${path.basename(filePath)}`, "watch");
			processFileChange(filePath).catch(err => {
				log(`Error processing new file: ${err.message}`, "error");
			});
		})
		.on("change", filePath => {
			// Always log when a file is changed
			log(`File changed: ${path.basename(filePath)}`, "watch");
			processFileChange(filePath).catch(err => {
				log(`Error processing changed file: ${err.message}`, "error");
			});
		})
		.on("unlink", filePath => {
			const fileName = path.basename(filePath);
			log(`File deleted: ${fileName}`, "warning");

			// Use the combined getDestination function to determine the destination path
			const { destPath } = getDestination(filePath);

			// Delete the corresponding file in the build directory
			if (destPath && fs.existsSync(destPath)) {
				try {
					fs.unlinkSync(destPath);
					log(`Deleted ${fileName} from build directory`, "file");
				} catch (err) {
					log(`Error deleting ${fileName}: ${err.message}`, "error");
				}
			}

			// If it's a CSS file, trigger Tailwind rebuild
			if ((filePath.includes("styles") || filePath.includes("css")) && (filePath.endsWith(".css") || filePath.endsWith(".scss"))) {
				runTailwindBuild().catch(err => {
					log(`Tailwind build error: ${err.message}`, "error");
				});
			}
		})
		.on("error", error => {
			log(`Watcher error: ${error}`, "error");
		});

	// Add a special file system test every 10 seconds to verify watcher is working
	const testWatcherInterval = setInterval(() => {
		if (isDebugMode) {
			log("Testing watcher functionality...", "info");
		}

		// Create a temporary test file and modify it to ensure watcher is working
		const testDir = path.join(SRC_DIR, ".watcher-test");
		const testFile = path.join(testDir, `test-${Date.now()}.tmp`);

		try {
			// Create test directory if it doesn't exist
			if (!fs.existsSync(testDir)) {
				fs.mkdirSync(testDir, { recursive: true });
			}

			// Write test file
			fs.writeFileSync(testFile, `Test file created at ${new Date().toISOString()}`);

			// Remove test file after a short delay
			setTimeout(() => {
				try {
					fs.unlinkSync(testFile);
				} catch (e) {
					// Ignore errors when cleaning up test files
				}
			}, 1000);
		} catch (e) {
			if (isDebugMode) {
				log(`Watcher test error: ${e.message}`, "error");
			}
		}
	}, 30000); // Run test every 30 seconds

	// Add the interval to childProcesses for cleanup
	childProcesses.push({ kill: () => clearInterval(testWatcherInterval) });

	return watcher;
};

/**
 * Run a script as a separate process and capture its output
 */
const runScriptAsProcess = (scriptPath, label, logLevel = "info") => {
	return new Promise((resolve, reject) => {
		// Check if the script exists
		if (!fs.existsSync(scriptPath)) {
			return reject(new Error(`Script not found: ${scriptPath}`));
		}

		log(`Starting: ${path.basename(scriptPath)} (${label})`, logLevel);

		// Add environment variable for Tailwind ready flag
		const processEnv = {
			...process.env,
			TAILWIND_READY_FLAG: TAILWIND_READY_FLAG
		};

		// Spawn a child process to run the script
		const childProcess = spawn(process.execPath, [scriptPath], {
			stdio: "pipe",
			env: processEnv
		});

		// Add to the list of child processes
		childProcesses.push(childProcess);

		// Capture and prefix stdout
		childProcess.stdout.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.log(`${logLevel === "vite" ? chalk.hex(draculaColors.purple)("[VITE] ") : chalk.hex(draculaColors.pink)("[SHOPIFY] ")}${line}`);
				}
			});
		});

		// Capture and prefix stderr
		childProcess.stderr.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.error(`${logLevel === "vite" ? chalk.hex(draculaColors.purple)("[VITE] ") : chalk.hex(draculaColors.pink)("[SHOPIFY] ")}${chalk.hex(draculaColors.red)(line)}`);
				}
			});
		});

		// Handle process exit
		childProcess.on("close", code => {
			if (code !== 0 && code !== null) {
				log(`${label} process exited with code ${code}`, "error");
				reject(new Error(`${label} process exited with code ${code}`));
			} else {
				log(`${label} process has stopped`, "warning");
				resolve();
			}
		});

		childProcess.on("error", err => {
			log(`${label} process error: ${err.message}`, "error");
			reject(err);
		});

		return childProcess;
	});
};

/**
 * Determine which script to run based on npm_lifecycle_event or env vars
 */
const determineMode = () => {
	const npmScript = process.env.npm_lifecycle_event;

	// Check if we're running in combined mode
	const isCombined = npmScript === "watch:combined" || process.env.WATCH_COMBINED === "true";

	if (isCombined) {
		log("Running in combined watch mode (watch + shopify-hot-reload)", "info");
		return "combined";
	} else {
		log("Running in standard watch mode (watch only)", "info");
		return "standard";
	}
};

/**
 * Cleanup function to terminate all child processes
 */
const cleanup = () => {
	log("Terminating all watch processes...", "warning");

	childProcesses.forEach(process => {
		if (!process.killed) {
			try {
				process.kill();
			} catch (err) {
				// Ignore errors when killing processes
			}
		}
	});

	// Remove the Tailwind ready flag file if it exists
	try {
		if (fs.existsSync(TAILWIND_READY_FLAG)) {
			fs.unlinkSync(TAILWIND_READY_FLAG);
			if (process.argv.includes("--debug")) {
				log(`Removed temporary Tailwind flag file`, "info");
			}
		}
	} catch (err) {
		// Ignore errors when removing the flag file
	}

	log("All processes terminated", "success");
	process.exit(0);
};

/**
 * Initial scan function to build the cache
 */
const buildTailwindClassCache = async () => {
	if (process.argv.includes("--debug")) {
		log("Building initial Tailwind class cache...", "tailwind");
	}

	// Find all liquid, html, and js files
	const fileTypes = [".liquid", ".html", ".js", ".jsx"];

	for (const ext of fileTypes) {
		const files = await findFiles(SRC_DIR, `**/*${ext}`);
		for (const file of files) {
			try {
				const content = fs.readFileSync(file, "utf8");
				const classes = extractTailwindClasses(content);
				if (classes) {
					tailwindClassCache.set(file, classes);
				}
			} catch (err) {
				// Silently ignore errors during initial scan
			}
		}
	}

	if (process.argv.includes("--debug")) {
		log(`Initial Tailwind class cache built with ${tailwindClassCache.size} files`, "success");
	}
};

/**
 * Main function
 */
const main = async () => {
	let watcher = null;
	let shopifyProcess = null;

	try {
		// Set environment variables
		process.env.VITE_WATCH_MODE = "true";
		process.env.VITE_VERBOSE_LOGGING = process.argv.includes("--debug") ? "true" : "false";

		// Print banner
		printBanner();

		// Ensure build directory exists
		ensureDirectoryExists(BUILD_DIR);

		// Perform initial copy of all files
		log("Starting initial file copy...", "info");
		await initialCopy();

		// Build initial Tailwind class cache
		await buildTailwindClassCache();

		// Run initial Tailwind build
		await runTailwindBuild();

		// Determine which mode to run in
		const mode = determineMode();

		// Initialize file watchers - this is the main watcher for src directory
		watcher = initializeWatchers();

		// If in combined mode, also start the Shopify hot reload
		if (mode === "combined") {
			// Wait for watcher to be fully initialized
			log("Waiting for file watcher to stabilize before starting Shopify...", "info");
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Start Shopify hot reload and properly handle the promise
			log("Starting Shopify hot reload process...", "shopify");
			try {
				shopifyProcess = await runScriptAsProcess(path.join(__dirname, "shopify-hot-reload-simple.js"), "Shopify Hot Reload", "shopify");

				// Add to child processes for proper cleanup
				if (shopifyProcess) {
					childProcesses.push(shopifyProcess);
				}

				log("Shopify hot reload process started successfully", "success");
			} catch (error) {
				log(`Failed to start Shopify hot reload: ${error.message}`, "error");
				log("Continuing in watch-only mode", "warning");
			}
		}

		// Keep the process running
		console.log("");
		console.log(chalk.hex(draculaColors.green).bold("✨ ENHANCED THEME WATCHER IS RUNNING ✨"));
		console.log(chalk.hex(draculaColors.cyan)("Source files are being watched and build folder is being automatically updated"));
		console.log(chalk.hex(draculaColors.red).bold("\nPress Ctrl+C to stop watching"));
	} catch (error) {
		log(`Error: ${error.message}`, "error");
		cleanup();
		process.exit(1);
	}
};

// Set up signal handlers
process.on("SIGINT", () => {
	log("Received SIGINT, shutting down...", "warning");
	cleanup();
});

process.on("SIGTERM", () => {
	log("Received SIGTERM, shutting down...", "warning");
	cleanup();
});

// Start the main function
main().catch(error => {
	console.error("Fatal error:", error);
	cleanup();
	process.exit(1);
});
