#!/usr/bin/env node

/**
 * 🎮 Unified TUI Adapter - OPTIMIZED
 *
 * Combines build and watch adapters into a single, efficient system
 * Eliminates code duplication and provides unified TUI output
 */

import { EventEmitter } from "events";
import { spawn } from "child_process";
import { performance } from "perf_hooks";
import config from "../config/unified-config.js";

export class UnifiedTUIAdapter extends EventEmitter {
	constructor(mode = "build") {
		super();
		this.mode = mode; // 'build', 'watch', 'shopify'
		this.process = null;
		this.stats = this.initializeStats();
		this.startTime = performance.now();
		this.isActive = false;
		this.outputBuffer = "";
		this.progressData = {
			current: 0,
			total: 100,
			message: "Initializing..."
		};

		this.setupCleanupHandlers();
	}

	initializeStats() {
		return {
			filesCopied: 0,
			filesSkipped: 0,
			cacheHits: 0,
			errors: 0,
			hotReloads: 0,
			timeSaved: 0,
			duration: 0,
			lastChange: "",
			lastChangeAt: null
		};
	}

	setupCleanupHandlers() {
		const cleanup = () => {
			if (this.process && !this.process.killed) {
				try {
					if (process.platform === "win32") {
						spawn("taskkill", ["/f", "/t", "/pid", this.process.pid], { stdio: "ignore" });
					} else {
						process.kill(-this.process.pid, "SIGTERM");
					}
				} catch (error) {
					// Ignore cleanup errors
				}
			}
		};

		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("exit", cleanup);
	}

	// 🚀 Unified execution method
	async execute(operation, options = {}) {
		this.mode = operation;
		this.isActive = true;
		this.stats = this.initializeStats();
		this.startTime = performance.now();

		this.outputTUIData("status", {
			isRunning: true,
			operation: operation,
			mode: this.mode,
			timestamp: new Date().toISOString()
		});

		try {
			switch (operation) {
				case "build":
					return await this.runBuild(options);
				case "watch":
					return await this.runWatch(options);
				case "shopify":
					return await this.runShopifyWatch(options);
				default:
					throw new Error(`Unknown operation: ${operation}`);
			}
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	// 🏗️ Optimized build execution
	async runBuild(options = {}) {
		const buildScript = options.useLegacy ? "build-complete-original.js" : "build-complete.js";
		const args = [];

		if (options.report) args.push("--report");
		if (options.debug) args.push("--debug");
		if (options.noVite) args.push("--no-vite");

		return new Promise((resolve, reject) => {
			this.process = spawn("node", [`build-scripts/${buildScript}`, ...args], {
				cwd: process.cwd(),
				env: { ...process.env, TUI_MODE: "true" },
				stdio: ["pipe", "pipe", "pipe"]
			});

			this.process.stdout.on("data", data => {
				this.processBuildOutput(data.toString());
			});

			this.process.stderr.on("data", data => {
				this.processErrorOutput(data.toString());
			});

			this.process.on("close", code => {
				this.stats.duration = (performance.now() - this.startTime) / 1000;

				if (code === 0) {
					this.outputTUIData("complete", {
						success: true,
						duration: this.stats.duration,
						stats: this.stats
					});
					resolve(this.stats);
				} else {
					const error = new Error(`Build failed with code ${code}`);
					this.handleError(error);
					reject(error);
				}
			});
		});
	}

	// 👁️ Optimized watch execution
	async runWatch(options = {}) {
		const watchScript = options.useLegacy ? "watch-original.js" : "watch-shopify.js";
		const args = [];

		if (options.debug) args.push("--debug");
		if (options.shopify) args.push("--shopify");

		return new Promise((resolve, reject) => {
			this.process = spawn("node", [`build-scripts/${watchScript}`, ...args], {
				cwd: process.cwd(),
				env: {
					...process.env,
					TUI_MODE: "true",
					WATCH_COMBINED: "true"
				},
				stdio: ["pipe", "pipe", "pipe"]
			});

			this.process.stdout.on("data", data => {
				this.processWatchOutput(data.toString());
			});

			this.process.stderr.on("data", data => {
				this.processErrorOutput(data.toString());
			});

			this.process.on("spawn", () => {
				this.outputTUIData("watch_ready", {
					isActive: true,
					mode: this.mode,
					startTime: new Date().toISOString()
				});
				resolve();
			});

			this.process.on("close", code => {
				this.isActive = false;
				this.outputTUIData("watch_stopped", {
					isActive: false,
					code: code,
					duration: (performance.now() - this.startTime) / 1000
				});
			});
		});
	}

	// 🛍️ Shopify watch execution
	async runShopifyWatch(options = {}) {
		return this.runWatch({ ...options, shopify: true });
	}

	// 📊 Process build output with intelligent parsing
	processBuildOutput(output) {
		this.outputBuffer += output;
		const lines = this.outputBuffer.split("\n");
		this.outputBuffer = lines.pop() || ""; // Keep incomplete line

		for (const line of lines) {
			this.parseBuildLine(line);
		}
	}

	// 👁️ Process watch output with intelligent parsing
	processWatchOutput(output) {
		this.outputBuffer += output;
		const lines = this.outputBuffer.split("\n");
		this.outputBuffer = lines.pop() || "";

		for (const line of lines) {
			this.parseWatchLine(line);
		}
	}

	// 🔍 Smart build line parsing
	parseBuildLine(line) {
		const cleanLine = line.trim();
		if (!cleanLine) return;

		// Try to parse as TUI JSON data first
		if (this.tryParseTUIData(cleanLine)) return;

		// Parse progress indicators
		if (cleanLine.includes("Step ") && cleanLine.includes(":")) {
			const stepMatch = cleanLine.match(/Step (\d+)(?:\/(\d+))?:?\s*(.*)/);
			if (stepMatch) {
				const [, current, total, message] = stepMatch;
				this.updateProgress(parseInt(current), parseInt(total) || 3, message);
				return;
			}
		}

		// Parse completion statistics
		if (cleanLine.includes("files copied") || cleanLine.includes("files processed")) {
			const filesMatch = cleanLine.match(/(\d+)\s+files?\s+(copied|processed)/);
			if (filesMatch) {
				this.stats.filesCopied = parseInt(filesMatch[1]);
			}
		}

		// Parse cache hits
		if (cleanLine.includes("cache hit") || cleanLine.includes("skipped")) {
			const cacheMatch = cleanLine.match(/(\d+).*?(?:cache hit|skipped)/);
			if (cacheMatch) {
				this.stats.cacheHits = parseInt(cacheMatch[1]);
			}
		}

		// Parse errors
		if (cleanLine.includes("error") || cleanLine.includes("failed")) {
			this.stats.errors++;
			this.outputTUIData("error", {
				message: cleanLine,
				timestamp: new Date().toISOString()
			});
		}

		// Generic log output
		this.outputLog(this.getLogLevel(cleanLine), cleanLine, "build");
	}

	// 🔍 Smart watch line parsing
	parseWatchLine(line) {
		const cleanLine = line.trim();
		if (!cleanLine) return;

		// Try to parse as TUI JSON data first
		if (this.tryParseTUIData(cleanLine)) return;

		// Parse file changes
		if (cleanLine.includes("📁") || cleanLine.includes("✅")) {
			const changeMatch = cleanLine.match(/(?:📁|✅)\s*([^:]+):\s*(.+)/);
			if (changeMatch) {
				const [, action, fileName] = changeMatch;
				this.stats.lastChange = fileName;
				this.stats.lastChangeAt = new Date();

				if (action.includes("change") || action.includes("add")) {
					this.stats.hotReloads++;
				}

				this.outputTUIData("file_change", {
					action: action.toLowerCase(),
					fileName: fileName,
					timestamp: new Date().toISOString()
				});
				return;
			}
		}

		// Parse Shopify URLs
		if (cleanLine.includes("127.0.0.1") || cleanLine.includes("myshopify.com")) {
			const urlMatch = cleanLine.match(/(https?:\/\/[^\s]+)/);
			if (urlMatch) {
				const url = urlMatch[1];
				const urlType = url.includes("myshopify.com") ? "preview" : "local";

				this.outputTUIData("shopify_url", {
					url: url,
					type: urlType,
					timestamp: new Date().toISOString()
				});
				return;
			}
		}

		// Generic log output
		this.outputLog(this.getLogLevel(cleanLine), cleanLine, "watch");
	}

	// 🚨 Process error output
	processErrorOutput(output) {
		const lines = output.split("\n").filter(line => line.trim());

		for (const line of lines) {
			this.stats.errors++;
			this.outputTUIData("error", {
				message: line.trim(),
				source: this.mode,
				timestamp: new Date().toISOString()
			});
		}
	}

	// 📊 Update progress with smart calculations
	updateProgress(current, total, message = "") {
		const percent = total > 0 ? Math.round((current / total) * 100) : 0;

		this.progressData = {
			current: current,
			total: total,
			percent: percent,
			message: message || this.progressData.message
		};

		this.outputTUIData("progress", {
			...this.progressData,
			timestamp: new Date().toISOString()
		});
	}

	// 🔄 Try to parse TUI JSON data
	tryParseTUIData(line) {
		if (!line.startsWith("{") || !line.endsWith("}")) return false;

		try {
			const data = JSON.parse(line);
			if (data.type) {
				this.outputTUIData(data.type, data);
				return true;
			}
		} catch (error) {
			// Not JSON, continue with normal parsing
		}

		return false;
	}

	// 📤 Output TUI data with unified format
	outputTUIData(type, data) {
		const tuiData = {
			type: type,
			timestamp: new Date().toISOString(),
			mode: this.mode,
			...data
		};

		// Output as JSON for TUI consumption
		console.log(JSON.stringify(tuiData));

		// Emit event for programmatic usage
		this.emit("data", tuiData);
	}

	// 📝 Output clean log messages
	outputLog(level, message, source = "") {
		this.outputTUIData("log", {
			level: level,
			message: message,
			source: source || this.mode,
			timestamp: new Date().toISOString()
		});
	}

	// 🔍 Determine log level from content
	getLogLevel(line) {
		const lowerLine = line.toLowerCase();

		if (lowerLine.includes("error") || lowerLine.includes("failed") || lowerLine.includes("❌")) {
			return "error";
		}
		if (lowerLine.includes("warn") || lowerLine.includes("warning") || lowerLine.includes("⚠️")) {
			return "warning";
		}
		if (lowerLine.includes("success") || lowerLine.includes("complete") || lowerLine.includes("✅")) {
			return "success";
		}
		if (lowerLine.includes("info") || lowerLine.includes("📁") || lowerLine.includes("🎯")) {
			return "info";
		}

		return "info";
	}

	// 🚨 Handle errors with context
	handleError(error) {
		this.isActive = false;
		this.stats.errors++;

		this.outputTUIData("fatal_error", {
			message: error.message,
			stack: error.stack,
			mode: this.mode,
			duration: (performance.now() - this.startTime) / 1000,
			timestamp: new Date().toISOString()
		});
	}

	// 🛑 Stop current operation
	async stop() {
		if (this.process && !this.process.killed) {
			return new Promise(resolve => {
				this.process.on("close", () => {
					this.isActive = false;
					resolve();
				});

				this.process.kill("SIGTERM");

				// Force kill after 5 seconds
				setTimeout(() => {
					if (!this.process.killed) {
						this.process.kill("SIGKILL");
					}
				}, 5000);
			});
		}
	}

	// 📊 Get current statistics
	getStats() {
		return {
			...this.stats,
			isActive: this.isActive,
			mode: this.mode,
			uptime: (performance.now() - this.startTime) / 1000,
			progress: this.progressData
		};
	}

	// 🧹 Reset adapter state
	reset() {
		this.stats = this.initializeStats();
		this.startTime = performance.now();
		this.isActive = false;
		this.outputBuffer = "";
		this.progressData = {
			current: 0,
			total: 100,
			message: "Ready"
		};
	}
}

/**
 * Factory method to create specialized adapters
 * @param {string} type - 'build', 'watch', or 'shopify'
 * @param {Object} options - Configuration options
 * @returns {UnifiedTUIAdapter} Configured adapter instance
 */
export function createAdapter(type, options = {}) {
	const adapter = new UnifiedTUIAdapter(type);

	// Configure based on type
	switch (type) {
		case "build":
			adapter.mode = "build";
			adapter.enableWatch = false;
			break;
		case "watch":
			adapter.mode = "watch";
			adapter.enableWatch = true;
			adapter.enableShopify = false;
			break;
		case "shopify":
			adapter.mode = "watch";
			adapter.enableWatch = true;
			adapter.enableShopify = true;
			break;
		default:
			throw new Error(`Unknown adapter type: ${type}`);
	}

	// Apply custom options
	Object.assign(adapter, options);

	return adapter;
}

// 🚀 Main execution when called directly
async function main() {
	const operation = process.argv[2] || "build";
	const options = {
		report: process.argv.includes("--report"),
		debug: process.argv.includes("--debug"),
		shopify: process.argv.includes("--shopify"),
		useLegacy: process.argv.includes("--legacy")
	};

	const adapter = new UnifiedTUIAdapter(operation);

	try {
		await adapter.execute(operation, options);
	} catch (error) {
		console.error(`Adapter failed: ${error.message}`);
		process.exit(1);
	}
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { UnifiedTUIAdapter };
