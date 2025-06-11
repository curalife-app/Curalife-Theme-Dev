#!/usr/bin/env node

/**
 * Centralized Configuration System for Curalife Theme Build
 *
 * All build-related configuration in one place with environment overrides
 * and validation to prevent configuration drift.
 */

import os from "os";
import path from "path";
import fs from "fs";

// Base configuration schema
const DEFAULT_CONFIG = {
	// Performance Settings
	performance: {
		maxWorkers: Math.min(8, Math.max(2, Math.floor(os.cpus().length / 2))),
		chunkSize: 50,
		enableCache: true,
		enableParallel: true,
		enableOptimizations: true,
		memoryThreshold: 512 * 1024 * 1024, // 512MB
		gcInterval: 30000 // 30 seconds
	},

	// File Paths
	paths: {
		src: "src",
		build: "Curalife-Theme-Build",
		cache: "build-scripts/cache",
		nodeModules: "node_modules",
		cacheFile: "build-scripts/cache/.build-cache.json",
		performanceLog: "build-scripts/cache/.build-performance.json"
	},

	// Watch Settings
	watch: {
		debounceDelay: 150,
		tailwindDebounce: 500,
		stagewiseDebounce: 800,
		fileWatchInterval: 100,
		binaryInterval: 300,
		watchDepth: 99
	},

	// Build Settings
	build: {
		enableMinification: true,
		enableSourceMaps: false,
		enableTreeShaking: true,
		enableCodeSplitting: false,
		assetOptimization: true,
		bundleAnalysis: false,
		performanceBudget: {
			maxAssetSize: 500 * 1024, // 500KB
			maxBundleSize: 2 * 1024 * 1024 // 2MB
		}
	},

	// Environment-Specific Overrides
	environments: {
		development: {
			build: {
				enableMinification: false,
				enableSourceMaps: true
			},
			watch: {
				debounceDelay: 100 // Faster in dev
			}
		},
		production: {
			build: {
				enableMinification: true,
				enableSourceMaps: false,
				bundleAnalysis: true
			},
			performance: {
				enableOptimizations: true
			}
		},
		shopify: {
			watch: {
				enableStagewise: true,
				tailwindDebounce: 500
			},
			build: {
				assetOptimization: false // Let Shopify handle this
			}
		}
	},

	// Ignored Files/Patterns
	ignore: {
		watch: ["**/node_modules/**", "**/.git/**", "**/Curalife-Theme-Build/**", "**/build-scripts/cache/**", "**/.*", "**/*.log", "**/*.tmp"],
		build: ["**/*.test.js", "**/*.spec.js", "**/test/**", "**/tests/**", "**/.DS_Store"]
	},

	// Plugin Configuration
	plugins: {
		tailwind: {
			input: "./src/styles/tailwind.css",
			output: "./Curalife-Theme-Build/assets/tailwind.css",
			minify: true
		},
		vite: {
			skipClean: true,
			verboseLogging: false
		},
		stagewise: {
			enabled: false,
			nodeModulesPath: "@stagewise/toolbar/dist",
			jsFileName: "stagewise-toolbar.js",
			cssFileName: "stagewise-toolbar.css"
		}
	},

	// Monitoring & Analytics
	monitoring: {
		enablePerformanceReports: true,
		reportInterval: 300000, // 5 minutes
		enableMemoryMonitoring: true,
		enableCacheAnalytics: true,
		maxLogSize: 10 * 1024 * 1024 // 10MB
	},

	// Security Settings
	security: {
		enableFileValidation: true,
		allowedFileTypes: [".js", ".css", ".liquid", ".json", ".md", ".txt", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".eot"],
		maxFileSize: 50 * 1024 * 1024, // 50MB
		enableIntegrityChecks: true
	}
};

class ConfigManager {
	constructor() {
		this.config = null;
		this.environment = this.detectEnvironment();
		this.loaded = false;
	}

	detectEnvironment() {
		if (process.env.VITE_WATCH_MODE === "true") return "development";
		if (process.env.NODE_ENV === "production") return "production";
		if (process.env.WATCH_COMBINED === "true") return "shopify";
		return process.env.NODE_ENV || "development";
	}

	async load() {
		if (this.loaded) return this.config;

		// Start with default config
		this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

		// Apply environment-specific overrides
		if (this.config.environments[this.environment]) {
			this.config = this.mergeDeep(this.config, this.config.environments[this.environment]);
		}

		// Apply command-line overrides
		this.applyCommandLineOverrides();

		// Load external config if exists
		await this.loadExternalConfig();

		// Validate configuration
		this.validateConfig();

		this.loaded = true;
		return this.config;
	}

	mergeDeep(target, source) {
		const output = Object.assign({}, target);
		if (this.isObject(target) && this.isObject(source)) {
			Object.keys(source).forEach(key => {
				if (this.isObject(source[key])) {
					if (!(key in target)) {
						Object.assign(output, { [key]: source[key] });
					} else {
						output[key] = this.mergeDeep(target[key], source[key]);
					}
				} else {
					Object.assign(output, { [key]: source[key] });
				}
			});
		}
		return output;
	}

	isObject(item) {
		return item && typeof item === "object" && !Array.isArray(item);
	}

	applyCommandLineOverrides() {
		const args = process.argv;

		// Performance overrides
		if (args.includes("--no-cache")) {
			this.config.performance.enableCache = false;
		}
		if (args.includes("--no-parallel")) {
			this.config.performance.enableParallel = false;
		}
		if (args.includes("--max-workers")) {
			const index = args.indexOf("--max-workers");
			if (args[index + 1]) {
				this.config.performance.maxWorkers = parseInt(args[index + 1]);
			}
		}

		// Build overrides
		if (args.includes("--no-minify")) {
			this.config.build.enableMinification = false;
		}
		if (args.includes("--source-maps")) {
			this.config.build.enableSourceMaps = true;
		}
		if (args.includes("--bundle-analysis")) {
			this.config.build.bundleAnalysis = true;
		}

		// Debug mode
		if (args.includes("--debug")) {
			this.config.monitoring.enablePerformanceReports = true;
			this.config.plugins.vite.verboseLogging = true;
		}
	}

	async loadExternalConfig() {
		const configPaths = ["curalife.config.js", "curalife.config.json", ".curalife.config.js", ".curalife.config.json"];

		for (const configPath of configPaths) {
			if (fs.existsSync(configPath)) {
				try {
					let externalConfig;
					if (configPath.endsWith(".js")) {
						const configModule = await import(path.resolve(configPath));
						externalConfig = configModule.default || configModule;
					} else {
						externalConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
					}

					this.config = this.mergeDeep(this.config, externalConfig);
					console.log(`✓ Loaded external config: ${configPath}`);
					break;
				} catch (error) {
					console.warn(`⚠ Failed to load config ${configPath}:`, error.message);
				}
			}
		}
	}

	validateConfig() {
		const errors = [];

		// Validate performance settings
		if (this.config.performance.maxWorkers < 1 || this.config.performance.maxWorkers > 16) {
			errors.push("maxWorkers must be between 1 and 16");
		}

		if (this.config.performance.chunkSize < 1 || this.config.performance.chunkSize > 1000) {
			errors.push("chunkSize must be between 1 and 1000");
		}

		// Validate paths
		if (!fs.existsSync(this.config.paths.src)) {
			errors.push(`Source directory does not exist: ${this.config.paths.src}`);
		}

		// Validate debounce settings
		if (this.config.watch.debounceDelay < 0 || this.config.watch.debounceDelay > 5000) {
			errors.push("debounceDelay must be between 0 and 5000ms");
		}

		// Validate performance budget
		const budget = this.config.build.performanceBudget;
		if (budget.maxAssetSize < 1024 || budget.maxAssetSize > 100 * 1024 * 1024) {
			errors.push("maxAssetSize must be between 1KB and 100MB");
		}

		if (errors.length > 0) {
			console.error("❌ Configuration validation failed:");
			errors.forEach(error => console.error(`  - ${error}`));
			process.exit(1);
		}
	}

	get(path, defaultValue = undefined) {
		if (!this.loaded) {
			// Synchronous fallback - load without external config
			this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
			if (this.config.environments[this.environment]) {
				this.config = this.mergeDeep(this.config, this.config.environments[this.environment]);
			}
			this.applyCommandLineOverrides();
			this.validateConfig();
			this.loaded = true;
		}

		return path.split(".").reduce((obj, key) => {
			return obj && obj[key] !== undefined ? obj[key] : defaultValue;
		}, this.config);
	}

	set(path, value) {
		if (!this.loaded) {
			// Synchronous fallback - load without external config
			this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
			if (this.config.environments[this.environment]) {
				this.config = this.mergeDeep(this.config, this.config.environments[this.environment]);
			}
			this.applyCommandLineOverrides();
			this.validateConfig();
			this.loaded = true;
		}

		const keys = path.split(".");
		const lastKey = keys.pop();
		const target = keys.reduce((obj, key) => {
			if (!obj[key]) obj[key] = {};
			return obj[key];
		}, this.config);

		target[lastKey] = value;
	}

	getEnvironment() {
		return this.environment;
	}

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

	exportConfig() {
		if (!this.loaded) {
			// Synchronous fallback - load without external config
			this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
			if (this.config.environments[this.environment]) {
				this.config = this.mergeDeep(this.config, this.config.environments[this.environment]);
			}
			this.applyCommandLineOverrides();
			this.validateConfig();
			this.loaded = true;
		}
		return JSON.parse(JSON.stringify(this.config));
	}

	// Performance helpers
	getMaxWorkers() {
		return this.get("performance.maxWorkers");
	}

	getChunkSize() {
		return this.get("performance.chunkSize");
	}

	isCacheEnabled() {
		return this.get("performance.enableCache");
	}

	isParallelEnabled() {
		return this.get("performance.enableParallel");
	}

	// Path helpers
	getSrcPath() {
		return this.get("paths.src");
	}

	getBuildPath() {
		return this.get("paths.build");
	}

	getCachePath() {
		return this.get("paths.cache");
	}

	getCacheFile() {
		return this.get("paths.cacheFile");
	}

	getPerformanceLog() {
		return this.get("paths.performanceLog");
	}

	// Watch helpers
	getDebounceDelay() {
		return this.get("watch.debounceDelay");
	}

	getTailwindDebounce() {
		return this.get("watch.tailwindDebounce");
	}

	getStagewiseDebounce() {
		return this.get("watch.stagewiseDebounce");
	}

	getWatchIgnorePatterns() {
		return this.get("ignore.watch");
	}

	getBuildIgnorePatterns() {
		return this.get("ignore.build");
	}

	// Build helpers
	isMinificationEnabled() {
		return this.get("build.enableMinification");
	}

	areSourceMapsEnabled() {
		return this.get("build.enableSourceMaps");
	}

	isTreeShakingEnabled() {
		return this.get("build.enableTreeShaking");
	}

	getPerformanceBudget() {
		return this.get("build.performanceBudget");
	}

	// Plugin helpers
	getTailwindConfig() {
		return this.get("plugins.tailwind");
	}

	getViteConfig() {
		return this.get("plugins.vite");
	}

	getStagewiseConfig() {
		return this.get("plugins.stagewise");
	}

	// Monitoring helpers
	arePerformanceReportsEnabled() {
		return this.get("monitoring.enablePerformanceReports");
	}

	getReportInterval() {
		return this.get("monitoring.reportInterval");
	}

	isMemoryMonitoringEnabled() {
		return this.get("monitoring.enableMemoryMonitoring");
	}
}

// Create and export singleton instance
const config = new ConfigManager();

export default config;
export { ConfigManager, DEFAULT_CONFIG };
