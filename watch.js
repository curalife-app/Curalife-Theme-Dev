#!/usr/bin/env node

/**
 * Modular Watch Script
 * This script acts as an entry point to decide which watch mode to use:
 * - vite-watch.js (default for npm run watch)
 * - shopify-hot-reload-simple.js (for npm run watch:combined)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import chalk from "chalk";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track child processes
const childProcesses = [];

/**
 * Simple logging utility
 */
const log = (message, level = "info") => {
	const levels = {
		info: { color: chalk.blue, icon: "ℹ️" },
		success: { color: chalk.green, icon: "✅" },
		warning: { color: chalk.yellow, icon: "⚠️" },
		error: { color: chalk.red, icon: "❌" },
		vite: { color: chalk.cyan, icon: "🔄" },
		shopify: { color: chalk.magenta, icon: "🛒" }
	};

	const { color, icon } = levels[level] || levels.info;
	console.log(`${icon} ${color(message)}`);
};

/**
 * Run a script file as a separate process and capture its output
 */
const runScriptAsProcess = (scriptPath, label, logLevel = "info") => {
	return new Promise((resolve, reject) => {
		// Check if the script exists
		if (!fs.existsSync(scriptPath)) {
			return reject(new Error(`Script not found: ${scriptPath}`));
		}

		log(`Starting: ${path.basename(scriptPath)} (${label})`, logLevel);

		// Spawn a child process to run the script
		const childProcess = spawn(process.execPath, [scriptPath], {
			stdio: "pipe",
			env: process.env
		});

		// Add to the list of child processes
		childProcesses.push(childProcess);

		// Capture and prefix stdout
		childProcess.stdout.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.log(`${logLevel === "vite" ? chalk.cyan("[VITE] ") : chalk.magenta("[SHOPIFY] ")}${line}`);
				}
			});
		});

		// Capture and prefix stderr
		childProcess.stderr.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.error(`${logLevel === "vite" ? chalk.cyan("[VITE] ") : chalk.magenta("[SHOPIFY] ")}${chalk.red(line)}`);
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
 * Run a script directly in the current Node.js process
 */
const runScriptInline = (scriptPath, args = []) => {
	return new Promise((resolve, reject) => {
		// Check if the script exists
		if (!fs.existsSync(scriptPath)) {
			return reject(new Error(`Script not found: ${scriptPath}`));
		}

		log(`Starting: ${path.basename(scriptPath)}`, "info");

		// Spawn a child process with inherited stdio
		const childProcess = spawn(process.execPath, [scriptPath, ...args], {
			stdio: "inherit",
			env: process.env
		});

		// Handle child process events
		childProcess.on("close", code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Script exited with code ${code}`));
			}
		});

		childProcess.on("error", err => {
			reject(err);
		});
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
		log("Running in combined watch mode (vite-watch + shopify-hot-reload)", "info");
		return "combined";
	} else {
		log("Running in standard watch mode (vite-watch only)", "info");
		return "standard";
	}
};

/**
 * Print welcome banner
 */
const printBanner = () => {
	console.log(chalk.cyan("\n==========================================================="));
	console.log(chalk.yellow.bold("            CURALIFE THEME WATCHER"));
	console.log(chalk.cyan("==========================================================="));
	console.log(chalk.white(`Node.js version: ${process.version}`));
	console.log(chalk.white(`Operating system: ${process.platform}`));
	console.log(chalk.white(`Started at: ${new Date().toLocaleTimeString()}`));
	console.log(chalk.cyan("===========================================================\n"));
};

/**
 * Cleanup function to terminate all child processes
 */
const cleanup = () => {
	log("Terminating all watch processes...", "warning");

	childProcesses.forEach(process => {
		if (!process.killed) {
			process.kill();
		}
	});

	log("All processes terminated", "success");
	process.exit(0);
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
	log("Processing Tailwind CSS...", "info");

	return new Promise((resolve, reject) => {
		// Use proper npx command based on platform
		const npxCommand = getNpxCommand();

		// Run npx tailwindcss to process the CSS
		const tailwindProcess = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css"], {
			stdio: "pipe",
			env: process.env,
			shell: true // Use shell on Windows for better command resolution
		});

		// Add to the list of child processes for cleanup
		childProcesses.push(tailwindProcess);

		// Capture and log stdout
		tailwindProcess.stdout.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.log(`${chalk.cyan("[TAILWIND] ")}${line}`);
				}
			});
		});

		// Capture and log stderr
		tailwindProcess.stderr.on("data", data => {
			const lines = data.toString().trim().split("\n");
			lines.forEach(line => {
				if (line.trim()) {
					console.error(`${chalk.cyan("[TAILWIND] ")}${chalk.red(line)}`);
				}
			});
		});

		// Handle process completion
		tailwindProcess.on("close", code => {
			if (code === 0) {
				log("Tailwind CSS processed successfully", "success");
				resolve();
			} else {
				log(`Tailwind CSS processing failed with code ${code}`, "error");
				reject(new Error(`Tailwind processing exited with code ${code}`));
			}
		});
	});
};

/**
 * Main function
 */
const main = async () => {
	try {
		// Print banner
		printBanner();

		const mode = determineMode();

		// First run Tailwind CSS build to ensure CSS is ready
		await runTailwindBuild();

		if (mode === "combined") {
			// Run both scripts in parallel
			log("Starting vite-watch and shopify-hot-reload in parallel...", "info");

			const viteWatchPromise = runScriptAsProcess(path.join(__dirname, "vite-watch.js"), "Vite Watch", "vite");

			// Give vite-watch a head start before starting shopify hot reload
			await new Promise(resolve => setTimeout(resolve, 5000));

			const shopifyHotReloadPromise = runScriptAsProcess(path.join(__dirname, "shopify-hot-reload-simple.js"), "Shopify Hot Reload", "shopify");

			// Set up a watcher for Tailwind CSS files
			const npxCommand = getNpxCommand();
			const cssWatcher = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--watch"], {
				stdio: "pipe",
				env: process.env,
				shell: true // Use shell on Windows
			});

			childProcesses.push(cssWatcher);

			// Log CSS watcher output
			cssWatcher.stdout.on("data", data => {
				const lines = data.toString().trim().split("\n");
				lines.forEach(line => {
					if (line.trim()) {
						console.log(`${chalk.cyan("[TAILWIND] ")}${line}`);
					}
				});
			});

			cssWatcher.stderr.on("data", data => {
				const lines = data.toString().trim().split("\n");
				lines.forEach(line => {
					if (line.trim()) {
						console.error(`${chalk.cyan("[TAILWIND] ")}${chalk.red(line)}`);
					}
				});
			});

			log("All processes are now running. Press Ctrl+C to stop.", "success");

			// Wait for both processes (though they'll likely run indefinitely)
			await Promise.all([viteWatchPromise, shopifyHotReloadPromise]);
		} else {
			// Run only vite-watch.js
			const viteProcess = runScriptAsProcess(path.join(__dirname, "vite-watch.js"), "Vite Watch", "vite");

			// Set up a watcher for Tailwind CSS files
			const npxCommand = getNpxCommand();
			const cssWatcher = spawn(npxCommand, ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--watch"], {
				stdio: "pipe",
				env: process.env,
				shell: true // Use shell on Windows
			});

			childProcesses.push(cssWatcher);

			// Log CSS watcher output
			cssWatcher.stdout.on("data", data => {
				const lines = data.toString().trim().split("\n");
				lines.forEach(line => {
					if (line.trim()) {
						console.log(`${chalk.cyan("[TAILWIND] ")}${line}`);
					}
				});
			});

			cssWatcher.stderr.on("data", data => {
				const lines = data.toString().trim().split("\n");
				lines.forEach(line => {
					if (line.trim()) {
						console.error(`${chalk.cyan("[TAILWIND] ")}${chalk.red(line)}`);
					}
				});
			});

			log("All processes are now running. Press Ctrl+C to stop.", "success");

			await viteProcess;
		}
	} catch (error) {
		log(`Error: ${error.message}`, "error");
		cleanup();
		process.exit(1);
	}
};

// Set up signal handlers
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Start the main function
main().catch(error => {
	console.error("Fatal error:", error);
	cleanup();
	process.exit(1);
});
