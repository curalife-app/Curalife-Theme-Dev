#!/usr/bin/env node

/**
 * Memory Management & Resource Monitoring for Curalife Theme Build
 *
 * Features:
 * - Real-time memory usage tracking
 * - Automatic garbage collection when needed
 * - Resource leak detection
 * - Performance bottleneck identification
 * - Build health monitoring
 */

import os from "os";
import chalk from "chalk";
import config from "./config.js";

class MemoryMonitor {
	constructor() {
		this.isEnabled = config.isMemoryMonitoringEnabled();
		this.memoryThreshold = config.get("performance.memoryThreshold");
		this.gcInterval = config.get("performance.gcInterval");
		this.samples = [];
		this.maxSamples = 100;
		this.warnings = [];
		this.isMonitoring = false;
		this.intervalId = null;
		this.startTime = Date.now();
		this.peakMemory = 0;
		this.gcCount = 0;
	}

	start() {
		if (!this.isEnabled || this.isMonitoring) return;

		this.isMonitoring = true;
		console.log(chalk.hex("#bd93f9")("🧠 Memory monitor started"));

		// Start periodic monitoring
		this.intervalId = setInterval(() => {
			this.collectSample();
		}, 5000); // Every 5 seconds

		// Setup automatic GC trigger
		setInterval(() => {
			this.checkGarbageCollection();
		}, this.gcInterval);

		// Setup process handlers
		process.on("exit", () => this.generateFinalReport());
	}

	stop() {
		if (!this.isMonitoring) return;

		this.isMonitoring = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.generateFinalReport();
		console.log(chalk.hex("#bd93f9")("🧠 Memory monitor stopped"));
	}

	collectSample() {
		const usage = process.memoryUsage();
		const system = {
			totalMemory: os.totalmem(),
			freeMemory: os.freemem(),
			usedMemory: os.totalmem() - os.freemem(),
			loadAverage: os.loadavg()[0]
		};

		const sample = {
			timestamp: Date.now(),
			heap: {
				used: usage.heapUsed,
				total: usage.heapTotal,
				utilization: (usage.heapUsed / usage.heapTotal) * 100
			},
			external: usage.external,
			arrayBuffers: usage.arrayBuffers || 0,
			rss: usage.rss,
			system: system,
			uptime: Date.now() - this.startTime
		};

		this.samples.push(sample);

		// Keep only recent samples
		if (this.samples.length > this.maxSamples) {
			this.samples = this.samples.slice(-this.maxSamples);
		}

		// Track peak memory
		if (sample.heap.used > this.peakMemory) {
			this.peakMemory = sample.heap.used;
		}

		// Check for issues
		this.analyzeSample(sample);
	}

	analyzeSample(sample) {
		const warnings = [];

		// Memory threshold warning
		if (sample.heap.used > this.memoryThreshold) {
			warnings.push({
				type: "HIGH_MEMORY",
				message: `Memory usage ${this.formatBytes(sample.heap.used)} exceeds threshold ${this.formatBytes(this.memoryThreshold)}`,
				severity: "warning"
			});
		}

		// High heap utilization
		if (sample.heap.utilization > 90) {
			warnings.push({
				type: "HIGH_HEAP_UTILIZATION",
				message: `Heap utilization at ${sample.heap.utilization.toFixed(1)}%`,
				severity: "warning"
			});
		}

		// System memory pressure
		const systemUtilization = (sample.system.usedMemory / sample.system.totalMemory) * 100;
		if (systemUtilization > 85) {
			warnings.push({
				type: "SYSTEM_MEMORY_PRESSURE",
				message: `System memory usage at ${systemUtilization.toFixed(1)}%`,
				severity: "critical"
			});
		}

		// High load average
		if (sample.system.loadAverage > os.cpus().length * 1.5) {
			warnings.push({
				type: "HIGH_LOAD",
				message: `Load average ${sample.system.loadAverage.toFixed(2)} is high`,
				severity: "warning"
			});
		}

		// Memory leak detection
		if (this.detectMemoryLeak()) {
			warnings.push({
				type: "MEMORY_LEAK",
				message: "Potential memory leak detected - memory usage trending upward",
				severity: "critical"
			});
		}

		// Store warnings and optionally alert
		warnings.forEach(warning => {
			this.warnings.push({ ...warning, timestamp: sample.timestamp });

			if (config.isDebugMode()) {
				const color = warning.severity === "critical" ? "#ff5555" : "#ffb86c";
				console.log(chalk.hex(color)(`⚠️ ${warning.message}`));
			}
		});
	}

	detectMemoryLeak() {
		if (this.samples.length < 10) return false;

		// Get recent samples (last 10)
		const recentSamples = this.samples.slice(-10);
		const oldSamples = this.samples.slice(-20, -10);

		if (oldSamples.length < 10) return false;

		// Calculate average memory usage
		const recentAvg = recentSamples.reduce((sum, s) => sum + s.heap.used, 0) / recentSamples.length;
		const oldAvg = oldSamples.reduce((sum, s) => sum + s.heap.used, 0) / oldSamples.length;

		// Memory leak if recent usage is 20% higher than old usage
		const increase = (recentAvg - oldAvg) / oldAvg;
		return increase > 0.2;
	}

	checkGarbageCollection() {
		if (!this.isEnabled) return;

		const currentSample = this.samples[this.samples.length - 1];
		if (!currentSample) return;

		// Trigger GC if memory is high and heap utilization is high
		if (currentSample.heap.used > this.memoryThreshold && currentSample.heap.utilization > 80) {
			this.forceGarbageCollection();
		}
	}

	forceGarbageCollection() {
		if (global.gc) {
			const beforeGC = process.memoryUsage().heapUsed;
			global.gc();
			const afterGC = process.memoryUsage().heapUsed;
			const freed = beforeGC - afterGC;

			this.gcCount++;

			if (config.isDebugMode()) {
				console.log(chalk.hex("#8be9fd")(`🗑️ GC freed ${this.formatBytes(freed)} (${this.gcCount} total GCs)`));
			}
		} else {
			if (config.isDebugMode()) {
				console.log(chalk.hex("#ff5555")("⚠️ GC not available - run with --expose-gc"));
			}
		}
	}

	getMemoryStats() {
		if (this.samples.length === 0) return null;

		const currentSample = this.samples[this.samples.length - 1];
		const firstSample = this.samples[0];

		return {
			current: {
				heap: currentSample.heap,
				rss: currentSample.rss,
				external: currentSample.external
			},
			peak: {
				heap: this.peakMemory
			},
			trends: {
				memoryGrowth: currentSample.heap.used - firstSample.heap.used,
				averageUtilization: this.samples.reduce((sum, s) => sum + s.heap.utilization, 0) / this.samples.length
			},
			warnings: this.warnings.length,
			gcCount: this.gcCount,
			uptime: Date.now() - this.startTime
		};
	}

	generateReport() {
		if (!this.isEnabled || this.samples.length === 0) return null;

		const stats = this.getMemoryStats();
		const currentSample = this.samples[this.samples.length - 1];

		console.log("\n" + chalk.hex("#bd93f9")("┌─ 🧠 MEMORY & RESOURCE REPORT ───────────────────────────────────┐"));

		// Current memory usage
		console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#50fa7b")("📊 Current Memory Usage:"));
		console.log(
			chalk.hex("#f8f8f2")("│   ") +
				`Heap: ${chalk.hex("#ffb86c")(this.formatBytes(stats.current.heap.used))} / ${chalk.hex("#8be9fd")(this.formatBytes(stats.current.heap.total))} (${chalk.hex("#ff79c6")(stats.current.heap.utilization.toFixed(1))}%)`
		);
		console.log(chalk.hex("#f8f8f2")("│   ") + `RSS: ${chalk.hex("#ffb86c")(this.formatBytes(stats.current.rss))}, External: ${chalk.hex("#8be9fd")(this.formatBytes(stats.current.external))}`);

		// System resources
		console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#ff79c6")("💻 System Resources:"));
		const systemUtil = (currentSample.system.usedMemory / currentSample.system.totalMemory) * 100;
		console.log(
			chalk.hex("#f8f8f2")("│   ") +
				`System Memory: ${chalk.hex("#ffb86c")(systemUtil.toFixed(1))}% used (${chalk.hex("#8be9fd")(this.formatBytes(currentSample.system.usedMemory))} / ${this.formatBytes(currentSample.system.totalMemory)})`
		);
		console.log(chalk.hex("#f8f8f2")("│   ") + `Load Average: ${chalk.hex("#ff79c6")(currentSample.system.loadAverage.toFixed(2))}, CPU Cores: ${chalk.hex("#50fa7b")(os.cpus().length)}`);

		// Performance metrics
		console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#8be9fd")("⚡ Performance:"));
		console.log(chalk.hex("#f8f8f2")("│   ") + `Peak Memory: ${chalk.hex("#ffb86c")(this.formatBytes(stats.peak.heap))}, Growth: ${this.formatBytes(stats.trends.memoryGrowth)}`);
		console.log(chalk.hex("#f8f8f2")("│   ") + `Avg Utilization: ${chalk.hex("#ff79c6")(stats.trends.averageUtilization.toFixed(1))}%, GC Runs: ${chalk.hex("#50fa7b")(stats.gcCount)}`);

		// Warnings
		if (stats.warnings > 0) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#ff5555")("⚠️ Warnings:"));
			const recentWarnings = this.warnings.slice(-3);
			recentWarnings.forEach(warning => {
				const color = warning.severity === "critical" ? "#ff5555" : "#ffb86c";
				console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex(color)("•") + ` ${warning.message}`);
			});
		}

		// Health recommendations
		const recommendations = this.generateRecommendations();
		if (recommendations.length > 0) {
			console.log(chalk.hex("#f8f8f2")("│ ") + chalk.hex("#f1fa8c")("💡 Recommendations:"));
			recommendations.slice(0, 2).forEach(rec => {
				console.log(chalk.hex("#f8f8f2")("│   ") + chalk.hex("#ff79c6")("•") + ` ${rec}`);
			});
		}

		console.log(chalk.hex("#bd93f9")("└─────────────────────────────────────────────────────────────────┘"));

		return stats;
	}

	generateFinalReport() {
		if (!this.isEnabled) return;

		console.log("\n" + chalk.hex("#bd93f9")("🧠 Final Memory Report:"));
		const stats = this.getMemoryStats();

		if (stats) {
			console.log(`  Peak Memory: ${this.formatBytes(stats.peak.heap)}`);
			console.log(`  Memory Growth: ${this.formatBytes(stats.trends.memoryGrowth)}`);
			console.log(`  Total Warnings: ${stats.warnings}`);
			console.log(`  GC Collections: ${stats.gcCount}`);
			console.log(`  Session Duration: ${this.formatDuration(stats.uptime)}`);
		}
	}

	generateRecommendations() {
		const recommendations = [];
		const stats = this.getMemoryStats();

		if (!stats) return recommendations;

		if (stats.trends.averageUtilization > 80) {
			recommendations.push("Consider increasing heap size with --max-old-space-size");
		}

		if (stats.trends.memoryGrowth > 100 * 1024 * 1024) {
			// 100MB growth
			recommendations.push("Memory growth detected - check for potential leaks");
		}

		if (stats.gcCount > 20) {
			recommendations.push("Frequent GC detected - optimize object creation");
		}

		if (this.warnings.filter(w => w.type === "HIGH_MEMORY").length > 5) {
			recommendations.push("Reduce parallel processing or chunk size");
		}

		return recommendations;
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	}

	formatDuration(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	// Memory optimization helpers
	clearCache() {
		this.samples = this.samples.slice(-10); // Keep only recent samples
		this.warnings = this.warnings.slice(-10); // Keep only recent warnings
	}

	optimizeMemory() {
		this.clearCache();
		this.forceGarbageCollection();
	}
}

// Global memory monitor instance
let globalMonitor = null;

export function startMemoryMonitoring() {
	if (!globalMonitor) {
		globalMonitor = new MemoryMonitor();
		globalMonitor.start();
	}
	return globalMonitor;
}

export function stopMemoryMonitoring() {
	if (globalMonitor) {
		globalMonitor.stop();
		globalMonitor = null;
	}
}

export function getMemoryMonitor() {
	return globalMonitor;
}

export function generateMemoryReport() {
	if (globalMonitor) {
		return globalMonitor.generateReport();
	}
	return null;
}

export { MemoryMonitor };
