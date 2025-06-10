#!/usr/bin/env node

/**
 * Unified Watch Core for Curalife Theme
 *
 * Eliminates code duplication by providing a configurable watch system
 * that can be extended for different environments (standard, Shopify, etc.)
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
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import chalk from "chalk";

import { BuildCache, PerformanceTracker, ParallelFileProcessor, FileAnalyzer, OptimizedProgressTracker } from "./optimized-utils.js";
import {
	log,
	createBanner,
	createWatchSuccessBox,
	SRC_DIR,
	BUILD_DIR,
	ensureDirectoryExists,
	getDestination,
	copyFile,
	getNpxCommand,
	showFileChangeNotification,
	showStyleRebuildNotification
} from "./shared-utils.js";

export class WatchCore {
	constructor(config = {}) {
		this.config = {
			name: "Build",
			icon: "⚡",
			theme: "build",
			enableShopify: false,
			enableStagewise: false,
			customSteps: [],
			debounceDelay: 300,
			tailwindDebounce: 1000,
			customHandlers: {},
			...config
		};

		this.buildCache = new BuildCache();
		this.performanceTracker = new PerformanceTracker();
		this.parallelProcessor = new ParallelFileProcessor();
		this.fileAnalyzer = new FileAnalyzer();
		this.smartDebouncer = new SmartDebouncer();
		this.childProcesses = [];

		// Add initialization flag to prevent interference during progress display
		this.isInitializing = true;

		this.stats = {
			startTime: new Date(),
			filesCopied: 0,
			filesSkipped: 0,
			cacheHits: 0,
			errors: 0,
			changeDetections: 0,
			shopifySync: 0,
			hotReloads: 0,
			timeSaved: 0,
			lastChanges: []
		};
	}

	async initialize() {
		const isDebugMode = process.argv.includes("--debug");

		// Set environment variables if Shopify mode
		if (this.config.enableShopify) {
			process.env.NODE_ENV = "development";
			process.env.WATCH_COMBINED = "true";
			process.env.VITE_WATCH_MODE = "true";
		}

		// Create progress tracker
		const progressTracker = new (await import("./shared-utils.js")).ProgressTracker(1, ["Watch Setup"], this.config.theme);

		// Show banner
		createBanner(
			`${this.config.icon} CURALIFE ${this.config.name.toUpperCase()} WATCHER ${this.config.icon}`,
			`◦ High-performance ${this.config.name.toLowerCase()} development`,
			isDebugMode,
			this.config.theme
		);

		this.performanceTracker.start("total-watch-init");
		this.performanceTracker.start("watcher-setup");

		// Step 1: Initial file copy with smooth progress
		progressTracker.setProgress(0, "🚀 Starting optimized watch initialization...");
		await new Promise(resolve => setTimeout(resolve, 500)); // Slightly longer delay for visibility

		const copyResult = await this.optimizedInitialCopy(progressTracker);
		await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for visibility

		// Step 2: Initial Tailwind build
		progressTracker.setProgress(40, "🎨 Building styles...");
		await new Promise(resolve => setTimeout(resolve, 400)); // Slightly longer delay for visibility
		await this.optimizedTailwindBuild();
		progressTracker.setProgress(70, "✨ Styles complete!");
		await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for visibility

		// Custom steps (e.g., stagewise copy for Shopify)
		if (this.config.enableStagewise) {
			progressTracker.setProgress(75, "🔗 Setting up integrations...");
			await new Promise(resolve => setTimeout(resolve, 400)); // Slightly longer delay for visibility
			await this.runStagewiseFilesCopy();
			progressTracker.setProgress(90, "🎯 Integrations ready!");
			await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for visibility
		}

		// Final step: Setup file watcher
		progressTracker.setProgress(95, "👁️ Starting watchers...");
		await new Promise(resolve => setTimeout(resolve, 400)); // Slightly longer delay for visibility
		const watcher = this.setupOptimizedWatcher();
		progressTracker.setProgress(100, "👀 Watchers active! 🌟");
		await new Promise(resolve => setTimeout(resolve, 400)); // Longer delay to show completion

		// Complete the progress bar with a new line
		progressTracker.complete();

		// Mark initialization as complete
		this.isInitializing = false;

		// Final setup
		const totalDuration = this.performanceTracker.end("total-watch-init");

		// Add status message after progress bar completes
		const watchStatusLine = `✓ 👀 Watching ${process.cwd().replace(/.*[\\\/]/, "")} for ${this.config.name.toLowerCase()} development (${totalDuration.toFixed(0)}ms setup)`;
		console.log(chalk.hex("#50fa7b")(watchStatusLine));

		// Show success message
		createWatchSuccessBox(this.stats.errors === 0, totalDuration / 1000, this.stats.filesCopied, this.stats.filesSkipped, {
			cacheHits: this.stats.cacheHits,
			optimizations: this.performanceTracker.metrics.optimizations.length
		});

		if (this.config.enableShopify) {
			await this.startShopifyDev();
		}

		this.setupCleanupHandlers();
		return watcher;
	}

	async optimizedInitialCopy(progressTracker) {
		const isDebugMode = process.argv.includes("--debug");
		this.performanceTracker.start("initial-copy");

		try {
			ensureDirectoryExists(BUILD_DIR);
			const files = await import("glob").then(glob => glob.glob("**/*", { cwd: SRC_DIR, nodir: true }));

			// Update progress with file count information
			progressTracker.setProgress(5, `📁 Found ${files.length} files to process`);
			await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for visibility

			const filesToCopy = [];
			const skippedFiles = [];

			// Analyze which files need copying
			for (const file of files) {
				const fullPath = path.join(SRC_DIR, file);
				if (this.buildCache.hasChanged(fullPath)) {
					filesToCopy.push(fullPath);
					this.fileAnalyzer.analyzeFile(fullPath);
				} else {
					skippedFiles.push(fullPath);
					this.stats.cacheHits++;
				}
			}

			if (skippedFiles.length > 0) {
				const timeSaved = skippedFiles.length * 5;
				this.stats.timeSaved += timeSaved;
				this.performanceTracker.addOptimization("cache", `Skipped ${skippedFiles.length} unchanged files`, timeSaved);
			}

			this.stats.filesSkipped = skippedFiles.length;

			if (filesToCopy.length === 0) {
				progressTracker.setProgress(35, "✨ All files up to date!");
				await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for visibility
				this.performanceTracker.end("initial-copy");
				return true;
			}

			// Process files with progress updates
			progressTracker.setProgress(10, `📝 Copying ${filesToCopy.length} files...`);
			await new Promise(resolve => setTimeout(resolve, 200)); // Brief delay for visibility

			const copyOperation = async filePath => {
				const { destPath, destFolder } = getDestination(filePath);
				if (!destFolder) return { copied: false, reason: "no-destination" };

				await fs.promises.mkdir(destFolder, { recursive: true });
				await fs.promises.copyFile(filePath, destPath);
				return { copied: true, dest: destPath };
			};

			// Use a callback to update progress during file processing
			const progressCallback = (current, total) => {
				const fileProgress = (current / total) * 25; // Files take 25% of total progress (10-35%)
				progressTracker.setProgress(10 + fileProgress, `📝 Copying files... (${current}/${total})`);
			};

			const results = await this.parallelProcessor.processFiles(filesToCopy, copyOperation, progressCallback);
			const successful = results.filter(r => r.success && r.result?.copied);
			this.stats.filesCopied = successful.length;
			this.stats.errors += results.filter(r => !r.success).length;

			progressTracker.setProgress(35, `✓ Copied ${successful.length} files`);
			await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for visibility

			this.performanceTracker.end("initial-copy");
			this.buildCache.saveCache();

			return true;
		} catch (error) {
			progressTracker.setProgress(35, `❌ Copy failed: ${error.message}`);
			return false;
		}
	}

	async optimizedTailwindBuild() {
		const isDebugMode = process.argv.includes("--debug");
		this.performanceTracker.start("tailwind-rebuild");

		const tailwindSources = ["./src/styles/tailwind.css", "./tailwind.config.js"];
		let needsRebuild = false;

		for (const file of tailwindSources) {
			if (fs.existsSync(file) && this.buildCache.hasChanged(file)) {
				needsRebuild = true;
				break;
			}
		}

		const recentChanges = this.stats.lastChanges.slice(-5);
		for (const change of recentChanges) {
			if (change.file.match(/\.(liquid|js|html)$/)) {
				needsRebuild = true;
				break;
			}
		}

		if (!needsRebuild) {
			const timeSaved = 2000;
			this.stats.timeSaved += timeSaved;
			this.performanceTracker.addOptimization("tailwind-cache", "Skipped Tailwind rebuild - no changes detected", timeSaved);
			this.performanceTracker.end("tailwind-rebuild");
			return;
		}

		return new Promise((resolve, reject) => {
			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css"];
			const buildCommand = spawn(command, args, {
				shell: false // Ensure no shell mode to prevent argument concatenation
			});

			let output = "";
			buildCommand.stdout.on("data", data => {
				output += data.toString();
			});
			buildCommand.stderr.on("data", data => {
				output += data.toString();
			});

			buildCommand.on("close", code => {
				const duration = this.performanceTracker.end("tailwind-rebuild");

				if (code === 0) {
					const sizeMatch = output.match(/(\d+(?:\.\d+)?)\s*(KB|MB)/);
					const size = sizeMatch ? `${sizeMatch[1]}${sizeMatch[2]}` : "unknown";
					resolve();
				} else {
					reject(new Error(`Tailwind build failed with code ${code}: ${output}`));
				}
			});
		});
	}

	async runStagewiseFilesCopy() {
		if (!this.config.enableStagewise) return;

		const isDebugMode = process.argv.includes("--debug");
		this.performanceTracker.start("stagewise-copy");

		return new Promise(resolve => {
			if (isDebugMode) {
				log("🔄 Running stagewise files copy...", "step");
			}

			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "node", "build-scripts/build-utilities/copy-stagewise-files.js"];
			const copyProcess = spawn(command, args, {
				shell: false // Ensure no shell mode to prevent argument concatenation
			});

			this.childProcesses.push(copyProcess);

			if (isDebugMode) {
				copyProcess.stdout.on("data", data => {
					const output = data.toString().trim();
					if (output) log(output, "stagewise");
				});

				copyProcess.stderr.on("data", data => {
					const output = data.toString().trim();
					if (output) log(output, "error");
				});
			}

			copyProcess.on("close", code => {
				const duration = this.performanceTracker.end("stagewise-copy");

				if (code === 0) {
					if (isDebugMode) {
						log(`Stagewise files copied successfully (${duration.toFixed(0)}ms)`, "success");
					}
				} else {
					this.stats.errors++;
					if (isDebugMode) {
						log(`Stagewise copy failed with code ${code}`, "error");
					}
				}

				resolve(code === 0);
			});
		});
	}

	async startShopifyDev() {
		const isDebugMode = process.argv.includes("--debug");

		console.log(chalk.hex("#50fa7b")("🛍️ ") + chalk.hex("#f8f8f2")("Starting Shopify development server..."));
		console.log("");

		return new Promise(resolve => {
			// Use proper command structure for Shopify CLI
			let command, args;

			if (process.platform === "win32") {
				command = "cmd";
				args = ["/c", "shopify", "theme", "dev", "--path", "Curalife-Theme-Build"];
			} else {
				command = "shopify";
				args = ["theme", "dev", "--path", "Curalife-Theme-Build"];
			}

			const shopifyProcess = spawn(command, args, {
				shell: false, // Always use shell=false to avoid argument concatenation
				stdio: ["pipe", "pipe", "pipe"] // Ensure proper stdio handling
			});

			this.childProcesses.push(shopifyProcess);

			let outputBuffer = "";
			let hasDisplayedUrls = false;

			// Capture stdout and stderr
			shopifyProcess.stdout.on("data", data => {
				const output = data.toString();
				outputBuffer += output;
				hasDisplayedUrls = this.parseShopifyOutput(outputBuffer, hasDisplayedUrls);
			});

			shopifyProcess.stderr.on("data", data => {
				const output = data.toString();
				outputBuffer += output;
				hasDisplayedUrls = this.parseShopifyOutput(outputBuffer, hasDisplayedUrls);
			});

			shopifyProcess.on("spawn", () => {
				console.log(chalk.hex("#8be9fd")("🌐 Starting development server..."));
				console.log("");

				resolve();
			});

			shopifyProcess.on("error", error => {
				console.log(chalk.hex("#ff5555")("❌ Failed to start Shopify CLI:"), error.message);
				console.log("");
				console.log(chalk.hex("#ffb86c")("💡 Manual solution:"));
				console.log(chalk.hex("#f8f8f2")("   1. Open new terminal"));
				console.log(chalk.hex("#f8f8f2")("   2. ") + chalk.hex("#8be9fd")("cd Curalife-Theme-Build"));
				console.log(chalk.hex("#f8f8f2")("   3. ") + chalk.hex("#8be9fd")("shopify theme dev"));
				console.log("");
				console.log(chalk.hex("#6272a4")("   File watching continues normally"));
				console.log("");
				resolve();
			});

			shopifyProcess.on("close", code => {
				if (code !== 0) {
					console.log("");
					console.log(chalk.hex("#ff5555")(`❌ Shopify server stopped (code ${code})`));
					console.log(chalk.hex("#6272a4")("   File watching continues"));
					console.log("");
				}
			});

			shopifyProcess.on("exit", (code, signal) => {
				if (signal && signal !== "SIGTERM" && signal !== "SIGINT") {
					console.log(chalk.hex("#ffb86c")(`🛑 Shopify server terminated: ${signal}`));
				}
			});
		});
	}

	parseShopifyOutput(outputBuffer, hasDisplayedUrls) {
		// Look for URLs in the output
		const localUrlMatch = outputBuffer.match(/http:\/\/127\.0\.0\.1:\d+/);
		const previewUrlMatch = outputBuffer.match(/https:\/\/[^.]+\.myshopify\.com\/\?preview_theme_id=\d+/);
		const editorUrlMatch = outputBuffer.match(/https:\/\/[^.]+\.myshopify\.com\/admin\/themes\/\d+\/editor\?hr=\d+/);

		// Look for status messages
		const startingMatch = outputBuffer.match(/Syncing theme #\d+/);
		const readyMatch = outputBuffer.match(/Ready! Your theme is ready to preview/);

		if ((localUrlMatch || previewUrlMatch) && !hasDisplayedUrls) {
			this.displayShopifyUrls(localUrlMatch?.[0], previewUrlMatch?.[0], editorUrlMatch?.[0]);
			return true; // URLs have been displayed
		} else if (startingMatch) {
			console.log(chalk.hex("#8be9fd")("🔄 ") + chalk.hex("#f8f8f2")("Syncing theme..."));
		} else if (readyMatch) {
			console.log(chalk.hex("#50fa7b")("✅ ") + chalk.hex("#f8f8f2")("Sync complete"));
		}

		// Show errors if any
		if (outputBuffer.includes("Error") || outputBuffer.includes("error")) {
			const errorLines = outputBuffer.split("\n").filter(
				line => line.toLowerCase().includes("error") && !line.includes("theme editor") // Exclude editor URL mentions
			);

			errorLines.forEach(errorLine => {
				if (errorLine.trim()) {
					console.log(chalk.hex("#ff5555")("⚠️ ") + chalk.hex("#f8f8f2")(errorLine.trim()));
				}
			});
		}

		return hasDisplayedUrls; // Return current state
	}

	displayShopifyUrls(localUrl, previewUrl, editorUrl) {
		console.log("");
		console.log(chalk.hex("#50fa7b")("┌─ 🛍️ SHOPIFY DEVELOPMENT URLS ─────────────────────────────────────┐"));

		if (localUrl) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#8be9fd")("💻 Local Development:"));
			console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex("#50fa7b")("→ ") + chalk.hex("#8be9fd")(localUrl));
		}

		if (previewUrl) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#ff79c6")("🌍 Store Preview:"));
			console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex("#50fa7b")("→ ") + chalk.hex("#8be9fd")(previewUrl));
		}

		if (editorUrl) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#ffb86c")("🎨 Theme Editor:"));
			console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex("#50fa7b")("→ ") + chalk.hex("#8be9fd")(editorUrl));
		}

		console.log(chalk.hex("#50fa7b")("└─────────────────────────────────────────────────────────────────────┘"));
		console.log("");
		console.log(chalk.hex("#50fa7b")("✅ ") + chalk.hex("#f8f8f2")("Development server ready - file watching active"));
		console.log("");
	}

	async handleFileChange(filePath, event) {
		const isDebugMode = process.argv.includes("--debug");

		// Skip processing during initialization to prevent interference with progress bar
		if (this.isInitializing) {
			return;
		}

		this.stats.changeDetections++;

		// Track recent changes for optimization hints
		this.stats.lastChanges.push({
			file: filePath,
			event,
			timestamp: Date.now()
		});

		if (this.stats.lastChanges.length > 10) {
			this.stats.lastChanges = this.stats.lastChanges.slice(-10);
		}

		if (!this.buildCache.hasChanged(filePath)) {
			if (isDebugMode) {
				log(`⚡ Skipped ${path.basename(filePath)} - no content changes`, "info");
			}
			return;
		}

		const changeKey = `file-${filePath}`;

		this.smartDebouncer.debounce(
			changeKey,
			async () => {
				this.performanceTracker.start("file-change-processing");

				try {
					const fileName = path.basename(filePath);
					const fileExt = path.extname(filePath);

					const success = await copyFile(filePath, isDebugMode);

					if (success) {
						this.stats.filesCopied++;
						if (this.config.enableShopify) this.stats.shopifySync++;

						this.fileAnalyzer.analyzeFile(filePath);

						if (!isDebugMode) {
							showFileChangeNotification(fileName, event);
						} else {
							const syncInfo = this.config.enableShopify ? ` (Shopify sync #${this.stats.shopifySync})` : "";
							log(`${fileName} → copied${syncInfo}`, "file");
						}

						// Check if this change requires Tailwind rebuild
						const needsTailwindRebuild = fileExt === ".css" || filePath.includes("tailwind") || filePath.includes("styles") || fileExt.match(/\.(liquid|js|html)$/);

						if (needsTailwindRebuild) {
							this.smartDebouncer.debounce(
								"tailwind-rebuild",
								async () => {
									await this.optimizedTailwindBuild();
								},
								this.config.tailwindDebounce
							);
						}

						// Run stagewise copy for certain file types (Shopify mode)
						if (this.config.enableStagewise) {
							const needsStagewiseCopy = fileExt.match(/\.(js|css)$/) || filePath.includes("assets") || filePath.includes("stagewise");

							if (needsStagewiseCopy) {
								this.smartDebouncer.debounce(
									"stagewise-copy",
									async () => {
										await this.runStagewiseFilesCopy();
									},
									800
								);
							}
						}

						// Custom handlers
						if (this.config.customHandlers.onChange) {
							await this.config.customHandlers.onChange(filePath, event, this);
						}
					} else {
						this.stats.errors++;
						log(`Failed to copy ${fileName}`, "error");
					}
				} catch (error) {
					this.stats.errors++;
					log(`Error processing ${path.basename(filePath)}: ${error.message}`, "error");
				}

				const duration = this.performanceTracker.end("file-change-processing");
				if (duration < 100) this.stats.hotReloads++;
			},
			this.config.debounceDelay
		);
	}

	setupOptimizedWatcher() {
		this.performanceTracker.start("watcher-setup");

		const watcher = chokidar.watch(SRC_DIR, {
			ignored: [/node_modules/, /\.git/, /Curalife-Theme-Build/],
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 200,
				pollInterval: 100
			}
		});

		// Track watch events for performance
		watcher.on("add", filePath => this.handleFileChange(filePath, "add"));
		watcher.on("change", filePath => this.handleFileChange(filePath, "change"));
		watcher.on("unlink", filePath => this.handleFileChange(filePath, "unlink"));

		watcher.on("ready", () => {
			this.performanceTracker.end("watcher-setup");
		});

		return watcher;
	}

	setupCleanupHandlers() {
		let isShuttingDown = false;

		const cleanup = signal => {
			if (isShuttingDown) return;
			isShuttingDown = true;

			console.log("");
			log("🛑 Shutting down watcher...", "step");

			this.childProcesses.forEach(proc => {
				try {
					proc.kill();
				} catch (error) {
					/* Process might already be dead */
				}
			});

			this.buildCache.saveCache();
			this.performanceTracker.saveReport();

			if (process.argv.includes("--debug") || process.argv.includes("--report")) {
				this.showPerformanceReport();
			}

			log("✅ Watch session ended", "success");
			process.exit(0);
		};

		process.on("SIGINT", () => cleanup("SIGINT"));
		process.on("SIGTERM", () => cleanup("SIGTERM"));

		process.on("uncaughtException", error => {
			if (!isShuttingDown) {
				console.error(chalk.red("❌ Uncaught Exception:"), error.message);
				cleanup("exception");
			}
		});

		process.on("unhandledRejection", (reason, promise) => {
			if (!isShuttingDown) {
				console.error(chalk.red("❌ Unhandled Rejection:"), reason);
				cleanup("rejection");
			}
		});
	}

	showPerformanceReport() {
		const uptime = (Date.now() - this.stats.startTime.getTime()) / 1000;
		const cacheStats = this.buildCache.getCacheStats();
		const perfReport = this.performanceTracker.getReport();

		console.log("\n" + chalk.hex("#bd93f9")(`┌─ ${this.config.icon} ${this.config.name.toUpperCase()} WATCH PERFORMANCE REPORT ──────────────────────────┐`));

		console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#50fa7b")("📊 Session Statistics:"));
		console.log(chalk.hex("#f8f8f2")("│   ") + `Uptime: ${chalk.hex("#ffb86c")(uptime.toFixed(1))}s, Changes: ${chalk.hex("#50fa7b")(this.stats.changeDetections)}`);

		if (this.config.enableShopify) {
			console.log(chalk.hex("#f8f8f2")("│   ") + `Shopify syncs: ${chalk.hex("#50fa7b")(this.stats.shopifySync)}, Hot reloads: ${chalk.hex("#ff79c6")(this.stats.hotReloads)}`);
		} else {
			console.log(chalk.hex("#f8f8f2")("│   ") + `Hot reloads: ${chalk.hex("#50fa7b")(this.stats.hotReloads)}, Files processed: ${chalk.hex("#ffb86c")(this.stats.filesCopied)}`);
		}

		console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#ff79c6")("🎯 Cache Performance:"));
		console.log(chalk.hex("#f8f8f2")("│   ") + `Hit rate: ${chalk.hex("#50fa7b")(cacheStats.hitRate)} (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})`);
		console.log(chalk.hex("#f8f8f2")("│   ") + `Time saved: ~${chalk.hex("#ffb86c")(this.stats.timeSaved)}ms`);

		if (perfReport.optimizations.length > 0) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#8be9fd")("⚡ Optimizations Applied:"));
			perfReport.optimizations.slice(-3).forEach(opt => {
				console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex("#ff79c6")("•") + ` ${opt.description}`);
			});
		}

		console.log(chalk.hex("#bd93f9")("└─────────────────────────────────────────────────────────────────┘"));
	}
}

// Smart debouncer (shared between instances)
class SmartDebouncer {
	constructor() {
		this.timers = new Map();
		this.changeQueue = new Map();
		this.isProcessing = false;
	}

	debounce(key, callback, delay = 300) {
		if (this.timers.has(key)) {
			clearTimeout(this.timers.get(key));
		}

		this.changeQueue.set(key, callback);

		const timer = setTimeout(async () => {
			if (!this.isProcessing) {
				this.isProcessing = true;
				await this.processQueue();
				this.isProcessing = false;
			}
		}, delay);

		this.timers.set(key, timer);
	}

	async processQueue() {
		const callbacks = Array.from(this.changeQueue.values());
		this.changeQueue.clear();
		this.timers.clear();

		await Promise.all(callbacks.map(callback => callback()));
	}
}
