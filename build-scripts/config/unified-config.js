#!/usr/bin/env node

/**
 * 🔧 Unified Configuration System - OPTIMIZED
 *
 * Single source of truth for all build settings with smart environment detection
 * Merged and optimized from multiple config systems
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import os from "os";

export class ConfigManager {
	constructor() {
		this.config = null;
		this.environment = this.detectEnvironment();
		this.loaded = false;
		this._cache = new Map(); // Performance optimization for repeated gets
	}

	// 🚀 Optimized default configuration with performance-first approach
	getDefaultConfig() {
		return {
			// 🚀 Performance (optimized based on system capabilities)
			performance: {
				parallel: true,
				workers: this.getOptimalWorkerCount(),
				cache: true,
				memoryLimit: this.getOptimalMemoryLimit(),
				chunkSize: this.getOptimalChunkSize(),
				enableOptimizations: true,
				memoryThreshold: 512 * 1024 * 1024, // 512MB
				gcInterval: 30000 // 30 seconds
			},

			// 🎨 Visual (theme-aware)
			ui: {
				theme: this.detectOptimalTheme(),
				animations: !this.isCI() && !this.isLowPerformance(),
				compact: this.isLowPerformance() || this.hasSmallTerminal(),
				progress: this.getOptimalProgressStyle()
			},

			// 📁 Paths (normalized and validated)
			paths: {
				src: "src",
				build: "Curalife-Theme-Build",
				cache: "build-scripts/cache",
				nodeModules: "node_modules",
				cacheFile: "build-scripts/cache/.build-cache.json",
				performanceLog: "build-scripts/cache/.build-performance.json",
				temp: ".tmp"
			},

			// 👁️ Watch (smart debouncing based on environment)
			watch: {
				debounce: this.getOptimalDebounce(),
				tailwindDebounce: this.environment === "shopify" ? 500 : 300,
				stagewiseDebounce: 800,
				ignore: ["**/node_modules/**", "**/.git/**", "**/Curalife-Theme-Build/**", "**/build-scripts/cache/**", "**/.*", "**/*.log", "**/*.tmp"],
				hot: true,
				fileWatchInterval: 100,
				binaryInterval: 300,
				watchDepth: 99
			},

			// 🏗️ Build (environment-optimized)
			build: {
				minify: this.isProduction(),
				sourceMaps: this.isDevelopment(),
				analyze: this.isProduction(),
				optimize: true,
				enableTreeShaking: true,
				enableCodeSplitting: false,
				assetOptimization: !this.isShopify(), // Let Shopify handle in shopify mode
				performanceBudget: {
					maxAssetSize: 500 * 1024, // 500KB
					maxBundleSize: 2 * 1024 * 1024 // 2MB
				}
			},

			// 🔌 Integrations (smart defaults)
			integrations: {
				shopify: {
					enabled: this.isShopify(),
					hotReload: true,
					preview: true,
					buildPath: "./Curalife-Theme-Build",
					autoSync: true,
					syncDelay: 300, // ms delay before syncing changes
					watchIgnore: ["*.log", "*.tmp", ".DS_Store"],
					development: {
						host: "127.0.0.1",
						port: "auto", // Let Shopify choose
						openBrowser: false,
						notify: true
					}
				},
				tailwind: {
					enabled: true,
					watch: true,
					input: "./src/styles/tailwind.css",
					output: "./Curalife-Theme-Build/assets/tailwind.css",
					minify: this.isProduction()
				},
				vite: {
					enabled: true,
					hmr: !this.isProduction(),
					skipClean: true,
					verboseLogging: this.isDebugMode()
				},
				stagewise: {
					enabled: false,
					nodeModulesPath: "@stagewise/toolbar/dist",
					jsFileName: "stagewise-toolbar.js",
					cssFileName: "stagewise-toolbar.css"
				}
			},

			// 📊 Monitoring (optimized for performance)
			monitoring: {
				enablePerformanceReports: this.isDebugMode() || this.isProduction(),
				reportInterval: this.environment === "shopify" ? 300000 : 180000, // 5min vs 3min
				enableMemoryMonitoring: !this.isLowPerformance(),
				enableCacheAnalytics: true,
				maxLogSize: 10 * 1024 * 1024 // 10MB
			},

			// 🔒 Security
			security: {
				enableFileValidation: true,
				allowedFileTypes: [".js", ".css", ".liquid", ".json", ".md", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".eot"],
				maxFileSize: 50 * 1024 * 1024, // 50MB
				enableIntegrityChecks: this.isProduction()
			}
		};
	}

	// 🔍 Smart environment detection with fallbacks
	detectEnvironment() {
		if (process.env.CI === "true") return "ci";
		if (process.env.NODE_ENV === "production") return "production";
		if (process.env.VITE_WATCH_MODE === "true") return "development";
		if (process.env.WATCH_COMBINED === "true" || process.env.SHOPIFY_DEV === "true") return "shopify";
		return process.env.NODE_ENV || "development";
	}

	// ⚡ Performance optimization helpers
	getOptimalWorkerCount() {
		const cpuCount = os.cpus().length;
		if (this.isLowPerformance()) return Math.max(1, Math.floor(cpuCount / 4));
		if (this.isCI()) return Math.min(4, cpuCount);
		return Math.min(8, Math.max(2, Math.floor(cpuCount / 2)));
	}

	getOptimalMemoryLimit() {
		const totalMemory = os.totalmem();
		const memoryGB = totalMemory / (1024 * 1024 * 1024);

		if (memoryGB < 4) return "256MB";
		if (memoryGB < 8) return "512MB";
		if (memoryGB < 16) return "1GB";
		return "2GB";
	}

	getOptimalChunkSize() {
		if (this.isLowPerformance()) return 20;
		if (this.isCI()) return 30;
		return 50;
	}

	getOptimalDebounce() {
		if (this.isShopify()) return 300; // Shopify needs more time
		if (this.isDevelopment()) return 100; // Fast development
		return 150; // Balanced
	}

	detectOptimalTheme() {
		if (this.isCI()) return "minimal";
		if (this.isLowPerformance()) return "minimal";
		if (process.env.TERM_PROGRAM === "vscode") return "modern";
		return "dracula"; // Default beautiful theme
	}

	getOptimalProgressStyle() {
		if (this.isLowPerformance() || this.isCI()) return "simple";
		return "gradient";
	}

	// 🔧 System detection helpers
	isLowPerformance() {
		const totalMemory = os.totalmem();
		const memoryGB = totalMemory / (1024 * 1024 * 1024);
		return memoryGB < 4 || os.cpus().length < 4;
	}

	hasSmallTerminal() {
		const cols = process.stdout.columns || 80;
		return cols < 100;
	}

	isCI() {
		return this.environment === "ci";
	}

	// 📦 Optimized config loading with caching
	async load() {
		if (this.loaded) return this.config;

		// Start with optimized defaults
		this.config = this.getDefaultConfig();

		// Apply environment-specific overrides
		this.applyEnvironmentOverrides();

		// Apply command-line overrides
		this.applyCommandLineOverrides();

		// Load external config if exists
		await this.loadExternalConfig();

		// Validate and optimize configuration
		this.validateAndOptimizeConfig();

		this.loaded = true;
		return this.config;
	}

	applyEnvironmentOverrides() {
		const envOverrides = {
			development: {
				build: { minify: false, sourceMaps: true, analyze: false },
				watch: { debounce: 100 },
				monitoring: { enablePerformanceReports: false }
			},
			production: {
				build: { minify: true, sourceMaps: false, analyze: true },
				performance: { enableOptimizations: true },
				monitoring: { enablePerformanceReports: true }
			},
			shopify: {
				watch: { debounce: 300, enableStagewise: true },
				build: { assetOptimization: false },
				integrations: { shopify: { enabled: true } }
			},
			ci: {
				ui: { animations: false, theme: "minimal", compact: true },
				performance: { workers: 2, parallel: true },
				monitoring: { enableMemoryMonitoring: false }
			}
		};

		if (envOverrides[this.environment]) {
			this.config = this.mergeDeep(this.config, envOverrides[this.environment]);
		}
	}

	applyCommandLineOverrides() {
		const args = process.argv;

		// Performance overrides
		if (args.includes("--no-cache")) this.config.performance.cache = false;
		if (args.includes("--no-parallel")) this.config.performance.parallel = false;
		if (args.includes("--workers")) {
			const index = args.indexOf("--workers");
			if (args[index + 1]) this.config.performance.workers = parseInt(args[index + 1]);
		}

		// Build overrides
		if (args.includes("--no-minify")) this.config.build.minify = false;
		if (args.includes("--source-maps")) this.config.build.sourceMaps = true;
		if (args.includes("--analyze")) this.config.build.analyze = true;

		// Debug mode
		if (args.includes("--debug")) {
			this.config.monitoring.enablePerformanceReports = true;
			this.config.integrations.vite.verboseLogging = true;
		}
	}

	async loadExternalConfig() {
		const configFiles = ["curalife.config.js", "curalife.config.json", ".curalife.config.js"];

		for (const configFile of configFiles) {
			if (existsSync(configFile)) {
				try {
					let externalConfig;
					if (configFile.endsWith(".js")) {
						const configModule = await import(join(process.cwd(), configFile));
						externalConfig = configModule.default || configModule;
					} else {
						externalConfig = JSON.parse(readFileSync(configFile, "utf8"));
					}

					this.config = this.mergeDeep(this.config, externalConfig);
					break;
				} catch (error) {
					console.warn(`⚠️ Failed to load config ${configFile}:`, error.message);
				}
			}
		}
	}

	validateAndOptimizeConfig() {
		// Validate and auto-correct common issues
		if (this.config.performance.workers < 1) this.config.performance.workers = 1;
		if (this.config.performance.workers > 16) this.config.performance.workers = 16;
		if (this.config.performance.chunkSize < 1) this.config.performance.chunkSize = 10;
		if (this.config.watch.debounce < 0) this.config.watch.debounce = 100;

		// Optimize based on detected capabilities
		if (this.isLowPerformance()) {
			this.config.performance.parallel = false;
			this.config.ui.animations = false;
			this.config.monitoring.enableMemoryMonitoring = false;
		}
	}

	// 🎯 Optimized get method with caching
	get(path, defaultValue = undefined) {
		// Use cache for performance
		if (this._cache.has(path)) {
			return this._cache.get(path);
		}

		if (!this.loaded) {
			// Lazy load for performance
			this.config = this.getDefaultConfig();
			this.applyEnvironmentOverrides();
			this.applyCommandLineOverrides();
			this.loaded = true;
		}

		const value = path.split(".").reduce((obj, key) => {
			return obj && obj[key] !== undefined ? obj[key] : defaultValue;
		}, this.config);

		// Cache the result
		this._cache.set(path, value);
		return value;
	}

	// 🔀 Optimized deep merge utility
	mergeDeep(...objects) {
		return objects.reduce((acc, obj) => {
			Object.keys(obj).forEach(key => {
				if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
					acc[key] = this.mergeDeep(acc[key] || {}, obj[key]);
				} else {
					acc[key] = obj[key];
				}
			});
			return acc;
		}, {});
	}

	// 🔧 Utility methods
	isProduction() {
		return this.environment === "production";
	}
	isDevelopment() {
		return this.environment === "development";
	}
	isShopify() {
		return this.environment === "shopify";
	}
	isDebugMode() {
		return process.argv.includes("--debug");
	}

	// 📊 Performance helpers (cached)
	getMaxWorkers() {
		return this.get("performance.workers");
	}
	getChunkSize() {
		return this.get("performance.chunkSize");
	}
	isCacheEnabled() {
		return this.get("performance.cache");
	}
	isParallelEnabled() {
		return this.get("performance.parallel");
	}

	// Clear cache when needed
	clearCache() {
		this._cache.clear();
	}
}

// Create and export singleton instance
const config = new ConfigManager();
export default config;
