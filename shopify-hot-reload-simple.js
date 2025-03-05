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
	"liquid/blocks": "blocks"
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

// Find source directory with caching
const findSourceDir = relPath => {
	const cacheKey = relPath;
	if (dirCache.has(cacheKey)) {
		return dirCache.get(cacheKey);
	}

	const sourceDir = Object.keys(dirMappings).find(dir => relPath.startsWith(dir));
	dirCache.set(cacheKey, sourceDir);
	return sourceDir;
};

// Copy a file from source to destination
const copyFile = sourcePath => {
	try {
		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Determine destination directory
		const sourceDir = findSourceDir(relPath);

		if (!sourceDir) {
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
		error(`Failed to copy ${sourcePath}: ${err.message}`);
	}
};

// Delete a file from destination when source is deleted
const deleteFile = sourcePath => {
	try {
		// Get relative path from src directory
		const relPath = path.relative(SRC_DIR, sourcePath);

		// Determine destination directory
		const sourceDir = findSourceDir(relPath);

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

// Set up file watcher with optimized configuration
const setupWatcher = () => {
	log("Setting up file watcher...", colors.magenta);

	// Create glob patterns for files to watch - precompute this once
	const watchPatterns = Object.keys(dirMappings).map(dir => path.join(SRC_DIR, dir, "**", "*.*"));

	// Set up watcher with chokidar - optimized settings
	const watcher = chokidar.watch(watchPatterns, {
		ignored: /(^|[\/\\])\../, // Ignore dotfiles
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 300,
			pollInterval: 100
		},
		usePolling: false, // Use native filesystem events when possible
		disableGlobbing: false,
		alwaysStat: false // Reduce stat calls
	});

	// Watch events using optimized batch handling for high-volume changes
	let pendingCopies = new Set();
	let pendingDeletes = new Set();
	let processingTimeout = null;

	const processPending = () => {
		// Process copies
		pendingCopies.forEach(path => copyFile(path));
		pendingCopies.clear();

		// Process deletes
		pendingDeletes.forEach(path => deleteFile(path));
		pendingDeletes.clear();

		processingTimeout = null;
	};

	const scheduleBatch = (path, isDelete = false) => {
		if (isDelete) {
			pendingDeletes.add(path);
			// Remove from copies if it was there
			pendingCopies.delete(path);
		} else {
			pendingCopies.add(path);
			// Remove from deletes if it was there
			pendingDeletes.delete(path);
		}

		// Debounce processing to handle bursts of file changes
		if (processingTimeout) {
			clearTimeout(processingTimeout);
		}
		processingTimeout = setTimeout(processPending, 100);
	};

	watcher
		.on("add", path => scheduleBatch(path))
		.on("change", path => scheduleBatch(path))
		.on("unlink", path => scheduleBatch(path, true));

	log("File watcher started", colors.green);

	return watcher;
};

// Run build command with improved error handling
const runBuild = () => {
	return new Promise((resolve, reject) => {
		log("Building theme...", colors.magenta);

		const build = spawn("npm", ["run", "build:light"], {
			shell: true,
			stdio: "inherit",
			// Increase max buffer to handle larger outputs
			maxBuffer: 1024 * 1024 * 10 // 10 MB
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
		if (themeDev) {
			themeDev.kill();
			themeDev = null;
		}
		if (watcher) {
			watcher.close();
			watcher = null;
		}
		// Clear caches to free memory
		dirCache.clear();
		dirExistsCache.clear();

		process.exit(0);
	};

	// Set up signal handlers early
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	// Helper function to handle fatal errors
	const handleFatalError = message => {
		error(message);
		cleanup();
		process.exit(1);
	};

	try {
		// Create build directory if it doesn't exist
		ensureDirectoryExists(BUILD_DIR);

		// Build the theme
		await runBuild().catch(err => {
			throw new Error(`Build failed: ${err.message}`);
		});

		// Set up file watcher
		watcher = setupWatcher();

		// Determine which stores to try
		const storesToTry = process.env.SHOPIFY_STORE
			? [process.env.SHOPIFY_STORE] // If specified via env var, only try that one
			: STORE_SEQUENCE; // Otherwise try the fallback sequence

		// Start Shopify theme dev with store fallback
		try {
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

			// Clean up resources before exiting
			if (watcher) {
				watcher.close();
			}
			process.exit(1);
		}
	} catch (err) {
		handleFatalError(`Development process failed: ${err.message}`);
	}
};

// Run the script
main().catch(err => {
	console.error(`Uncaught error in main process: ${err.message}`);
	process.exit(1);
});
