/**
 * Build Analytics & Monitoring System
 *
 * Provides comprehensive metrics and analysis for the Curalife Theme build process:
 * - Build performance tracking
 * - Bundle size analysis
 * - Performance regression detection
 * - Optimization recommendations
 * - Historical trend analysis
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildAnalytics {
	constructor(options = {}) {
		this.options = {
			enableDetailed: options.enableDetailed ?? true,
			enableRegressionDetection: options.enableRegressionDetection ?? true,
			enableBundleAnalysis: options.enableBundleAnalysis ?? true,
			enableOptimizationSuggestions: options.enableOptimizationSuggestions ?? true,
			historyLimit: options.historyLimit ?? 50,
			dataDir: options.dataDir ?? path.join(__dirname, "../../analytics-data"),
			...options
		};

		this.metrics = {
			buildTime: 0,
			startTime: 0,
			endTime: 0,
			filesProcessed: 0,
			bundleSizes: {},
			cacheHits: 0,
			cacheMisses: 0,
			memoryUsage: {},
			errors: [],
			warnings: [],
			optimizations: []
		};

		this.history = [];
		this.thresholds = {
			buildTimeWarning: 30000, // 30 seconds
			buildTimeError: 60000, // 1 minute
			bundleSizeWarning: 1024 * 1024, // 1MB
			bundleSizeError: 2 * 1024 * 1024, // 2MB
			regressionThreshold: 0.15 // 15% increase
		};

		this.loadHistory();
	}

	// Initialize analytics session
	startAnalytics() {
		this.metrics.startTime = Date.now();
		this.metrics.buildId = this.generateBuildId();
		this.metrics.timestamp = new Date().toISOString();
		this.metrics.version = this.getProjectVersion();

		console.log(`🔍 Build Analytics Started - ID: ${this.metrics.buildId}`);
		return this.metrics.buildId;
	}

	// Track file processing
	trackFileProcessed(filePath, processingTime, fromCache = false) {
		this.metrics.filesProcessed++;

		if (fromCache) {
			this.metrics.cacheHits++;
		} else {
			this.metrics.cacheMisses++;
		}

		if (this.options.enableDetailed) {
			if (!this.metrics.fileDetails) this.metrics.fileDetails = [];
			this.metrics.fileDetails.push({
				path: filePath,
				processingTime,
				fromCache,
				timestamp: Date.now()
			});
		}
	}

	// Track bundle sizes
	trackBundle(bundleName, size, type = "js") {
		this.metrics.bundleSizes[bundleName] = {
			size,
			type,
			sizeFormatted: this.formatBytes(size),
			timestamp: Date.now()
		};

		// Check for size warnings
		if (size > this.thresholds.bundleSizeWarning) {
			this.addWarning(`Bundle '${bundleName}' is large (${this.formatBytes(size)})`);
		}
		if (size > this.thresholds.bundleSizeError) {
			this.addError(`Bundle '${bundleName}' exceeds size limit (${this.formatBytes(size)})`);
		}
	}

	// Track memory usage
	trackMemoryUsage(stage) {
		const usage = process.memoryUsage();
		this.metrics.memoryUsage[stage] = {
			...usage,
			timestamp: Date.now(),
			heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
			heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
			externalMB: Math.round(usage.external / 1024 / 1024)
		};
	}

	// Add error
	addError(message, details = null) {
		this.metrics.errors.push({
			message,
			details,
			timestamp: Date.now()
		});
	}

	// Add warning
	addWarning(message, details = null) {
		this.metrics.warnings.push({
			message,
			details,
			timestamp: Date.now()
		});
	}

	// Add optimization suggestion
	addOptimization(type, message, impact = "medium") {
		this.metrics.optimizations.push({
			type,
			message,
			impact,
			timestamp: Date.now()
		});
	}

	// Complete analytics session
	completeAnalytics() {
		this.metrics.endTime = Date.now();
		this.metrics.buildTime = this.metrics.endTime - this.metrics.startTime;

		// Calculate cache efficiency
		const totalFiles = this.metrics.cacheHits + this.metrics.cacheMisses;
		this.metrics.cacheEfficiency = totalFiles > 0 ? Math.round((this.metrics.cacheHits / totalFiles) * 100) : 0;

		// Check build time thresholds
		if (this.metrics.buildTime > this.thresholds.buildTimeWarning) {
			this.addWarning(`Build time exceeded threshold (${this.formatTime(this.metrics.buildTime)})`);
		}
		if (this.metrics.buildTime > this.thresholds.buildTimeError) {
			this.addError(`Build time critically slow (${this.formatTime(this.metrics.buildTime)})`);
		}

		// Generate analysis
		this.generateAnalysis();

		// Save to history
		this.saveToHistory();

		// Display results
		this.displayResults();

		return this.metrics;
	}

	// Generate comprehensive analysis
	generateAnalysis() {
		this.analysis = {
			performance: this.analyzePerformance(),
			bundles: this.analyzeBundles(),
			trends: this.analyzeTrends(),
			optimizations: this.generateOptimizations()
		};
	}

	// Analyze build performance
	analyzePerformance() {
		const avgBuildTime = this.getAverageBuildTime();
		const performanceScore = this.calculatePerformanceScore();

		return {
			buildTime: this.metrics.buildTime,
			buildTimeFormatted: this.formatTime(this.metrics.buildTime),
			avgBuildTime,
			avgBuildTimeFormatted: this.formatTime(avgBuildTime),
			performanceScore,
			cacheEfficiency: this.metrics.cacheEfficiency,
			filesProcessed: this.metrics.filesProcessed,
			isRegression: this.detectRegression("buildTime"),
			recommendation: this.getPerformanceRecommendation(performanceScore)
		};
	}

	// Analyze bundle sizes
	analyzeBundles() {
		const bundles = Object.entries(this.metrics.bundleSizes).map(([name, data]) => ({
			name,
			...data,
			trend: this.getBundleTrend(name),
			recommendation: this.getBundleRecommendation(name, data.size)
		}));

		const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);

		return {
			bundles,
			totalSize,
			totalSizeFormatted: this.formatBytes(totalSize),
			largestBundle: bundles.reduce((max, bundle) => (bundle.size > max.size ? bundle : max), bundles[0] || { size: 0 }),
			trend: this.getTotalSizeTrend(totalSize)
		};
	}

	// Analyze historical trends
	analyzeTrends() {
		if (this.history.length < 2) return null;

		const recent = this.history.slice(-10);
		const trends = {
			buildTime: this.calculateTrend(recent.map(h => h.buildTime)),
			bundleSize: this.calculateTrend(recent.map(h => this.getTotalBundleSize(h))),
			cacheEfficiency: this.calculateTrend(recent.map(h => h.cacheEfficiency)),
			filesProcessed: this.calculateTrend(recent.map(h => h.filesProcessed))
		};

		return trends;
	}

	// Generate optimization suggestions
	generateOptimizations() {
		const suggestions = [];

		// Cache optimization
		if (this.metrics.cacheEfficiency < 70) {
			suggestions.push({
				type: "cache",
				impact: "high",
				message: "Low cache efficiency detected. Consider improving cache strategies.",
				action: "Review file change detection and cache invalidation logic"
			});
		}

		// Bundle size optimization
		const largeBundles = Object.entries(this.metrics.bundleSizes).filter(([_, data]) => data.size > this.thresholds.bundleSizeWarning);

		if (largeBundles.length > 0) {
			suggestions.push({
				type: "bundleSize",
				impact: "medium",
				message: `${largeBundles.length} bundle(s) exceed size thresholds`,
				action: "Consider code splitting or asset optimization"
			});
		}

		// Build time optimization
		if (this.metrics.buildTime > this.thresholds.buildTimeWarning) {
			suggestions.push({
				type: "buildTime",
				impact: "high",
				message: "Build time exceeds optimal threshold",
				action: "Consider parallel processing or selective building"
			});
		}

		// Memory optimization
		const peakMemory = Math.max(...Object.values(this.metrics.memoryUsage).map(usage => usage.heapUsedMB));

		if (peakMemory > 500) {
			suggestions.push({
				type: "memory",
				impact: "medium",
				message: `High memory usage detected (${peakMemory}MB)`,
				action: "Consider streaming processing or memory cleanup"
			});
		}

		return suggestions;
	}

	// Display comprehensive results
	displayResults() {
		const colors = {
			green: "\x1b[32m",
			yellow: "\x1b[33m",
			red: "\x1b[31m",
			blue: "\x1b[34m",
			cyan: "\x1b[36m",
			reset: "\x1b[0m",
			bold: "\x1b[1m"
		};

		console.log(`\n${colors.cyan}${colors.bold}📊 BUILD ANALYTICS REPORT${colors.reset}`);
		console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

		// Performance Summary
		const perf = this.analysis.performance;
		const perfColor = perf.performanceScore >= 80 ? colors.green : perf.performanceScore >= 60 ? colors.yellow : colors.red;

		console.log(`${colors.bold}⚡ PERFORMANCE${colors.reset}`);
		console.log(`  Build Time: ${perfColor}${perf.buildTimeFormatted}${colors.reset} (avg: ${perf.avgBuildTimeFormatted})`);
		console.log(`  Performance Score: ${perfColor}${perf.performanceScore}/100${colors.reset}`);
		console.log(`  Cache Efficiency: ${colors.green}${perf.cacheEfficiency}%${colors.reset}`);
		console.log(`  Files Processed: ${colors.blue}${perf.filesProcessed}${colors.reset}\n`);

		// Bundle Analysis
		if (this.options.enableBundleAnalysis && this.analysis.bundles.bundles.length > 0) {
			console.log(`${colors.bold}📦 BUNDLE ANALYSIS${colors.reset}`);
			console.log(`  Total Size: ${colors.cyan}${this.analysis.bundles.totalSizeFormatted}${colors.reset}`);

			const topBundles = this.analysis.bundles.bundles.sort((a, b) => b.size - a.size).slice(0, 5);

			topBundles.forEach(bundle => {
				const sizeColor = bundle.size > this.thresholds.bundleSizeWarning ? colors.red : colors.green;
				console.log(`  ${bundle.name}: ${sizeColor}${bundle.sizeFormatted}${colors.reset}`);
			});
			console.log("");
		}

		// Optimization Suggestions
		if (this.analysis.optimizations.length > 0) {
			console.log(`${colors.bold}💡 OPTIMIZATION SUGGESTIONS${colors.reset}`);
			this.analysis.optimizations.forEach(opt => {
				const impactColor = opt.impact === "high" ? colors.red : opt.impact === "medium" ? colors.yellow : colors.green;
				console.log(`  ${impactColor}${opt.impact.toUpperCase()}${colors.reset}: ${opt.message}`);
				if (opt.action) {
					console.log(`    → ${opt.action}`);
				}
			});
			console.log("");
		}

		// Warnings and Errors
		if (this.metrics.warnings.length > 0 || this.metrics.errors.length > 0) {
			console.log(`${colors.bold}⚠️  ISSUES${colors.reset}`);
			this.metrics.errors.forEach(error => {
				console.log(`  ${colors.red}ERROR${colors.reset}: ${error.message}`);
			});
			this.metrics.warnings.forEach(warning => {
				console.log(`  ${colors.yellow}WARNING${colors.reset}: ${warning.message}`);
			});
			console.log("");
		}

		console.log(`${colors.cyan}Report ID: ${this.metrics.buildId}${colors.reset}`);
		console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);
	}

	// Utility methods
	generateBuildId() {
		return createHash("md5").update(`${Date.now()}-${Math.random()}`).digest("hex").substring(0, 8);
	}

	formatTime(ms) {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}

	calculatePerformanceScore() {
		let score = 100;

		// Deduct points for slow build time
		if (this.metrics.buildTime > 10000) score -= 20;
		if (this.metrics.buildTime > 30000) score -= 30;
		if (this.metrics.buildTime > 60000) score -= 40;

		// Deduct points for low cache efficiency
		if (this.metrics.cacheEfficiency < 50) score -= 20;
		if (this.metrics.cacheEfficiency < 30) score -= 30;

		// Deduct points for errors
		score -= this.metrics.errors.length * 10;
		score -= this.metrics.warnings.length * 5;

		return Math.max(0, score);
	}

	getAverageBuildTime() {
		if (this.history.length === 0) return this.metrics.buildTime;
		const recent = this.history.slice(-10);
		return recent.reduce((sum, h) => sum + h.buildTime, 0) / recent.length;
	}

	detectRegression(metric) {
		if (this.history.length < 2) return false;
		const current = this.metrics[metric];
		const previous = this.history[this.history.length - 1][metric];
		return (current - previous) / previous > this.thresholds.regressionThreshold;
	}

	getProjectVersion() {
		try {
			const packagePath = path.join(__dirname, "../../../package.json");
			const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
			return packageJson.version || "1.0.0";
		} catch {
			return "1.0.0";
		}
	}

	calculateTrend(values) {
		if (values.length < 2) return "stable";
		const recent = values.slice(-5);
		const older = values.slice(-10, -5);

		if (older.length === 0) return "stable";

		const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
		const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

		const change = (recentAvg - olderAvg) / olderAvg;

		if (change > 0.1) return "increasing";
		if (change < -0.1) return "decreasing";
		return "stable";
	}

	getTotalBundleSize(historyEntry) {
		if (!historyEntry.bundleSizes) return 0;
		return Object.values(historyEntry.bundleSizes).reduce((sum, bundle) => sum + bundle.size, 0);
	}

	// History management
	loadHistory() {
		try {
			if (!fs.existsSync(this.options.dataDir)) {
				fs.mkdirSync(this.options.dataDir, { recursive: true });
			}

			const historyPath = path.join(this.options.dataDir, "build-history.json");
			if (fs.existsSync(historyPath)) {
				this.history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
			}
		} catch (error) {
			console.warn("Failed to load build history:", error.message);
			this.history = [];
		}
	}

	saveToHistory() {
		try {
			// Add current metrics to history
			this.history.push({
				...this.metrics,
				analysis: this.analysis
			});

			// Limit history size
			if (this.history.length > this.options.historyLimit) {
				this.history = this.history.slice(-this.options.historyLimit);
			}

			// Save to disk
			const historyPath = path.join(this.options.dataDir, "build-history.json");
			fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2));

			// Save current report
			const reportPath = path.join(this.options.dataDir, `report-${this.metrics.buildId}.json`);
			fs.writeFileSync(
				reportPath,
				JSON.stringify(
					{
						metrics: this.metrics,
						analysis: this.analysis
					},
					null,
					2
				)
			);
		} catch (error) {
			console.warn("Failed to save build history:", error.message);
		}
	}

	// Export functionality
	exportReport(format = "json") {
		const reportData = {
			metrics: this.metrics,
			analysis: this.analysis,
			timestamp: new Date().toISOString()
		};

		switch (format) {
			case "json":
				return JSON.stringify(reportData, null, 2);
			case "csv":
				return this.exportToCSV(reportData);
			default:
				return reportData;
		}
	}

	exportToCSV(data) {
		const rows = [
			["Metric", "Value"],
			["Build ID", data.metrics.buildId],
			["Build Time (ms)", data.metrics.buildTime],
			["Files Processed", data.metrics.filesProcessed],
			["Cache Efficiency (%)", data.metrics.cacheEfficiency],
			["Performance Score", data.analysis.performance.performanceScore],
			["Errors", data.metrics.errors.length],
			["Warnings", data.metrics.warnings.length]
		];

		return rows.map(row => row.join(",")).join("\n");
	}
}

// Export the class and create a default instance
export default BuildAnalytics;

// Factory function for easy integration
export function createBuildAnalytics(options = {}) {
	return new BuildAnalytics(options);
}

// Utility function to integrate with existing build processes
export function withAnalytics(buildFunction, options = {}) {
	return async function (...args) {
		const analytics = new BuildAnalytics(options);
		const buildId = analytics.startAnalytics();

		try {
			// Track memory at start
			analytics.trackMemoryUsage("start");

			const result = await buildFunction(...args);

			// Track memory at end
			analytics.trackMemoryUsage("end");

			return result;
		} catch (error) {
			analytics.addError(error.message, error.stack);
			throw error;
		} finally {
			analytics.completeAnalytics();
		}
	};
}
