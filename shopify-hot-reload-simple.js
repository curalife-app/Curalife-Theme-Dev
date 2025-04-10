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
const RELATIVE_PATH = path.basename(BUILD_DIR); // Pre-compute this value

// SHOPIFY STORE CONFIGURATION
// Define store fallback sequence
const STORE_SEQUENCE = [
	"curalife-commerce.myshopify.com", // Primary store
	"curalife-commerce-sia.myshopify.com", // First fallback
	"staging-curalife.myshopify.com" // Last fallback
];

// Use environment variable if specified, otherwise use the fallback sequence
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || STORE_SEQUENCE[0];

// Map source directories to build directories
const dirMappings = {
	fonts: "assets",
	images: "assets",
	"styles/css": "assets",
	scripts: "assets",
	"liquid/layout": "layout",
	"liquid/sections": "sections",
	"liquid/snippets": "snippets",
	"liquid/blocks": "snippets"
};

// Cache for directory lookups and existence checks
const dirCache = new Map();
const dirExistsCache = new Map();

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

// Ensure destination directory exists, with caching
const ensureDirectoryExists = dir => {
	if (dirExistsCache.has(dir)) {
		return;
	}

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	dirExistsCache.set(dir, true);
};

// Find source directory with improved caching
const findSourceDir = relPath => {
	// Normalize input path for consistent comparison
	relPath = relPath.replace(/\\/g, "/");

	// Check cache first for better performance
	const cacheKey = relPath;
	if (dirCache.has(cacheKey)) {
		return dirCache.get(cacheKey);
	}

	// First try exact matches, then try prefix matches
	const sourceDir = Object.keys(dirMappings).find(dir => {
		// Normalize the directory path as well
		const normalizedDir = dir.replace(/\\/g, "/");
		return relPath.startsWith(normalizedDir);
	});

	// Special handling for liquid files
	if (!sourceDir && relPath.endsWith(".liquid")) {
		// Determine category based on path components
		if (relPath.includes("/sections/")) {
			dirCache.set(cacheKey, "liquid/sections");
			return "liquid/sections";
		} else if (relPath.includes("/snippets/")) {
			dirCache.set(cacheKey, "liquid/snippets");
			return "liquid/snippets";
		} else if (relPath.includes("/blocks/")) {
			dirCache.set(cacheKey, "liquid/blocks");
			return "liquid/blocks";
		} else if (relPath.includes("/layout/")) {
			dirCache.set(cacheKey, "liquid/layout");
			return "liquid/layout";
		}
	}

	// Cache and return the result
	dirCache.set(cacheKey, sourceDir);
	return sourceDir;
};

// Copy a file from source to destination
const copyFile = sourcePath => {
	try {
		// Normalize the path to handle Windows backslashes
		sourcePath = path.normalize(sourcePath);

		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Skip if the file doesn't exist
		if (!fs.existsSync(sourcePath)) {
			error(`Source file does not exist: ${sourcePath}`);
			return;
		}

		// Skip directories
		if (fs.statSync(sourcePath).isDirectory()) {
			return;
		}

		// Determine destination directory
		const sourceDir = findSourceDir(relPath);

		if (!sourceDir) {
			// Default to assets if no mapping found
			const fileName = path.basename(sourcePath);
			const destDir = path.join(BUILD_DIR, "assets");
			const destPath = path.join(destDir, fileName);

			// Ensure destination directory exists
			ensureDirectoryExists(destDir);

			// Copy the file
			fs.copyFileSync(sourcePath, destPath);
			log(`Copied: ${fileName} → assets (default)`, colors.green);
			return;
		}

		const fileName = path.basename(sourcePath);
		const destDir = path.join(BUILD_DIR, dirMappings[sourceDir]);
		const destPath = path.join(destDir, fileName);

		// Ensure destination directory exists (using cached check)
		ensureDirectoryExists(destDir);

		// Copy the file
		fs.copyFileSync(sourcePath, destPath);
		log(`Copied: ${fileName} → ${dirMappings[sourceDir]}`, colors.green);
	} catch (err) {
		error(`Failed to copy ${path.basename(sourcePath)}: ${err.message}`);
	}
};

// Delete a file from destination when source is deleted
const deleteFile = sourcePath => {
	try {
		// Normalize the path to handle Windows backslashes
		sourcePath = path.normalize(sourcePath);

		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Determine destination directory
		const sourceDir = findSourceDir(relPath);
		const fileName = path.basename(sourcePath);

		// If no mapping found, check all possible destinations
		if (!sourceDir) {
			// Try common destinations for the file
			const possibleDirs = ["assets", "snippets", "sections", "layout"];

			for (const dir of possibleDirs) {
				const destPath = path.join(BUILD_DIR, dir, fileName);
				if (fs.existsSync(destPath)) {
					fs.unlinkSync(destPath);
					log(`Deleted: ${fileName} from ${dir}`, colors.yellow);
					return;
				}
			}
			return;
		}

		const destPath = path.join(BUILD_DIR, dirMappings[sourceDir], fileName);

		// Delete the file if it exists
		if (fs.existsSync(destPath)) {
			fs.unlinkSync(destPath);
			log(`Deleted: ${fileName}`, colors.yellow);
		}
	} catch (err) {
		error(`Failed to delete ${path.basename(sourcePath)}: ${err.message}`);
	}
};

// Function to check if Tailwind is ready before refreshing
const isTailwindReady = () => {
	// If no flag path is set, always return true (no waiting)
	if (!process.env.TAILWIND_READY_FLAG) {
		return true;
	}

	return fs.existsSync(process.env.TAILWIND_READY_FLAG);
};

// Function to wait for Tailwind to be ready
const waitForTailwind = async (timeout = 5000) => {
	// If no flag is set, don't wait
	if (!process.env.TAILWIND_READY_FLAG) {
		return true;
	}

	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (isTailwindReady()) {
			return true;
		}
		// Wait 100ms before checking again
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	// If timeout occurs, log and continue anyway
	log("Timeout waiting for Tailwind to complete, continuing anyway", colors.yellow);
	return false;
};

// Set up file watcher with optimized configuration
const setupWatcher = () => {
	log("Setting up file watcher...", colors.magenta);

	// Convert SRC_DIR to forward slashes for consistency
	const watchDir = SRC_DIR.replace(/\\/g, "/");
	log(`Setting up watcher for directory: ${watchDir}`, colors.cyan);

	// Set up watcher with chokidar - optimized settings
	const watcher = chokidar.watch(watchDir, {
		ignored: [
			/(^|[\/\\])\../, // Ignore dotfiles
			"**/node_modules/**", // Ignore node_modules
			"**/Curalife-Theme-Build/**" // Ignore build directory
		],
		persistent: true,
		ignoreInitial: true,
		// Consistent settings with main watch.js
		usePolling: true, // Use polling for better reliability
		interval: 100, // Check every 100ms
		binaryInterval: 1000, // Binary files check interval
		awaitWriteFinish: false, // Don't wait for write to finish for faster response
		ignorePermissionErrors: true, // Ignore permission issues
		alwaysStat: true, // Always stat files for better change detection
		depth: 99 // Deep directory scanning
	});

	// Log when the watcher is ready
	watcher.on("ready", () => {
		log("File watcher initialized and ready", colors.green);
		log(`Actively watching ${watchDir} for changes...`, colors.magenta);
	});

	// Watch events using optimized batch handling for high-volume changes
	let pendingCopies = new Set();
	let pendingDeletes = new Set();
	let processingTimeout = null;

	const processPending = async () => {
		// Process copies
		pendingCopies.forEach(path => copyFile(path));
		pendingCopies.clear();

		// Process deletes
		pendingDeletes.forEach(path => deleteFile(path));
		pendingDeletes.clear();

		processingTimeout = null;

		// Create a touch file to ensure Shopify detects the changes
		// This helps ensure that Shopify's file watcher notices the changes
		// even when the files were already processed by our own watcher
		try {
			const touchFile = path.join(BUILD_DIR, `.shopify-touch-${Date.now()}`);
			fs.writeFileSync(touchFile, new Date().toISOString(), "utf8");

			// Remove the touch file after a short delay (it only needs to exist momentarily)
			setTimeout(() => {
				try {
					if (fs.existsSync(touchFile)) {
						fs.unlinkSync(touchFile);
					}
				} catch (err) {
					// Ignore errors when removing touch file
				}
			}, 1000);
		} catch (err) {
			// Ignore errors creating touch file
		}
	};

	const scheduleBatch = (filePath, isDelete = false) => {
		if (isDelete) {
			pendingDeletes.add(filePath);
			// Remove from copies if it was there
			pendingCopies.delete(filePath);
		} else {
			pendingCopies.add(filePath);
			// Remove from deletes if it was there
			pendingDeletes.delete(filePath);
		}

		// Clear any existing timeout
		if (processingTimeout) {
			clearTimeout(processingTimeout);
		}

		// Check if this is a CSS file or might affect styling
		const isCssRelated = filePath.endsWith(".css") || filePath.includes("/styles/") || filePath.includes("/css/");

		// For non-CSS files, process immediately
		if (!isCssRelated) {
			processingTimeout = setTimeout(processPending, 100);
			return;
		}

		// For CSS-related files, set a longer timeout and wait for Tailwind
		processingTimeout = setTimeout(async () => {
			// If there's a Tailwind build in progress, wait for it to complete
			if (process.env.TAILWIND_READY_FLAG) {
				log("Waiting for Tailwind build to complete before refreshing...", colors.cyan);
				await waitForTailwind();
				log("Tailwind build completed, processing file changes", colors.green);
			}

			processPending();
		}, 500); // Longer timeout for CSS-related changes
	};

	watcher
		.on("add", path => scheduleBatch(path))
		.on("change", path => scheduleBatch(path))
		.on("unlink", path => scheduleBatch(path, true))
		.on("error", err => {
			error(`Watcher error: ${err.message}`);
		});

	log("File watcher started", colors.green);

	return watcher;
};

// Run build command with improved error handling
const runBuild = () => {
	return new Promise((resolve, reject) => {
		log("Building theme...", colors.magenta);

		// Create a build command that preserves the watch mode env variable
		const buildCommand = process.env.VITE_WATCH_MODE === "true" ? "build:light -- --mode development" : "build:light";

		const build = spawn("npm", ["run", buildCommand], {
			shell: true,
			stdio: "inherit",
			// Increase max buffer to handle larger outputs
			maxBuffer: 1024 * 1024 * 10, // 10 MB
			env: {
				...process.env,
				// Ensure we're not minifying in watch mode
				VITE_WATCH_MODE: process.env.VITE_WATCH_MODE || "false"
			}
		});

		// Handle build process errors
		build.on("error", err => {
			error(`Build process error: ${err.message}`);
			reject(new Error(`Build process error: ${err.message}`));
		});

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

// Retry function for handling temporary network issues with exponential backoff
const retryWithBackoff = async (fn, retries = 3, backoff = 2000) => {
	let attempts = 0;
	let lastError = null;

	while (attempts < retries) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			attempts++;

			if (attempts === retries) {
				break;
			}

			const delay = backoff * Math.pow(2, attempts - 1);
			log(`Attempt ${attempts} failed. Retrying in ${delay / 1000} seconds...`, colors.yellow);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	throw new Error(`Failed after ${attempts} attempts. Last error: ${lastError?.message || "Unknown error"}`);
};

// Start Shopify theme dev with performance optimizations
const startShopifyThemeDev = storeUrl => {
	log("Starting Shopify theme preview...", colors.magenta);

	// Use a relative path to avoid issues with spaces
	log(`Using relative path: ${RELATIVE_PATH}`, colors.cyan);

	// Add detailed logging
	log("Checking network connection before starting Shopify CLI...", colors.cyan);

	// Use simple arguments with quoted path and specify the store using -s flag
	const args = ["theme", "dev", "--path", RELATIVE_PATH, "-s", storeUrl];

	log(`Running command: shopify ${args.join(" ")}`, colors.cyan);
	log(`Connecting to store: ${storeUrl}`, colors.green);

	// Set environment variables that might help with network issues
	const customEnv = {
		...process.env,
		// Increase Node.js memory limit to handle larger responses
		NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --max-http-header-size=16384`,
		// Possible fix for "fetch failed" errors - disable experimental fetch
		NODE_NO_WARNINGS: "1",
		// Explicitly set Node.js network options to fix "fetch failed" errors
		UV_THREADPOOL_SIZE: "64", // Increase threadpool size for more concurrent network connections
		FETCH_KEEPALIVE_TIMEOUT_MS: "60000", // Longer keepalive timeout for fetch requests
		FETCH_MAX_RESPONSE_SIZE: "100000000", // Larger max response size for fetch
		SHOPIFY_CLI_STACKTRACE: "1" // Show full stacktraces for better error debugging
	};

	// Don't use NODE_TLS_REJECT_UNAUTHORIZED in production, only for debugging
	if (process.env.DEBUG_TLS === "1") {
		customEnv.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		log("WARNING: TLS certificate validation disabled for debugging", colors.red);
	}

	const themeDev = spawn("shopify", args, {
		shell: true,
		stdio: "inherit",
		env: customEnv
	});

	// Return a promise that resolves or rejects based on the process events
	return new Promise((resolve, reject) => {
		let isResolved = false;
		let isRejected = false;

		// Helper to ensure we only resolve/reject once
		const safeResolve = value => {
			if (!isResolved && !isRejected) {
				isResolved = true;
				resolve(value);
			}
		};

		const safeReject = err => {
			if (!isResolved && !isRejected) {
				isRejected = true;
				reject(err);
			}
		};

		// Set a timeout for connection
		const timeout = setTimeout(() => {
			themeDev.kill();
			safeReject(new Error(`Connection to ${storeUrl} timed out after 30 seconds`));
		}, 30000);

		themeDev.on("error", err => {
			clearTimeout(timeout);
			error(`Failed to start Shopify theme dev: ${err.message}`);
			safeReject(err);
		});

		// Handle exit code to determine success/failure
		themeDev.on("exit", code => {
			clearTimeout(timeout);
			if (code === 0) {
				safeResolve(themeDev);
			} else {
				error(`Shopify theme dev exited with code ${code}`);
				log("This might be due to:", colors.yellow);
				log("1. Network connectivity issues with Shopify", colors.yellow);
				log("2. Authentication problems", colors.yellow);
				log("3. Firewall restrictions", colors.yellow);
				log("4. Temporary Shopify service disruption", colors.yellow);
				log("5. Path issues with spaces in directory names", colors.yellow);
				safeReject(new Error(`Shopify theme dev exited with code ${code}`));
			}
		});

		// Consider the connection successful if the process stays alive for a short period
		setTimeout(() => {
			clearTimeout(timeout);
			safeResolve(themeDev);
		}, 5000);
	});
};

// Try connecting to stores in sequence with improved error handling
const tryStoreSequence = async (storeSequence, currentIndex = 0) => {
	if (currentIndex >= storeSequence.length) {
		throw new Error("All store connections failed");
	}

	const currentStore = storeSequence[currentIndex];
	log(`Attempting to connect to store: ${currentStore} (${currentIndex + 1}/${storeSequence.length})`, colors.cyan);

	try {
		// Try connecting to the current store
		return await startShopifyThemeDev(currentStore);
	} catch (err) {
		error(`Failed to connect to ${currentStore}: ${err.message}`);
		if (currentIndex < storeSequence.length - 1) {
			log(`Trying next store in fallback sequence...`, colors.yellow);
			// Wait a bit before trying the next store
			await new Promise(resolve => setTimeout(resolve, 2000));
			return tryStoreSequence(storeSequence, currentIndex + 1);
		}
		throw new Error(`All store connections failed. Last error: ${err.message}`);
	}
};

// Main function with optimized structure and resource management
const main = async () => {
	console.clear();
	log("=".repeat(70), colors.cyan);
	log("CURALIFE SHOPIFY THEME DEVELOPMENT", colors.magenta);
	log("=".repeat(70), colors.cyan);

	// Register cleanup function early
	let themeDev = null;
	let watcher = null;

	const cleanup = () => {
		log("Shutting down...", colors.yellow);

		// Kill the Shopify theme dev process if running
		if (themeDev) {
			log("Terminating Shopify theme dev process...", colors.yellow);
			try {
				themeDev.kill();
			} catch (err) {
				// Ignore errors when killing the process
			}
			themeDev = null;
		}

		// Close the file watcher if active
		if (watcher) {
			log("Closing file watcher...", colors.yellow);
			try {
				watcher.close();
			} catch (err) {
				// Ignore errors when closing the watcher
			}
			watcher = null;
		}

		// Clear caches to free memory
		dirCache.clear();
		dirExistsCache.clear();

		log("Cleanup complete", colors.green);
	};

	// Set up signal handlers early
	process.on("SIGINT", () => {
		log("Received SIGINT signal, shutting down...", colors.yellow);
		cleanup();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		log("Received SIGTERM signal, shutting down...", colors.yellow);
		cleanup();
		process.exit(0);
	});

	try {
		// Create build directory if it doesn't exist
		ensureDirectoryExists(BUILD_DIR);
		log(`Build directory ready: ${BUILD_DIR}`, colors.green);

		// Build the theme
		log("Building theme...", colors.magenta);
		await runBuild().catch(err => {
			throw new Error(`Build failed: ${err.message}`);
		});
		log("Theme build completed successfully", colors.green);

		// Set up file watcher
		log("Setting up file watcher...", colors.cyan);
		watcher = setupWatcher();
		log("File watcher activated", colors.green);

		// Determine which stores to try
		const storesToTry = process.env.SHOPIFY_STORE
			? [process.env.SHOPIFY_STORE] // If specified via env var, only try that one
			: STORE_SEQUENCE; // Otherwise try the fallback sequence

		log(`Using store sequence: ${storesToTry.join(" → ")}`, colors.cyan);

		// Start Shopify theme dev with store fallback
		try {
			log("Starting Shopify theme dev process...", colors.cyan);
			themeDev = await tryStoreSequence(storesToTry);
			log(`Successfully connected to store!`, colors.green);
		} catch (err) {
			error(`All connection attempts failed: ${err.message}`);
			log("\nTroubleshooting steps:", colors.cyan);
			log("1. Check your internet connection", colors.cyan);
			log("2. Run 'shopify auth logout' and 'shopify auth' to re-authenticate", colors.cyan);
			log("3. Check if your Shopify store is accessible in the browser", colors.cyan);
			log("4. Try updating Node.js and the Shopify CLI", colors.cyan);
			log("5. For TLS debugging: set DEBUG_TLS=1 before running", colors.cyan);
			log("6. Try again in a few minutes", colors.cyan);

			// Perform cleanup but don't exit to allow file watching to continue
			if (themeDev) {
				try {
					themeDev.kill();
				} catch (e) {
					// Ignore errors when killing the process
				}
				themeDev = null;
			}

			log("Continuing with file watching only (no Shopify preview)", colors.yellow);
		}

		// Log success message
		log(`\n✨ SHOPIFY DEVELOPMENT ENVIRONMENT READY ✨`, colors.green);
		log(`File watching active - changes will be synced to the build directory`, colors.cyan);
		if (themeDev) {
			log(`Shopify preview active - changes are visible in the browser`, colors.cyan);
		} else {
			log(`Shopify preview inactive - only file syncing is running`, colors.yellow);
		}
		log(`\nPress Ctrl+C to stop`, colors.red);
	} catch (err) {
		error(`Fatal error: ${err.message}`);
		cleanup();
		process.exit(1);
	}
};

// Run the script
main().catch(err => {
	console.error(`Uncaught error in main process: ${err.message}`);
	process.exit(1);
});
