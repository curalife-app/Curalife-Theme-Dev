#!/usr/bin/env node

/**
 * Shopify Hot Reload Simple
 *
 * This script runs the Shopify CLI theme development server
 * for hot reloading during development.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m"
};

const log = (message, type = "info") => {
	const timestamp = new Date().toLocaleTimeString();
	let prefix = "";

	switch (type) {
		case "error":
			prefix = `${colors.red}[ERROR]${colors.reset}`;
			break;
		case "success":
			prefix = `${colors.green}[SUCCESS]${colors.reset}`;
			break;
		case "warning":
			prefix = `${colors.yellow}[WARNING]${colors.reset}`;
			break;
		case "shopify":
			prefix = `${colors.magenta}[SHOPIFY]${colors.reset}`;
			break;
		default:
			prefix = `${colors.cyan}[INFO]${colors.reset}`;
	}

	console.log(`${prefix} ${colors.bright}${timestamp}${colors.reset} ${message}`);
};

// Check if build directory exists
const buildDir = path.join(__dirname, "..", "Curalife-Theme-Build");
if (!fs.existsSync(buildDir)) {
	log(`Build directory not found: ${buildDir}`, "error");
	log("Please run the build process first", "error");
	process.exit(1);
}

// Determine the correct command for Shopify CLI
const isWindows = process.platform === "win32";
const shopifyCommand = isWindows ? "shopify.cmd" : "shopify";

// Shopify CLI arguments for theme development
const args = ["theme", "dev", "--path", `"${buildDir}"`, "--live-reload=hot-reload", "--host=127.0.0.1", "--port=9293", "--nodelete"];

log("Starting Shopify theme development server...", "shopify");
log(`Command: ${shopifyCommand} ${args.join(" ")}`, "shopify");
log(`Working directory: ${buildDir}`, "shopify");

// Spawn the Shopify CLI process
const shopifyProcess = spawn(shopifyCommand, args, {
	stdio: ["inherit", "pipe", "pipe"], // Pipe stdout and stderr to capture and display
	shell: true,
	env: {
		...process.env,
		// Ensure Shopify CLI uses the correct environment
		SHOPIFY_CLI_THEME_TOKEN: process.env.SHOPIFY_CLI_THEME_TOKEN,
		SHOPIFY_FLAG_STORE: process.env.SHOPIFY_FLAG_STORE
	}
});

// Track if we've shown the success message
let hasShownSuccess = false;

// Capture and display stdout
shopifyProcess.stdout.on("data", data => {
	const output = data.toString();

	// Check if Shopify is ready by looking for the preview URL
	if (!hasShownSuccess && (output.includes("Preview your theme") || output.includes("http://") || output.includes("https://"))) {
		hasShownSuccess = true;
		log("🌐 Development server will be available at: http://127.0.0.1:9293", "success");
		log("🎭 Stagewise toolbar will be active on this URL in development mode", "success");
		log("Shopify theme development server started successfully", "success");
	}

	// Display the output directly without prefixes for better readability
	process.stdout.write(output);
});

// Capture and display stderr
shopifyProcess.stderr.on("data", data => {
	const output = data.toString();
	// Display errors directly
	process.stderr.write(output);
});

// Handle process events - remove the premature spawn message

shopifyProcess.on("error", error => {
	if (error.code === "ENOENT") {
		log("Shopify CLI not found. Please install it first:", "error");
		log("npm install -g @shopify/cli @shopify/theme", "error");
	} else {
		log(`Failed to start Shopify CLI: ${error.message}`, "error");
	}
	process.exit(1);
});

shopifyProcess.on("close", code => {
	if (code === 0) {
		log("Shopify theme development server stopped", "shopify");
	} else {
		log(`Shopify theme development server exited with code ${code}`, "warning");
	}
	process.exit(code);
});

// Handle termination signals
process.on("SIGINT", () => {
	log("Received SIGINT, stopping Shopify development server...", "warning");
	shopifyProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
	log("Received SIGTERM, stopping Shopify development server...", "warning");
	shopifyProcess.kill("SIGTERM");
});

// Keep the process alive
process.stdin.resume();
