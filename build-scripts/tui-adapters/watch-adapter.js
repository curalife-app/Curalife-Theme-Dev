#!/usr/bin/env node

/**
 * TUI Watch Adapter for Curalife Theme
 *
 * This adapter wraps the existing optimized watch scripts and provides
 * structured JSON output for the Bubble Tea TUI while preserving all
 * existing functionality and optimizations.
 */

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
			timeSaved: 0
		};
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
			mode: this.isShopify ? "shopify" : "standard"
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

			const watchProcess = spawn("npm", ["run", scriptName], {
				stdio: ["pipe", "pipe", "pipe"],
				shell: process.platform === "win32"
			});

			if (!watchProcess) {
				throw new Error("Failed to spawn watch process");
			}

			// Parse stdout for watch information
			watchProcess.stdout.on("data", data => {
				const output = data.toString();
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
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "info",
					message: "Watch process started successfully",
					source: "watch"
				});
				this.outputClean("Watch process started successfully!", "success");
			});

			watchProcess.on("close", code => {
				this.stats.isActive = false;
				this.outputWatchStatus();

				if (code === 0) {
					this.outputTUIData("log", {
						level: "info",
						message: "Watch process ended normally",
						source: "watch"
					});
					this.outputClean("Watch process ended normally", "info");
				} else {
					this.outputTUIData("log", {
						level: "error",
						message: `Watch process ended with code ${code}`,
						source: "watch"
					});
					this.outputClean(`Watch process ended with code ${code}`, "error");
				}
			});

			watchProcess.on("error", error => {
				this.stats.isActive = false;
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "error",
					message: `Watch process error: ${error.message}`,
					source: "watch"
				});
				this.outputClean(`Watch process error: ${error.message}`, "error");
			});

			return new Promise((resolve, reject) => {
				watchProcess.on("close", code => {
					if (code === 0) resolve();
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
			this.outputWatchStatus();
		}

		// Look for file change indicators
		const changePatterns = [/file changed/i, /copied/i, /updated/i, /modified/i, /rebuilt/i];

		const hasChange = changePatterns.some(pattern => pattern.test(cleanOutput));
		if (hasChange) {
			this.stats.changeCount++;
			this.stats.lastChangeAt = Date.now();
			this.stats.hotReloads++;

			// Extract filename if possible
			const fileMatch = cleanOutput.match(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/);
			if (fileMatch) {
				this.stats.lastChange = fileMatch[1];
				this.outputClean(`File updated: ${fileMatch[1]}`, "info");
			} else {
				this.outputClean("Files updated", "info");
			}

			this.outputWatchStatus();
			this.outputTUIData("log", {
				level: "success",
				message: cleanOutput.trim(),
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

		// Look for files watched count
		const filesWatchedMatch = cleanOutput.match(/(\d+)\s*files?\s*(?:watched|processed)/i);
		if (filesWatchedMatch) {
			this.stats.filesWatched = parseInt(filesWatchedMatch[1]);
			this.outputWatchStatus();
		}

		// Watch setup completion
		if (cleanOutput.includes("Watching") || cleanOutput.includes("ready") || cleanOutput.includes("👀")) {
			if (!this.stats.isActive) {
				this.stats.isActive = true;
				this.outputWatchStatus();
				this.outputTUIData("log", {
					level: "success",
					message: "File watching active",
					source: "watch"
				});
				this.outputClean(`File watching active - monitoring ${this.stats.filesWatched || "all"} files`, "success");
			}
		}

		// Shopify server status
		if (cleanOutput.includes("Development server ready") || cleanOutput.includes("Shopify development server")) {
			this.outputTUIData("log", {
				level: "success",
				message: "Shopify development server ready",
				source: "watch"
			});
			this.outputClean("Shopify development server ready", "success");
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

		// Look for file change indicators
		const changePatterns = [/file changed/i, /copied/i, /updated/i, /modified/i, /rebuilt/i];
		const hasChange = changePatterns.some(pattern => pattern.test(cleanOutput));
		if (hasChange) {
			this.stats.changeCount++;
			this.stats.lastChangeAt = Date.now();
			this.stats.hotReloads++;

			// Extract filename if possible
			const fileMatch = cleanOutput.match(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/);
			if (fileMatch) {
				this.stats.lastChange = fileMatch[1];
				this.outputClean(`File updated: ${fileMatch[1]}`, "info");
			}
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
				this.outputClean(`File watching active - monitoring ${this.stats.filesWatched || "all"} files`, "success");
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
