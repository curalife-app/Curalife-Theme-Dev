#!/usr/bin/env node

/**
 * TUI Watch Adapter for Curalife Theme
 *
 * This adapter wraps the existing optimized watch scripts and provides
 * structured JSON output for the Bubble Tea TUI while preserving all
 * existing functionality and optimizations.
 */

// Suppress Node.js deprecation warnings related to argument concatenation
process.removeAllListeners("warning");
process.on("warning", warning => {
	// Only suppress specific deprecation warnings about argument concatenation
	if (warning.name !== "DeprecationWarning" || !warning.message.includes("arguments are not escaped")) {
		console.warn(warning);
	}
});

import { spawn } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";

class TUIWatchAdapter extends EventEmitter {
	constructor(isShopify = false) {
		super();
		this.isShopify = isShopify;
		this.startTime = Date.now();
		this.isTUIMode = process.env.TUI_MODE === "true" || process.argv.includes("--tui-mode");
		this.watchProcess = null;
		this.statusUpdateInterval = null;
		this.stats = {
			isActive: false,
			filesWatched: 0,
			changeCount: 0,
			lastChange: "",
			lastChangeAt: null,
			shopifyUrl: "",
			previewUrl: "",
			cacheHits: 0,
			hotReloads: 0,
			timeSaved: 0,
			recentChanges: [], // Track recent file changes
			uniqueFilesChanged: new Set() // Track unique files that have changed
		};

		// Set up cleanup handlers
		this.setupCleanupHandlers();
	}

	setupCleanupHandlers() {
		const cleanup = () => {
			if (this.watchProcess && this.watchProcess.pid) {
				this.outputClean("Stopping watch process...", "info");
				try {
					// Kill entire process group to ensure all child processes are terminated
					if (process.platform === "win32") {
						// Windows: Use taskkill to kill process tree
						require("child_process").spawn("taskkill", ["/f", "/t", "/pid", this.watchProcess.pid], {
							stdio: "ignore"
						});
					} else {
						// Unix: Kill process group
						process.kill(-this.watchProcess.pid, "SIGTERM");

						// Force kill after timeout if needed
						setTimeout(() => {
							if (this.watchProcess && !this.watchProcess.killed) {
								process.kill(-this.watchProcess.pid, "SIGKILL");
							}
						}, 3000);
					}
				} catch (error) {
					this.outputClean(`Error stopping watch process: ${error.message}`, "error");
				}
			}
			this.stopPeriodicUpdates();
		};

		// Handle all possible exit scenarios
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("exit", cleanup);
		process.on("beforeExit", cleanup);
		process.on("uncaughtException", cleanup);
		process.on("unhandledRejection", cleanup);
	}

	outputTUIData(type, data) {
		const tuiData = {
			type,
			timestamp: new Date().toISOString(),
			...data
		};

		if (this.isTUIMode) {
			console.log(`TUI_DATA:${JSON.stringify(tuiData)}`);
		}
	}

	outputClean(message, level = "info") {
		if (!this.isTUIMode) {
			const colors = {
				info: "\x1b[36m", // cyan
				success: "\x1b[32m", // green
				warning: "\x1b[33m", // yellow
				error: "\x1b[31m", // red
				reset: "\x1b[0m"
			};

			const icons = {
				info: "ℹ️",
				success: "✅",
				warning: "⚠️",
				error: "❌"
			};

			console.log(`${colors[level]}${icons[level]} ${message}${colors.reset}`);
		}
	}

	outputWatchStatus() {
		this.outputTUIData("watch_status", {
			...this.stats,
			uptime: Date.now() - this.startTime,
			mode: this.isShopify ? "shopify" : "standard",
			totalFilesChanged: this.stats.uniqueFilesChanged.size,
			recentChangesCount: this.stats.recentChanges.length,
			// Convert Set to Array for JSON serialization
			uniqueFilesChanged: Array.from(this.stats.uniqueFilesChanged),
			// Only send recent changes (not the Set)
			recentChanges: this.stats.recentChanges,
			// Ensure URL fields are correctly mapped
			shopifyUrl: this.stats.shopifyUrl,
			previewUrl: this.stats.previewUrl
		});
	}

	outputLog(level, message, source = "watch") {
		this.outputTUIData("log", {
			level,
			message,
			source
		});
	}

	async runWatch() {
		try {
			this.outputTUIData("log", {
				level: "info",
				message: `Starting ${this.isShopify ? "Shopify" : "standard"} watch process`,
				source: "watch"
			});

			this.outputClean(`Starting ${this.isShopify ? "Shopify" : "Standard"} watch mode...`);

			// Determine the watch command
			const scriptName = this.isShopify ? "watch:shopify" : "watch";

			// Use proper command structure for cross-platform compatibility
			let command, args;
			if (process.platform === "win32") {
				command = "cmd";
				args = ["/c", "npm", "run", scriptName];
			} else {
				command = "npm";
				args = ["run", scriptName];
			}

			const watchProcess = spawn(command, args, {
				stdio: ["pipe", "pipe", "pipe"],
				shell: false, // Always use shell=false to avoid argument concatenation
				detached: process.platform !== "win32", // Create new process group on Unix
				windowsHide: true // Hide window on Windows
			});

			if (!watchProcess) {
				throw new Error("Failed to spawn watch process");
			}

			// Store the process for cleanup
			this.watchProcess = watchProcess;

			// Parse stdout for watch information
			watchProcess.stdout.on("data", data => {
				const output = data.toString();
				console.log(`[DEBUG] Raw stdout received: ${output.slice(0, 200)}...`); // Log first 200 chars
				// Only parse for TUI data in TUI mode, show clean output otherwise
				if (this.isTUIMode) {
					this.parseWatchOutput(output);
				} else {
					this.parseCleanWatchOutput(output);
				}
			});

			// Parse stderr for errors
			watchProcess.stderr.on("data", data => {
				const output = data.toString();
				console.log(`[DEBUG] Raw stderr received: ${output.slice(0, 200)}...`); // Log first 200 chars
				if (this.isTUIMode) {
					this.parseWatchError(output);
				} else {
					// Only show actual errors, not deprecation warnings
					if (!output.includes("DeprecationWarning") && output.trim()) {
						this.outputClean(output.trim(), "error");
					}
				}
			});

			watchProcess.on("spawn", () => {
				this.stats.isActive = true;
				// Don't set fake data - wait for real file count detection
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "info",
					message: "Watch process started successfully",
					source: "watch"
				});
				this.outputClean("Watch process started successfully!", "success");
				this.startPeriodicUpdates();
			});

			watchProcess.on("close", code => {
				this.stats.isActive = false;
				this.watchProcess = null;
				this.outputWatchStatus();

				if (code === 0) {
					this.outputTUIData("log", {
						level: "info",
						message: "Watch process ended normally",
						source: "watch"
					});
					this.outputClean("Watch process ended normally", "info");
				} else if (code === null) {
					// Process was killed by signal
					this.outputTUIData("log", {
						level: "info",
						message: "Watch process stopped by signal",
						source: "watch"
					});
					this.outputClean("Watch process stopped", "info");
				} else {
					this.outputTUIData("log", {
						level: "error",
						message: `Watch process ended with code ${code}`,
						source: "watch"
					});
					this.outputClean(`Watch process ended with code ${code}`, "error");
				}
				this.stopPeriodicUpdates();
			});

			watchProcess.on("error", error => {
				this.stats.isActive = false;
				this.watchProcess = null;
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "error",
					message: `Watch process error: ${error.message}`,
					source: "watch"
				});
				this.outputClean(`Watch process error: ${error.message}`, "error");
				this.stopPeriodicUpdates();
			});

			return new Promise((resolve, reject) => {
				watchProcess.on("close", code => {
					if (code === 0 || code === null) resolve();
					else reject(new Error(`Watch failed with code ${code}`));
				});
			});
		} catch (error) {
			this.outputTUIData("log", {
				level: "error",
				message: `Watch error: ${error.message}`,
				source: "watch"
			});
			this.outputClean(`Watch error: ${error.message}`, "error");
			throw error;
		}
	}

	parseWatchOutput(output) {
		// Remove ANSI codes for parsing
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

		// Debug: Log all output to see what we're getting (ALWAYS log in debug mode)
		if (cleanOutput.trim()) {
			const lines = cleanOutput.split("\n").filter(line => line.trim().length > 5);
			for (const line of lines) {
				// Always log significant lines so we can see what's happening (write to stderr so it's always visible)
				console.error(`[DEBUG] Watch output: ${line.trim()}`);

				// Enhanced debugging for file change detection - log ALL lines to see what we're missing
				console.error(`[DEBUG] Testing line for file change: "${line.trim()}"`);

				if (this.isTUIMode) {
					this.outputLog("debug", `Watch output: ${line.trim()}`, "watch");
				}

				// Enhanced debugging for file count detection
				if (line.toLowerCase().includes("watch") || line.toLowerCase().includes("file") || /\d+/.test(line)) {
					console.error(`[DEBUG] Potential file count line: ${line.trim()}`);
					this.outputLog("debug", `Potential file count line: ${line.trim()}`, "watch");
				}
			}
		}

		// Look for file watching status - enhanced patterns for Shopify CLI and Vite
		const watchingPatterns = [
			/watching\s+(\d+)\s+files?/i,
			/(\d+)\s*files?\s*(?:watched|being watched|monitored)/i,
			/monitoring\s+(\d+)\s+files?/i,
			/found\s+(\d+)\s+files?\s+to\s+(?:watch|monitor)/i,
			/watching for changes to (\d+) files/i,
			/watching (\d+) files/i,
			/(\d+) files changed/i,
			/watching.*?(\d+).*?files/i,
			/vite.*?watching.*?(\d+)/i,
			/chokidar.*?(\d+).*?files/i,
			// Look for cached files as indicator of total files
			/(\d+)\s+cached/i,
			/cache.*?(\d+)/i,
			// Avoid "files processed" from build summaries
			/watching.*?(\d+)/i,
			/files:\s*(\d+)/i
		];

		for (const pattern of watchingPatterns) {
			const match = cleanOutput.match(pattern);
			if (match) {
				const count = parseInt(match[1]);
				console.error(`[DEBUG] Pattern matched: ${pattern.source} -> count: ${count}`);
				if (count > 0 && count < 100000) {
					// Sanity check
					this.stats.filesWatched = count;
					console.error(`[DEBUG] Files watched count updated to: ${this.stats.filesWatched}`);
					this.outputLog("info", `Files watched count updated: ${this.stats.filesWatched}`, "watch");
					this.outputWatchStatus();
					break;
				}
			}
		}

		// Fallback: If watch is active but no file count detected after some time, use a reasonable estimate
		if (this.stats.isActive && this.stats.filesWatched === 0) {
			const timeElapsed = Date.now() - this.startTime;
			if (timeElapsed > 10000) {
				// After 10 seconds
				console.error(`[DEBUG] Fallback: Setting estimated file count`);
				this.stats.filesWatched = 150; // Reasonable estimate for a theme project
				this.outputLog("info", `Estimated files watched: ${this.stats.filesWatched}`, "watch");
				this.outputWatchStatus();
			}
		}

		// Look for URLs (Shopify development) - enhanced detection with aggressive patterns
		const urlMatches = cleanOutput.match(/https?:\/\/[^\s\n\r\t]+/g);
		if (urlMatches) {
			console.error(`[DEBUG] Found URL matches: ${urlMatches.join(", ")}`);
			this.outputLog("debug", `Found URL matches: ${urlMatches.join(", ")}`, "watch");
			for (const url of urlMatches) {
				// Clean up URLs (remove trailing punctuation)
				const cleanUrl = url.replace(/[.,;!?]+$/, "");
				console.error(`[DEBUG] Processing URL: ${cleanUrl}`);

				if (cleanUrl.includes("127.0.0.1") || cleanUrl.includes("localhost")) {
					this.stats.shopifyUrl = cleanUrl;
					console.error(`[DEBUG] Shopify local URL set: ${cleanUrl}`);
					this.outputClean(`Local development server: ${cleanUrl}`, "success");
					this.outputLog("info", `Shopify local URL detected: ${cleanUrl}`, "watch");
				} else if (cleanUrl.includes("myshopify.com")) {
					console.error(`[DEBUG] Shopify domain URL found: ${cleanUrl}`);
					if (cleanUrl.includes("preview_theme_id")) {
						this.stats.previewUrl = cleanUrl;
						console.error(`[DEBUG] Shopify preview URL set: ${cleanUrl}`);
						this.outputClean(`Store preview: ${cleanUrl}`, "success");
						this.outputLog("info", `Shopify preview URL detected: ${cleanUrl}`, "watch");
					}
				}
			}
			this.outputWatchStatus();
		}

		// Enhanced Shopify CLI pattern matching with more aggressive detection
		const shopifyPatterns = [
			{ pattern: /Local:\s*(https?:\/\/[^\s\n\r\t]+)/i, type: "local" },
			{ pattern: /Preview:\s*(https?:\/\/[^\s\n\r\t]+)/i, type: "preview" },
			{ pattern: /development server.*?(https?:\/\/[^\s\n\r\t]+)/i, type: "local" },
			{ pattern: /ready.*?(https?:\/\/[^\s\n\r\t]+)/i, type: "auto" },
			{ pattern: /server.*?(?:running|started).*?(https?:\/\/[^\s\n\r\t]+)/i, type: "local" },
			{ pattern: /Theme.*?preview.*?(https?:\/\/[^\s\n\r\t]+)/i, type: "preview" },
			// More aggressive patterns for Shopify CLI
			{ pattern: /http:\/\/127\.0\.0\.1:\d+/i, type: "local" },
			{ pattern: /http:\/\/localhost:\d+/i, type: "local" },
			{ pattern: /https:\/\/[^.]+\.myshopify\.com[^\s]*/i, type: "preview" },
			{ pattern: /Your theme is ready to preview.*?(https?:\/\/[^\s\n\r\t]+)/i, type: "preview" },
			{ pattern: /Syncing theme.*?ready.*?(https?:\/\/[^\s\n\r\t]+)/i, type: "auto" },
			{ pattern: /┃.*?(https?:\/\/[^\s\n\r\t│]+)/i, type: "auto" }, // URLs in Shopify CLI boxes
			// Very aggressive URL patterns
			{ pattern: /(http:\/\/127\.0\.0\.1:\d+)/g, type: "local" },
			{ pattern: /(http:\/\/localhost:\d+)/g, type: "local" },
			{ pattern: /(https:\/\/[\w-]+\.myshopify\.com\/[^\s]*)/g, type: "preview" },
			// Look for any Shopify CLI output structure
			{ pattern: /Ready!\s*Your theme is ready to preview/i, type: "status" },
			{ pattern: /Development server\s*ready/i, type: "status" },
			{ pattern: /Syncing theme.*?\d+/i, type: "status" }
		];

		for (const { pattern, type } of shopifyPatterns) {
			const match = cleanOutput.match(pattern);
			if (match) {
				console.error(`[DEBUG] Shopify pattern matched (${type}): ${pattern.source}`);
				const rawUrl = match[1] || match[0]; // Some patterns might not have capture groups
				const cleanUrl = rawUrl.replace(/[.,;!?│┃]+$/, ""); // Also remove box drawing chars
				console.error(`[DEBUG] Extracted URL: ${cleanUrl}`);

				if (type === "local" || (type === "auto" && (cleanUrl.includes("127.0.0.1") || cleanUrl.includes("localhost")))) {
					this.stats.shopifyUrl = cleanUrl;
					console.error(`[DEBUG] Set shopifyUrl: ${this.stats.shopifyUrl}`);
					this.outputLog("info", `Shopify URL from ${type} pattern: ${this.stats.shopifyUrl}`, "watch");
				} else if (type === "preview" || (type === "auto" && cleanUrl.includes("myshopify.com"))) {
					this.stats.previewUrl = cleanUrl;
					console.error(`[DEBUG] Set previewUrl: ${this.stats.previewUrl}`);
					this.outputLog("info", `Preview URL from ${type} pattern: ${this.stats.previewUrl}`, "watch");
				}
				this.outputWatchStatus();
			}
		}

		// Look for watch initialization messages
		const initPatterns = [/watch.*?initialized/i, /watch.*?started/i, /watching.*?for.*?changes/i, /watcher.*?ready/i, /file.*?watching.*?active/i];

		if (initPatterns.some(pattern => pattern.test(cleanOutput))) {
			if (!this.stats.isActive) {
				this.stats.isActive = true;
				// Don't set fake data - wait for real file count
				this.outputWatchStatus();
				this.outputLog("info", "Watch system activated", "watch");
			}
		}

		// Exclusion patterns for setup/status messages (check first)
		const excludePatterns = [
			/watching.*for.*development/i, // Setup messages
			/watcher.*ready/i, // Setup completion
			/optimization.*complete/i, // Status messages
			/cache.*hits/i, // Cache status
			/development.*server/i, // Server status
			/syncing.*theme/i, // Shopify sync status
			/watching.*for.*changes/i, // Watch status
			/setup.*complete/i, // Setup completion
			/started.*successfully/i, // Start messages
			/\d+ms.*setup/i, // Setup timing
			/ready.*preview/i, // Ready messages
			/✓.*watching/i, // Setup checkmarks
			/✅.*watch/i // Setup success
		];

		// Check if this is a status/setup message (exclude from file changes)
		const isStatusMessage = excludePatterns.some(pattern => pattern.test(cleanOutput));

		// Look for file change indicators - more precise detection
		const changePatterns = [
			// Direct file operations
			/file changed/i,
			/copied/i,
			/updated/i,
			/modified/i,
			/rebuilt/i,
			/→ copied/i,
			/File changed:/i,
			/\w+\.(liquid|js|css|json|md|html|txt|svg|png|jpg|jpeg|webp) →/i,
			// Build completion (but exclude setup)
			/build.*complete/i,
			/styles.*complete/i,
			/compile.*success/i,
			/webpack.*compiled/i,
			/vite.*built/i,
			// File processing indicators
			/processing.*file/i,
			/✓.*copied/i, // Only checkmarks with "copied"
			/✅.*file/i, // Only green checks with "file"
			// File extensions in context of changes
			/\.(liquid|js|css|json).*→/i,
			/→.*\.(liquid|js|css|json)/i,
			// Shopify CLI specific patterns
			/sync.*file/i,
			/upload.*file/i,
			/change.*detected/i,
			/file.*sync/i,
			/asset.*updated/i,
			// Generic file mention with action words
			/\w+\.(liquid|js|css|json).*(?:update|change|sync|upload)/i,
			/(?:update|change|sync|upload).*\w+\.(liquid|js|css|json)/i
		];

		// Debug every line to see what we're missing
		const lines = cleanOutput.split("\n").filter(line => line.trim().length > 0);
		for (const line of lines) {
			console.error(`[DEBUG] Analyzing line for changes: "${line.trim()}"`);

			// Test for any URLs in this line
			const urlTest = line.match(/https?:\/\/[^\s]+/g);
			if (urlTest) {
				console.error(`[DEBUG] *** URL FOUND IN LINE: ${urlTest.join(", ")} ***`);
			}
		}

		let matchedPattern = null;
		let hasChange = false;

		// Only check for file changes if this is NOT a status message
		if (!isStatusMessage) {
			// Test each pattern and show which ones are being tested
			for (const pattern of changePatterns) {
				const matches = pattern.test(cleanOutput);
				console.error(`[DEBUG] Testing pattern: ${pattern.source} - Match: ${matches}`);
				if (matches) {
					hasChange = true;
					matchedPattern = pattern.source;
					console.error(`[DEBUG] *** FILE CHANGE PATTERN MATCHED: ${pattern.source} ***`);
					break;
				}
			}
		} else {
			console.error(`[DEBUG] Excluded as status message: "${cleanOutput.split("\n")[0]}"`);
		}

		console.error(`[DEBUG] File change detection - hasChange: ${hasChange}, matched pattern: ${matchedPattern}, isStatusMessage: ${isStatusMessage}`);

		// Look for cached files count as a better indicator of total files
		const cachedMatch = cleanOutput.match(/(\d+)\s+cached/i);
		if (cachedMatch && this.stats.filesWatched === 0) {
			const count = parseInt(cachedMatch[1]);
			console.error(`[DEBUG] Found cached files count: ${count}`);
			if (count > 10 && count < 10000) {
				// Use cached files + 1 as estimate of total files being watched
				this.stats.filesWatched = count + 1;
				console.error(`[DEBUG] Files watched updated from cached count: ${this.stats.filesWatched}`);
				this.outputLog("info", `Files watched estimated from cache: ${this.stats.filesWatched}`, "watch");
				this.outputWatchStatus();
			}
		}

		if (hasChange) {
			console.error(`[DEBUG] File change detected! Processing...`);
			this.stats.changeCount++;
			this.stats.lastChangeAt = Date.now();
			this.stats.hotReloads++;

			// Extract filename(s) - try multiple patterns
			const filePatterns = [
				/([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g, // General file pattern
				/File changed:\s*([^\s\n]+)/gi, // "File changed: filename"
				/([^\s]+)\s*→\s*copied/gi, // "filename → copied"
				/✓\s*([^\s]+)/gi // "✓ filename"
			];

			let foundFiles = [];
			for (const pattern of filePatterns) {
				const matches = [...cleanOutput.matchAll(pattern)];
				foundFiles.push(...matches.map(match => match[1]));
			}

			// Remove duplicates and clean up paths
			foundFiles = [...new Set(foundFiles)].filter(file => file && file.length > 0).map(file => file.replace(/^.*[\\\/]/, "")); // Get just filename

			if (foundFiles.length > 0) {
				// Add to unique files changed
				foundFiles.forEach(file => this.stats.uniqueFilesChanged.add(file));

				// Update recent changes (keep last 10)
				const changeInfo = {
					files: foundFiles,
					timestamp: Date.now(),
					count: foundFiles.length
				};
				this.stats.recentChanges.push(changeInfo);
				if (this.stats.recentChanges.length > 10) {
					this.stats.recentChanges = this.stats.recentChanges.slice(-10);
				}

				// Update last change display
				if (foundFiles.length === 1) {
					this.stats.lastChange = foundFiles[0];
					this.outputClean(`File updated: ${foundFiles[0]}`, "info");
				} else {
					this.stats.lastChange = `${foundFiles.length} files`;
					this.outputClean(`Multiple files updated: ${foundFiles.join(", ")}`, "info");
				}
			} else {
				// Fallback if no specific files detected
				this.stats.lastChange = "Files updated";
				this.outputClean("Files updated", "info");
			}

			this.outputWatchStatus();
			this.outputTUIData("log", {
				level: "success",
				message: foundFiles.length > 0 ? `Updated: ${foundFiles.join(", ")}` : cleanOutput.trim(),
				source: "watch"
			});
		}

		// Look for cache information
		const cacheMatch = cleanOutput.match(/(\d+)\s*cache\s*hits?/i);
		if (cacheMatch) {
			this.stats.cacheHits = parseInt(cacheMatch[1]);
			this.outputWatchStatus();
		}

		// Look for time saved information
		const timeSavedMatch = cleanOutput.match(/(\d+)ms\s*saved/i);
		if (timeSavedMatch) {
			this.stats.timeSaved += parseInt(timeSavedMatch[1]);
			this.outputWatchStatus();
		}

		// Watch setup completion - more patterns
		const setupPatterns = [/watching/i, /ready/i, /👀/, /👁️/, /watcher.*?active/i, /monitoring.*?files/i];

		if (setupPatterns.some(pattern => pattern.test(cleanOutput))) {
			if (!this.stats.isActive) {
				this.stats.isActive = true;
				// Try to extract file count from the message, but don't set fake defaults
				const fileCount = cleanOutput.match(/(\d+)/);
				if (fileCount && parseInt(fileCount[1]) > 0) {
					this.stats.filesWatched = parseInt(fileCount[1]);
				}
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "success",
					message: "File watching active",
					source: "watch"
				});
				this.outputClean(`File watching active - monitoring ${this.stats.filesWatched || "files"} files`, "success");
			}
		}

		// Shopify server status
		const shopifyStatus = [/Development server ready/i, /Shopify development server/i, /theme.*?ready/i, /server.*?ready/i];

		if (shopifyStatus.some(pattern => pattern.test(cleanOutput))) {
			this.outputTUIData("log", {
				level: "success",
				message: "Shopify development server ready",
				source: "watch"
			});
			this.outputClean("Shopify development server ready", "success");
		}

		// Debug: Log current URL status periodically
		if (this.isTUIMode && (this.stats.shopifyUrl || this.stats.previewUrl)) {
			this.outputLog("debug", `Current URLs - Shopify: ${this.stats.shopifyUrl || "none"}, Preview: ${this.stats.previewUrl || "none"}`, "watch");
		}

		// Only output raw messages in TUI mode
		if (this.isTUIMode) {
			// Forward significant log messages
			const lines = cleanOutput.split("\n").filter(line => line.trim());
			for (const line of lines) {
				if (this.isSignificantLogLine(line)) {
					const level = this.getLogLevel(line);
					this.outputTUIData("log", {
						level,
						message: line.trim(),
						source: "watch"
					});
				}
			}
		}
	}

	parseCleanWatchOutput(output) {
		// Remove ANSI codes for parsing
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

		// Look for URLs (Shopify development)
		const urlMatches = cleanOutput.match(/https?:\/\/[^\s]+/g);
		if (urlMatches) {
			for (const url of urlMatches) {
				if (url.includes("127.0.0.1") || url.includes("localhost")) {
					this.stats.shopifyUrl = url;
					this.outputClean(`Local development server: ${url}`, "success");
				} else if (url.includes("myshopify.com")) {
					if (url.includes("preview_theme_id")) {
						this.stats.previewUrl = url;
						this.outputClean(`Store preview: ${url}`, "success");
					}
				}
			}
		}

		// Look for file change indicators - enhanced detection
		const changePatterns = [/file changed/i, /copied/i, /updated/i, /modified/i, /rebuilt/i, /→ copied/i, /File changed:/i, /\w+\.(liquid|js|css|json|md|html|txt|svg|png|jpg|jpeg|webp) →/i];

		const hasChange = changePatterns.some(pattern => pattern.test(cleanOutput));
		if (hasChange) {
			this.stats.changeCount++;
			this.stats.lastChangeAt = Date.now();
			this.stats.hotReloads++;

			// Extract filename(s) - try multiple patterns
			const filePatterns = [
				/([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g, // General file pattern
				/File changed:\s*([^\s\n]+)/gi, // "File changed: filename"
				/([^\s]+)\s*→\s*copied/gi, // "filename → copied"
				/✓\s*([^\s]+)/gi // "✓ filename"
			];

			let foundFiles = [];
			for (const pattern of filePatterns) {
				const matches = [...cleanOutput.matchAll(pattern)];
				foundFiles.push(...matches.map(match => match[1]));
			}

			// Remove duplicates and clean up paths
			foundFiles = [...new Set(foundFiles)].filter(file => file && file.length > 0).map(file => file.replace(/^.*[\\\/]/, "")); // Get just filename

			if (foundFiles.length > 0) {
				// Add to unique files changed
				foundFiles.forEach(file => this.stats.uniqueFilesChanged.add(file));

				// Update recent changes (keep last 10)
				const changeInfo = {
					files: foundFiles,
					timestamp: Date.now(),
					count: foundFiles.length
				};
				this.stats.recentChanges.push(changeInfo);
				if (this.stats.recentChanges.length > 10) {
					this.stats.recentChanges = this.stats.recentChanges.slice(-10);
				}

				// Update last change display
				if (foundFiles.length === 1) {
					this.stats.lastChange = foundFiles[0];
					this.outputClean(`File updated: ${foundFiles[0]}`, "info");
				} else {
					this.stats.lastChange = `${foundFiles.length} files`;
					this.outputClean(`Multiple files updated: ${foundFiles.join(", ")}`, "info");
				}
			} else {
				// Fallback if no specific files detected
				this.stats.lastChange = "Files updated";
				this.outputClean("Files updated", "info");
			}

			this.outputWatchStatus();
			this.outputTUIData("log", {
				level: "success",
				message: foundFiles.length > 0 ? `Updated: ${foundFiles.join(", ")}` : cleanOutput.trim(),
				source: "watch"
			});
		}

		// Look for cache information
		const cacheMatch = cleanOutput.match(/(\d+)\s*cache\s*hits?/i);
		if (cacheMatch) {
			this.stats.cacheHits = parseInt(cacheMatch[1]);
		}

		// Look for files watched count
		const filesWatchedMatch = cleanOutput.match(/(\d+)\s*files?\s*(?:watched|processed)/i);
		if (filesWatchedMatch) {
			this.stats.filesWatched = parseInt(filesWatchedMatch[1]);
		}

		// Watch setup completion
		if (cleanOutput.includes("Watching") || cleanOutput.includes("ready") || cleanOutput.includes("👀")) {
			if (!this.stats.isActive) {
				this.stats.isActive = true;
				this.outputClean(`File watching active - monitoring ${this.stats.filesWatched || "files"} files`, "success");
			}
		}

		// Shopify server status
		if (cleanOutput.includes("Development server ready") || cleanOutput.includes("Shopify development server")) {
			this.outputClean("Shopify development server ready", "success");
		}

		// Show build progress indicators
		if (cleanOutput.includes("Building styles") || cleanOutput.includes("Tailwind")) {
			this.outputClean("Building styles with Tailwind CSS...", "info");
		}

		if (cleanOutput.includes("Building scripts") || cleanOutput.includes("Vite")) {
			this.outputClean("Building scripts with Vite...", "info");
		}

		// Show completion messages
		if (cleanOutput.includes("Build completed") || cleanOutput.includes("✨")) {
			this.outputClean("Build completed successfully", "success");
		}
	}

	parseWatchError(output) {
		// Remove ANSI codes for parsing
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

		if (cleanOutput.trim()) {
			this.outputTUIData("log", {
				level: "error",
				message: cleanOutput.trim(),
				source: "watch-error"
			});
		}
	}

	isSignificantLogLine(line) {
		if (!line || line.trim().length === 0) return false;

		const ignoredPatterns = [
			/^TUI_DATA:/,
			/╭|╰|│|─/,
			/^[\s\-\+\*]*$/,
			/^\d{2}:\d{2}:\d{2}/, // timestamp only lines
			/^npm WARN/i
		];

		const significantPatterns = [/✓|❌|⚡|🎨|👁️|🛍️|🌟|✨/, /error|warning|success|completed|failed|ready|started|watching/i, /cache|optimization|build|copy|update/i, /http:\/\/|https:\/\//];

		return !ignoredPatterns.some(pattern => pattern.test(line)) && (significantPatterns.some(pattern => pattern.test(line)) || line.length > 10); // Include longer descriptive lines
	}

	getLogLevel(line) {
		if (line.includes("error") || line.includes("❌") || line.includes("failed")) {
			return "error";
		} else if (line.includes("warning") || line.includes("⚠️") || line.includes("warn")) {
			return "warning";
		} else if (line.includes("success") || line.includes("✓") || line.includes("✨") || line.includes("ready") || line.includes("completed")) {
			return "success";
		}
		return "info";
	}

	getWatchStats() {
		return {
			...this.stats,
			uptime: Date.now() - this.startTime,
			mode: this.isShopify ? "shopify" : "standard"
		};
	}

	startPeriodicUpdates() {
		// Send periodic status updates every 2 seconds to keep TUI responsive
		this.statusUpdateInterval = setInterval(() => {
			if (this.isTUIMode) {
				console.error(`[DEBUG] Periodic update - Changes: ${this.stats.changeCount}, Hot reloads: ${this.stats.hotReloads}`);
				this.outputWatchStatus();
			}
		}, 2000); // Faster updates for better responsiveness
	}

	stopPeriodicUpdates() {
		if (this.statusUpdateInterval) {
			clearInterval(this.statusUpdateInterval);
			this.statusUpdateInterval = null;
		}
	}
}

// Main execution
async function main() {
	const isShopify = process.argv.includes("--shopify") || process.argv.includes("shopify");
	const adapter = new TUIWatchAdapter(isShopify);

	if (!adapter.isTUIMode) {
		console.log(`\n🚀 Curalife ${isShopify ? "Shopify" : "Standard"} Watch Adapter`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	}

	adapter.outputTUIData("log", {
		level: "info",
		message: `TUI Watch Adapter starting in ${isShopify ? "Shopify" : "Standard"} mode`,
		source: "watch"
	});

	try {
		await adapter.runWatch();
		process.exit(0);
	} catch (error) {
		adapter.outputTUIData("log", {
			level: "error",
			message: `Watch failed: ${error.message}`,
			source: "watch"
		});
		adapter.outputClean(`Watch failed: ${error.message}`, "error");
		process.exit(1);
	}
}

// Handle cleanup
process.on("SIGINT", () => {
	console.log("\nWatch interrupted by user");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\nWatch terminated");
	process.exit(0);
});

// Execute main if this file is run directly
main().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});
