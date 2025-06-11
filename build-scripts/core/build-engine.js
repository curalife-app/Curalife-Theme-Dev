#!/usr/bin/env node

/**
 * 🚀 Unified Build Engine - Curalife Theme
 *
 * Features:
 * - Single source of truth for all build operations
 * - Unified logging and progress tracking
 * - Smart caching and optimization
 * - Beautiful visual feedback
 * - Error recovery and resilience
 */

import { EventEmitter } from "events";
import { spawn } from "child_process";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { performance } from "perf_hooks";
import { BuildCache, PerformanceTracker, ParallelFileProcessor, FileAnalyzer } from "../optimized-utils.js";
import { SRC_DIR, BUILD_DIR, ensureDirectoryExists, getDestination, getNpxCommand } from "../shared-utils.js";

export class BuildEngine extends EventEmitter {
	constructor(options = {}) {
		super();
		this.config = this.mergeConfig(options);
		this.state = "idle";
		this.metrics = new Map();
		this.cache = new BuildCache(this.config.cache?.cacheFile);
		this.performance = new PerformanceTracker();
		this.fileAnalyzer = new FileAnalyzer();
		this.childProcesses = [];

		this.stats = {
			startTime: new Date(),
			filesCopied: 0,
			filesSkipped: 0,
			cacheHits: 0,
			errors: 0,
			timeSaved: 0
		};

		this.setupCleanupHandlers();
	}

	mergeConfig(options) {
		const defaults = {
			performance: {
				parallel: true,
				workers: "auto",
				cache: true,
				memoryLimit: "512MB"
			},
			paths: {
				src: "src",
				build: "Curalife-Theme-Build",
				cache: ".cache"
			},
			cache: {
				cacheFile: "build-scripts/cache/.build-cache.json"
			}
		};

		return { ...defaults, ...options };
	}

	setupCleanupHandlers() {
		const cleanup = () => {
			this.childProcesses.forEach(proc => {
				if (proc && !proc.killed) {
					try {
						if (process.platform === "win32") {
							// On Windows, kill the entire process tree
							spawn("taskkill", ["/f", "/t", "/pid", proc.pid], { stdio: "ignore" });
						} else {
							// On Unix systems, kill the process group
							process.kill(-proc.pid, "SIGTERM");

							// Force kill after 3 seconds
							setTimeout(() => {
								if (!proc.killed) {
									process.kill(-proc.pid, "SIGKILL");
								}
							}, 3000);
						}
					} catch (error) {
						// Ignore cleanup errors - process might already be dead
						console.warn(`Cleanup warning: ${error.message}`);
					}
				}
			});
			this.childProcesses = [];
		};

		// Enhanced cleanup with better error handling
		process.on("SIGINT", () => {
			console.log("\n🛑 Gracefully shutting down...");
			cleanup();
			// Give processes time to cleanup
			setTimeout(() => process.exit(0), 1000);
		});

		process.on("SIGTERM", () => {
			cleanup();
			setTimeout(() => process.exit(0), 1000);
		});

		process.on("exit", cleanup);

		process.on("uncaughtException", error => {
			console.error("💥 Uncaught Exception:", error.message);
			cleanup();
			process.exit(1);
		});

		// Store cleanup function for manual cleanup
		this.cleanup = cleanup;
	}

	// 🎯 Single method for all operations
	async execute(operation, options = {}) {
		const startTime = performance.now();
		const context = { operation, options, startTime };

		try {
			this.setState("running", context);
			this.emit("start", context);

			const result = await this.runOperation(operation, options, context);

			const duration = (performance.now() - startTime) / 1000;
			this.setState("completed", { ...context, result, duration });
			this.emit("complete", { ...context, result, duration });

			return result;
		} catch (error) {
			const duration = (performance.now() - startTime) / 1000;
			this.setState("failed", { ...context, error, duration });
			this.emit("error", { ...context, error, duration });
			throw error;
		}
	}

	// 🔄 Smart operation router
	async runOperation(operation, options, context) {
		const operations = {
			build: () => this.build(options, context),
			watch: () => this.watch(options, context),
			"build:watch": () => this.buildWatch(options, context),
			optimize: () => this.optimize(options, context),
			analyze: () => this.analyze(options, context)
		};

		const runner = operations[operation];
		if (!runner) {
			throw new Error(`Unknown operation: ${operation}`);
		}

		return await runner();
	}

	// 🏗️ Unified build pipeline
	async build(options, context) {
		this.performance.start("total-build");
		this.emit("log", { level: "info", message: "Starting optimized build pipeline..." });

		const pipeline = new BuildPipeline(this, options);

		try {
			// Stage 1: Prepare
			this.emit("progress", { percent: 5, message: "Preparing build environment..." });
			await this.prepareBuild(options);

			// Stage 2: Copy files
			this.emit("progress", { percent: 10, message: "Copying files..." });
			await this.copyFiles(options);

			// Stage 3: Build styles
			this.emit("progress", { percent: 50, message: "Building styles..." });
			await this.buildStyles(options);

			// Stage 4: Build scripts
			if (!options.noVite) {
				this.emit("progress", { percent: 80, message: "Building scripts..." });
				await this.buildScripts(options);
			}

			// Stage 5: Optimize
			if (options.optimize !== false) {
				this.emit("progress", { percent: 95, message: "Optimizing assets..." });
				await this.optimizeAssets(options);
			}

			// Finalize
			this.emit("progress", { percent: 100, message: "Build complete!" });
			const duration = this.performance.end("total-build");

			this.cache.saveCache();
			this.performance.saveReport();

			return {
				success: true,
				duration: duration / 1000,
				stats: this.stats
			};
		} catch (error) {
			this.emit("log", { level: "error", message: `Build failed: ${error.message}` });
			throw error;
		}
	}

	async prepareBuild(options) {
		ensureDirectoryExists(BUILD_DIR);
		this.emit("log", { level: "info", message: "Build environment prepared" });
	}

	async copyFiles(options) {
		this.performance.start("file-analysis");
		const files = await glob("**/*", { cwd: SRC_DIR, nodir: true });

		// Pre-filter files by type for better performance
		const allowedExtensions = new Set([".js", ".css", ".liquid", ".json", ".md", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".eot"]);
		const validFiles = files.filter(file => {
			const ext = path.extname(file).toLowerCase();
			return allowedExtensions.has(ext) || !ext; // Include files without extension
		});

		const filesToCopy = [];
		const skippedFiles = [];
		const noDestinationFiles = [];

		// Debug: Show first few files being processed
		this.emit("log", { level: "info", message: `Analyzing ${validFiles.length} files (total: ${files.length})...` });
		if (validFiles.length > 0) {
			this.emit("log", { level: "info", message: `Sample files: ${validFiles.slice(0, 5).join(", ")}` });
		}

		// Batch process file change detection for better performance
		for (const file of validFiles) {
			const fullPath = path.join(SRC_DIR, file);
			try {
				// Get destination path to check if it exists
				const { destPath } = getDestination(fullPath);

				// Skip files that have no destination (like bundled JS files)
				if (!destPath) {
					noDestinationFiles.push(fullPath);
					continue;
				}

				// Pass both source and destination paths to cache check
				if (this.cache.hasChanged(fullPath, destPath)) {
					filesToCopy.push(fullPath);
					this.fileAnalyzer.analyzeFile(fullPath);
				} else {
					skippedFiles.push(fullPath);
					this.stats.cacheHits++;
				}
			} catch (error) {
				this.emit("log", { level: "warning", message: `Skipping invalid file: ${file}` });
			}
		}

		this.performance.end("file-analysis");
		this.stats.filesSkipped = skippedFiles.length;

		// Debug output
		this.emit("log", { level: "info", message: `File analysis: ${filesToCopy.length} to copy, ${skippedFiles.length} cached, ${noDestinationFiles.length} skipped (no destination)` });
		if (noDestinationFiles.length > 0) {
			this.emit("log", {
				level: "info",
				message: `No destination files: ${noDestinationFiles
					.slice(0, 3)
					.map(f => path.basename(f))
					.join(", ")}${noDestinationFiles.length > 3 ? "..." : ""}`
			});
		}

		if (filesToCopy.length === 0) {
			this.emit("log", { level: "success", message: "✨ All files up to date - nothing to copy!" });
			return;
		}

		// Enhanced parallel processing with better error handling
		this.performance.start("file-copying");
		const processor = new ParallelFileProcessor();

		const copyOperation = async filePath => {
			try {
				const { destPath, destFolder } = getDestination(filePath);
				if (!destFolder) return { copied: false, reason: "no-destination" };

				await fs.promises.mkdir(destFolder, { recursive: true });
				await fs.promises.copyFile(filePath, destPath);
				return { copied: true, dest: destPath };
			} catch (error) {
				return { copied: false, error: error.message, filePath };
			}
		};

		const progressCallback = (current, total) => {
			const percent = Math.round((current / total) * 30); // File copying is 30% of total progress
			this.emit("progress", { percent: percent + 10, message: `Copying files... (${current}/${total})` });
		};

		const results = await processor.processFiles(filesToCopy, copyOperation, progressCallback);

		const successful = results.filter(r => r.success && r.result.copied);
		const failed = results.filter(r => !r.success || !r.result.copied);

		this.performance.end("file-copying");
		this.stats.filesCopied = successful.length;
		this.stats.errors += failed.length;

		// Report results
		if (failed.length > 0) {
			this.emit("log", {
				level: "warning",
				message: `Copied ${successful.length} files, ${failed.length} failed, ${skippedFiles.length} cached`
			});

			// Log first few errors for debugging
			failed.slice(0, 3).forEach(f => {
				this.emit("log", {
					level: "error",
					message: `Copy failed: ${path.basename(f.result?.filePath || "unknown")} - ${f.result?.error || f.error}`
				});
			});
		} else {
			this.emit("log", {
				level: "success",
				message: `Copied ${successful.length} files, skipped ${skippedFiles.length} (cached)`
			});
		}
	}

	async buildStyles(options) {
		this.performance.start("tailwind-build");

		// Check if Tailwind sources changed
		const tailwindSources = ["./src/styles/tailwind.css", "./tailwind.config.js"];
		let needsRebuild = false;

		for (const file of tailwindSources) {
			if (fs.existsSync(file) && this.cache.hasChanged(file)) {
				needsRebuild = true;
				break;
			}
		}

		if (!needsRebuild) {
			this.emit("log", { level: "info", message: "⚡ Tailwind CSS up to date - skipping build" });
			this.performance.end("tailwind-build");
			return;
		}

		return new Promise((resolve, reject) => {
			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css"];

			if (options.production || options.minify) {
				args.push("--minify");
			}

			const buildProcess = spawn(command, args, { shell: false });
			this.childProcesses.push(buildProcess);

			buildProcess.on("close", code => {
				const duration = this.performance.end("tailwind-build");

				if (code === 0) {
					this.emit("log", {
						level: "success",
						message: `Tailwind CSS built successfully (${duration.toFixed(0)}ms)`
					});
					resolve();
				} else {
					reject(new Error(`Tailwind CSS build failed with code ${code}`));
				}
			});
		});
	}

	async buildScripts(options) {
		this.performance.start("vite-build");

		return new Promise((resolve, reject) => {
			const env = {
				...process.env,
				NODE_ENV: options.production ? "production" : "development",
				VITE_SKIP_CLEAN: "true"
			};

			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "vite", "build"];

			const buildProcess = spawn(command, args, { env, shell: false });
			this.childProcesses.push(buildProcess);

			buildProcess.on("close", code => {
				const duration = this.performance.end("vite-build");

				if (code === 0) {
					this.emit("log", {
						level: "success",
						message: `Vite build completed (${duration.toFixed(0)}ms)`
					});
					resolve();
				} else {
					reject(new Error(`Vite build failed with code ${code}`));
				}
			});
		});
	}

	async optimizeAssets(options) {
		this.emit("log", { level: "info", message: "Optimizing assets..." });

		// Generate CSS minified version
		const cssPath = path.join(BUILD_DIR, "assets", "tailwind.css");
		if (fs.existsSync(cssPath)) {
			const css = fs.readFileSync(cssPath, "utf8");
			const minified = css
				.replace(/\/\*[\s\S]*?\*\//g, "")
				.replace(/\s+/g, " ")
				.replace(/\s*([{}:;,>+~])\s*/g, "$1")
				.trim();

			fs.writeFileSync(cssPath.replace(".css", ".min.css"), minified);
			this.emit("log", { level: "success", message: "CSS optimized and minified" });
		}
	}

	// 👁️ Enhanced watch mode with Shopify integration
	async watch(options, context) {
		this.emit("log", { level: "info", message: `Starting enhanced watch mode${options.shopify ? " with Shopify development" : ""}...` });

		// Initial build
		await this.build({ ...options, optimize: false }, context);

		// Setup file watcher with Shopify-aware debouncing
		const debounceTime = options.shopify ? 300 : 150; // Shopify needs more time
		const watcher = chokidar.watch(SRC_DIR, {
			ignored: [/node_modules/, /\.git/, /Curalife-Theme-Build/, /build-scripts\/cache/, /\.cache/, /\.tmp/],
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: options.shopify ? 300 : 200,
				pollInterval: 100
			}
		});

		// Smart debouncing with file type awareness
		const debounceMap = new Map();
		const handleChange = (filePath, event) => {
			const key = `${event}:${filePath}`;
			const fileExt = path.extname(filePath);

			// Different debounce times for different file types in Shopify mode
			let fileDebounceTime = debounceTime;
			if (options.shopify) {
				if ([".css", ".scss"].includes(fileExt)) {
					fileDebounceTime = 500; // CSS needs more time in Shopify
				} else if ([".js", ".ts"].includes(fileExt)) {
					fileDebounceTime = 300; // JS files
				} else if (fileExt === ".liquid") {
					fileDebounceTime = 200; // Liquid files can be faster
				}
			}

			if (debounceMap.has(key)) {
				clearTimeout(debounceMap.get(key));
			}

			debounceMap.set(
				key,
				setTimeout(async () => {
					try {
						await this.handleFileChange(filePath, event, options);
					} catch (error) {
						this.emit("log", { level: "error", message: `File change error: ${error.message}` });
					}
					debounceMap.delete(key);
				}, fileDebounceTime)
			);
		};

		watcher.on("add", filePath => handleChange(filePath, "add"));
		watcher.on("change", filePath => handleChange(filePath, "change"));
		watcher.on("unlink", filePath => handleChange(filePath, "unlink"));

		watcher.on("ready", async () => {
			this.emit("log", { level: "success", message: "👁️ File watcher ready! Watching for changes..." });
			this.emit("watch:ready", { shopify: options.shopify });

			// Start Shopify after file watcher is ready
			if (options.shopify) {
				try {
					this.emit("log", { level: "info", message: "🛍️ Starting Shopify development mode..." });
					await this.startShopifyDev();
					this.emit("log", { level: "success", message: "🛍️ Shopify development server is ready!" });
				} catch (error) {
					this.emit("log", { level: "error", message: `Failed to start Shopify: ${error.message}` });
					this.emit("log", { level: "info", message: "Continuing with file watching only..." });
				}
			}

			// Always emit that we're ready for file watching, regardless of Shopify status
			this.emit("log", { level: "success", message: "🎯 System ready! Watching for file changes..." });
		});

		// Return both watcher and shopify status
		return {
			watcher,
			shopify: options.shopify,
			mode: options.shopify ? "shopify" : "watch"
		};
	}

	async handleFileChange(filePath, event, options) {
		const fileName = path.basename(filePath);
		const fileExt = path.extname(filePath);
		const isShopify = options.shopify;

		this.emit("log", { level: "info", message: `📁 ${event}: ${fileName}${isShopify ? " (Shopify mode)" : ""}` });

		if (event === "unlink") {
			// Handle file deletion
			const { destPath } = getDestination(filePath);
			if (fs.existsSync(destPath)) {
				fs.unlinkSync(destPath);
				this.emit("log", { level: "info", message: `🗑️ Removed: ${fileName}` });

				if (isShopify) {
					this.emit("shopify:file_change", {
						action: "removed",
						file: fileName,
						path: destPath
					});
				}
			}
			return;
		}

		// Copy changed file
		if (event === "add" || event === "change") {
			const { destPath, destFolder } = getDestination(filePath);
			if (destFolder) {
				try {
					await fs.promises.mkdir(destFolder, { recursive: true });
					await fs.promises.copyFile(filePath, destPath);
					this.emit("log", { level: "success", message: `✅ Updated: ${fileName}` });

					if (isShopify) {
						this.emit("shopify:file_change", {
							action: event,
							file: fileName,
							path: destPath,
							type: fileExt
						});
					}
				} catch (error) {
					this.emit("log", { level: "error", message: `Failed to copy ${fileName}: ${error.message}` });
					return;
				}
			}
		}

		// Smart rebuilding based on file type and mode
		const needsStyleRebuild = this.shouldRebuildStyles(filePath, fileExt, isShopify);
		const needsScriptRebuild = this.shouldRebuildScripts(filePath, fileExt, isShopify);

		if (needsStyleRebuild) {
			this.emit("log", { level: "info", message: `🎨 Rebuilding styles${isShopify ? " for Shopify" : ""}...` });
			try {
				await this.buildStyles({ ...options, skipMinify: isShopify });
				if (isShopify) {
					this.emit("shopify:styles_rebuilt", { file: fileName });
				}
			} catch (error) {
				this.emit("log", { level: "error", message: `Style rebuild failed: ${error.message}` });
			}
		}

		if (needsScriptRebuild && !isShopify) {
			// Don't rebuild scripts in Shopify mode as often
			this.emit("log", { level: "info", message: "⚡ Rebuilding scripts..." });
			try {
				await this.buildScripts(options);
			} catch (error) {
				this.emit("log", { level: "error", message: `Script rebuild failed: ${error.message}` });
			}
		}

		// Emit change notification for external listeners
		this.emit("file:changed", {
			filePath,
			fileName,
			event,
			fileExt,
			isShopify,
			timestamp: new Date().toISOString()
		});
	}

	shouldRebuildStyles(filePath, fileExt, isShopify) {
		// Always rebuild styles for CSS/SCSS changes
		if ([".css", ".scss", ".sass"].includes(fileExt)) {
			return true;
		}

		// Rebuild for Tailwind-related files
		if (filePath.includes("tailwind") || filePath.includes("styles")) {
			return true;
		}

		// In Shopify mode, rebuild for liquid files that might affect styling
		if (isShopify && fileExt === ".liquid") {
			return true;
		}

		// Rebuild for JS files in development (they might import CSS)
		if ([".js", ".ts"].includes(fileExt) && !isShopify) {
			return true;
		}

		return false;
	}

	shouldRebuildScripts(filePath, fileExt, isShopify) {
		// Don't rebuild scripts too often in Shopify mode
		if (isShopify) {
			return false;
		}

		// Rebuild for JS/TS changes
		if ([".js", ".ts", ".jsx", ".tsx"].includes(fileExt)) {
			return true;
		}

		return false;
	}

	async buildWatch(options, context) {
		// Combined build and watch
		await this.build(options, context);
		return this.watch(options, context);
	}

	async optimize(options, context) {
		this.emit("log", { level: "info", message: "Running asset optimization..." });
		await this.optimizeAssets(options);
		return { success: true, message: "Assets optimized successfully" };
	}

	async analyze(options, context) {
		this.emit("log", { level: "info", message: "Analyzing build performance..." });

		const report = this.performance.getReport();
		const cacheStats = this.cache.getCacheStats();

		this.emit("metrics", {
			buildTime: report.totalTime,
			cacheHitRate: parseInt(cacheStats.hitRate),
			filesProcessed: this.stats.filesCopied,
			timeSaved: this.stats.timeSaved
		});

		return {
			success: true,
			report,
			cacheStats,
			stats: this.stats
		};
	}

	async startShopifyDev() {
		this.emit("log", { level: "info", message: "🛍️ Starting Shopify development mode..." });

		return new Promise((resolve, reject) => {
			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "shopify", "theme", "dev", "--path", "Curalife-Theme-Build"];

			const shopifyProcess = spawn(command, args, {
				shell: false,
				stdio: ["pipe", "pipe", "pipe"],
				cwd: process.cwd()
			});

			this.childProcesses.push(shopifyProcess);

			let hasStarted = false;
			let outputBuffer = "";
			let syncComplete = false;

			shopifyProcess.stdout.on("data", data => {
				const output = data.toString();
				outputBuffer += output;

				// Parse Shopify output for URLs and status
				this.parseShopifyOutput(output);

				// Check if Shopify has started successfully - look for various success indicators
				if (!hasStarted) {
					const isReady =
						output.includes("Preview your theme") ||
						output.includes("Serving") ||
						output.includes("Ready") ||
						output.includes("0.0.0.0") ||
						output.includes("127.0.0.1") ||
						(output.includes("myshopify.com") && !output.includes("Request to"));

					if (isReady) {
						hasStarted = true;
						this.emit("log", { level: "success", message: "🛍️ Shopify development server ready" });
						this.emit("shopify:ready", { started: true });
						resolve();
					}
				}

				// Also check for sync completion
				if (!syncComplete && (output.includes("theme synced") || output.includes("Synced"))) {
					syncComplete = true;
					this.emit("log", { level: "success", message: "🔄 Initial theme sync completed" });
				}
			});

			shopifyProcess.stderr.on("data", data => {
				const error = data.toString();

				// Don't treat parsing errors as fatal - they're common with complex Liquid files
				if (error.includes("Error parsing Liquid file")) {
					this.emit("log", { level: "warning", message: `Liquid parsing warning: ${error.split("\n")[0]}` });
					return;
				}

				if (error.includes("Error") || error.includes("Failed")) {
					this.emit("log", { level: "error", message: `Shopify error: ${error.trim()}` });
				} else {
					// Sometimes Shopify outputs info to stderr
					this.parseShopifyOutput(error);
				}
			});

			shopifyProcess.on("spawn", () => {
				this.emit("log", { level: "info", message: "🛍️ Shopify process spawned, waiting for server..." });
			});

			shopifyProcess.on("close", code => {
				this.emit("log", {
					level: code === 0 ? "info" : "warning",
					message: `🛍️ Shopify development server stopped (code: ${code})`
				});
				this.emit("shopify:stopped", { code });
			});

			shopifyProcess.on("error", error => {
				this.emit("log", { level: "error", message: `Shopify startup failed: ${error.message}` });
				reject(error);
			});

			// Increased timeout to 90 seconds for slower sync operations
			setTimeout(async () => {
				if (!hasStarted) {
					// Instead of rejecting, let's continue with file watching
					this.emit("log", {
						level: "warning",
						message: "🛍️ Shopify server taking longer than expected - continuing with file watching"
					});
					this.emit("log", {
						level: "info",
						message: "💡 Shopify CLI may still be syncing in the background. Check above for URLs once ready."
					});

					// Try to get URLs manually
					try {
						this.emit("log", { level: "info", message: "🔍 Attempting to detect Shopify URLs..." });
						await this.checkShopifyStatus();
					} catch (error) {
						// Ignore manual check errors
						this.emit("log", { level: "info", message: "💡 Use 'shopify theme dev --help' to see manual setup if needed" });
					}

					// Mark as resolved to continue with file watching
					hasStarted = true; // Prevent multiple resolves
					resolve();
				}
			}, 90000); // 90 seconds
		});
	}

	parseShopifyOutput(output) {
		const lines = output.split("\n");

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			// Enhanced URL detection - multiple patterns
			const urlPatterns = [
				/https?:\/\/[^\s\)]+/g, // Standard HTTP(S) URLs
				/http:\/\/(?:127\.0\.0\.1|localhost):\d+/g, // Local development URLs
				/https:\/\/[^.\s]+\.myshopify\.com[^\s]*/g, // Shopify store URLs
				/(?:Serving|Preview)\s+.*?(https?:\/\/[^\s\)]+)/gi, // Shopify CLI "Serving" or "Preview" lines
				/(?:Local|Development).*?(https?:\/\/[^\s\)]+)/gi // Local development indicators
			];

			let foundUrls = [];

			// Try all patterns
			for (const pattern of urlPatterns) {
				const matches = trimmedLine.match(pattern);
				if (matches) {
					foundUrls = foundUrls.concat(matches);
				}
			}

			// Process found URLs
			for (let url of foundUrls) {
				// Clean up URL (remove trailing punctuation, etc.)
				url = url.replace(/[.,;)]+$/, "");

				if (url.includes("127.0.0.1") || url.includes("localhost")) {
					this.emit("log", { level: "success", message: `🌐 Local development: ${url}` });
					this.emit("shopify:url", { type: "local", url });
				} else if (url.includes("myshopify.com")) {
					this.emit("log", { level: "success", message: `🛍️ Store preview: ${url}` });
					this.emit("shopify:url", { type: "preview", url });
				}
			}

			// Enhanced status parsing
			if (trimmedLine.includes("Serving") || trimmedLine.includes("Preview your theme")) {
				this.emit("shopify:status", { status: "serving", message: trimmedLine });
				this.emit("log", { level: "success", message: `🛍️ ${trimmedLine}` });
			} else if (trimmedLine.includes("Syncing") || trimmedLine.includes("Uploading")) {
				this.emit("shopify:status", { status: "syncing", message: trimmedLine });
				this.emit("log", { level: "info", message: `🔄 ${trimmedLine}` });
			} else if (trimmedLine.includes("Ready") && !trimmedLine.includes("Error")) {
				this.emit("shopify:status", { status: "ready", message: trimmedLine });
				this.emit("log", { level: "success", message: `✅ ${trimmedLine}` });
			} else if (trimmedLine.includes("Error") && !trimmedLine.includes("No such file")) {
				this.emit("shopify:status", { status: "error", message: trimmedLine });
				this.emit("log", { level: "warning", message: `⚠️ ${trimmedLine}` });
			}

			// Log all non-empty output for debugging (only in debug mode)
			if (process.env.DEBUG && trimmedLine.length > 0) {
				this.emit("log", { level: "info", message: `🛍️ Shopify: ${trimmedLine}` });
			}
		}
	}

	// 🛑 Stop watch mode and cleanup
	async stopWatch() {
		this.emit("log", { level: "info", message: "🛑 Stopping watch mode..." });

		// Stop all child processes
		if (this.cleanup) {
			this.cleanup();
		}

		// Emit stop event
		this.emit("watch:stopped", { timestamp: new Date().toISOString() });

		return { success: true, message: "Watch mode stopped successfully" };
	}

	// 🔄 Restart watch mode
	async restartWatch(options = {}) {
		await this.stopWatch();

		// Wait a moment for cleanup
		await new Promise(resolve => setTimeout(resolve, 1000));

		return this.watch(options);
	}

	// 🔍 Check Shopify status and URLs manually
	async checkShopifyStatus() {
		return new Promise((resolve, reject) => {
			const { command, baseArgs } = getNpxCommand();
			const args = [...baseArgs, "shopify", "theme", "info"];

			const infoProcess = spawn(command, args, {
				shell: false,
				stdio: ["pipe", "pipe", "pipe"],
				cwd: process.cwd()
			});

			let output = "";

			infoProcess.stdout.on("data", data => {
				output += data.toString();
			});

			infoProcess.stderr.on("data", data => {
				output += data.toString();
			});

			infoProcess.on("close", code => {
				if (code === 0) {
					// Try to extract URLs from theme info
					this.parseShopifyOutput(output);

					// Also emit a manual check for URLs if we can find theme info
					if (output.includes("Theme:") || output.includes("Store:")) {
						this.emit("log", { level: "info", message: "🔍 Checking for Shopify development URLs..." });

						// Try to construct likely URLs
						const storeMatch = output.match(/Store:\s*([^\s\n]+)/);
						if (storeMatch) {
							const storeName = storeMatch[1].replace(/\.myshopify\.com.*/, "");
							const previewUrl = `https://${storeName}.myshopify.com`;
							this.emit("shopify:url", { type: "preview", url: previewUrl });
						}
					}

					resolve(output);
				} else {
					reject(new Error(`Shopify info command failed with code ${code}`));
				}
			});

			// Timeout after 10 seconds
			setTimeout(() => {
				if (!infoProcess.killed) {
					infoProcess.kill();
					resolve("timeout");
				}
			}, 10000);
		});
	}

	setState(state, data) {
		this.state = state;
		this.emit("state", { state, data });
	}
}

// 🔄 Build Pipeline Helper
class BuildPipeline {
	constructor(engine, options) {
		this.engine = engine;
		this.options = options;
		this.stages = [];
	}

	stage(name, handler) {
		this.stages.push({ name, handler });
		return this;
	}

	async execute(context) {
		for (const stage of this.stages) {
			try {
				await stage.handler();
			} catch (error) {
				throw new Error(`Pipeline stage '${stage.name}' failed: ${error.message}`);
			}
		}
	}
}
