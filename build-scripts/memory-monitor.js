#!/usr/bin/env node

/**
 * 🧠 Optimized Memory Monitor - ENHANCED
 *
 * Lightweight, efficient memory monitoring with minimal performance impact
 * Features smart sampling, automatic optimization, and performance-aware scaling
 */

import os from "os";
import chalk from "chalk";
import config from "./config/unified-config.js";

class OptimizedMemoryMonitor {
	constructor(options = {}) {
		this.isEnabled = config.get("monitoring.enableMemoryMonitoring", true);
		this.memoryThreshold = config.get("performance.memoryThreshold", 512 * 1024 * 1024);
		this.gcInterval = config.get("performance.gcInterval", 30000);

		// Optimized sampling
		this.samples = new CircularBuffer(20); // Only keep last 20 samples
		this.warnings = new CircularBuffer(10); // Only keep last 10 warnings

		this.isMonitoring = false;
		this.intervalId = null;
		this.startTime = Date.now();
		this.peakMemory = 0;
		this.gcCount = 0;
		this.lastGC = 0;

		// Performance optimization
		this.sampleInterval = this.calculateOptimalInterval();
		this.warningThrottle = new Map(); // Throttle repeated warnings
	}

	calculateOptimalInterval() {
		const memoryGB = os.totalmem() / (1024 * 1024 * 1024);
		const cpuCount = os.cpus().length;

		// Adjust monitoring frequency based on system capabilities
		if (memoryGB < 4 || cpuCount < 4) return 10000; // 10s for low-end systems
		if (config.isProduction()) return 5000; // 5s for production
		return 3000; // 3s for development
	}

	start() {
		if (!this.isEnabled || this.isMonitoring) return;

		this.isMonitoring = true;

		// Only show startup message in debug mode
		if (config.isDebugMode()) {
			console.log(chalk.hex("#8be9fd")("🧠 Memory monitor active"));
		}

		// Lightweight periodic monitoring
		this.intervalId = setInterval(() => {
			this.collectOptimizedSample();
		}, this.sampleInterval);

		// Smart GC trigger
		setInterval(() => {
			this.smartGarbageCollection();
		}, this.gcInterval);

		// Cleanup on exit
		process.once("exit", () => this.stop());
	}

	stop() {
		if (!this.isMonitoring) return;

		this.isMonitoring = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		// Only generate report in debug mode or if there were issues
		if (config.isDebugMode() || this.warnings.length > 0) {
			this.generateFinalReport();
		}
	}

	collectOptimizedSample() {
		// Use more efficient memory usage collection
		const usage = process.memoryUsage();
		const now = Date.now();

		const sample = {
			timestamp: now,
			heapUsed: usage.heapUsed,
			heapTotal: usage.heapTotal,
			rss: usage.rss,
			uptime: now - this.startTime
		};

		this.samples.push(sample);

		// Track peak memory efficiently
		if (sample.heapUsed > this.peakMemory) {
			this.peakMemory = sample.heapUsed;
		}

		// Quick analysis for critical issues only
		this.quickAnalysis(sample);
	}

	quickAnalysis(sample) {
		const heapUtilization = (sample.heapUsed / sample.heapTotal) * 100;
		const now = Date.now();

		// Only warn about critical issues and throttle warnings
		if (sample.heapUsed > this.memoryThreshold) {
			if (!this.warningThrottle.has("HIGH_MEMORY") || now - this.warningThrottle.get("HIGH_MEMORY") > 30000) {
				this.addWarning("HIGH_MEMORY", `Memory usage ${this.formatBytes(sample.heapUsed)} exceeds threshold`);
				this.warningThrottle.set("HIGH_MEMORY", now);
			}
		}

		// Detect rapid memory growth (potential leak)
		if (this.samples.length >= 5) {
			const recentSamples = this.samples.getLast(5);
			const growth = recentSamples[4].heapUsed - recentSamples[0].heapUsed;
			const growthRate = growth / (recentSamples[4].timestamp - recentSamples[0].timestamp);

			// Warn if memory is growing rapidly (>10MB/minute)
			if (growthRate > (10 * 1024 * 1024) / 60000) {
				if (!this.warningThrottle.has("MEMORY_LEAK") || now - this.warningThrottle.get("MEMORY_LEAK") > 60000) {
					this.addWarning("MEMORY_LEAK", "Rapid memory growth detected");
					this.warningThrottle.set("MEMORY_LEAK", now);
				}
			}
		}
	}

	addWarning(type, message) {
		this.warnings.push({
			type,
			message,
			timestamp: Date.now()
		});

		// Only log critical warnings in debug mode
		if (config.isDebugMode() && type === "MEMORY_LEAK") {
			console.log(chalk.hex("#ff5555")(`⚠️ ${message}`));
		}
	}

	smartGarbageCollection() {
		if (!this.isEnabled || !global.gc) return;

		const lastSample = this.samples.getLast(1)[0];
		if (!lastSample) return;

		const heapUtilization = (lastSample.heapUsed / lastSample.heapTotal) * 100;
		const timeSinceLastGC = Date.now() - this.lastGC;

		// Smart GC triggering
		const shouldTriggerGC =
			lastSample.heapUsed > this.memoryThreshold && heapUtilization > 85 && timeSinceLastGC > 10000; // At least 10s since last GC

		if (shouldTriggerGC) {
			this.performGC();
		}
	}

	performGC() {
		if (!global.gc) return;

		const beforeGC = process.memoryUsage().heapUsed;
		const startTime = performance.now();

		global.gc();

		const afterGC = process.memoryUsage().heapUsed;
		const gcDuration = performance.now() - startTime;
		const freed = beforeGC - afterGC;

		this.gcCount++;
		this.lastGC = Date.now();

		// Only log significant GC events
		if (config.isDebugMode() && freed > 50 * 1024 * 1024) {
			// >50MB freed
			console.log(chalk.hex("#8be9fd")(`🗑️ GC freed ${this.formatBytes(freed)} in ${gcDuration.toFixed(1)}ms`));
		}
	}

	getOptimizedStats() {
		if (this.samples.length === 0) return null;

		const currentSample = this.samples.getLast(1)[0];
		const firstSample = this.samples.buffer[0];

		return {
			current: {
				heapUsed: currentSample.heapUsed,
				heapTotal: currentSample.heapTotal,
				rss: currentSample.rss
			},
			peak: this.peakMemory,
			growth: currentSample.heapUsed - firstSample.heapUsed,
			warnings: this.warnings.length,
			gcCount: this.gcCount,
			uptime: Date.now() - this.startTime,
			efficiency: this.calculateEfficiency()
		};
	}

	calculateEfficiency() {
		if (this.samples.length < 2) return 100;

		const samples = this.samples.getAll();
		const avgUtilization = (samples.reduce((sum, s) => sum + s.heapUsed / s.heapTotal, 0) / samples.length) * 100;

		// Efficiency score based on utilization and stability
		const stabilityScore = this.calculateStabilityScore(samples);
		return Math.round((100 - avgUtilization) * 0.7 + stabilityScore * 0.3);
	}

	calculateStabilityScore(samples) {
		if (samples.length < 3) return 100;

		// Calculate variance in memory usage
		const values = samples.map(s => s.heapUsed);
		const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
		const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
		const stdDev = Math.sqrt(variance);

		// Lower variance = higher stability score
		const normalizedStdDev = stdDev / mean;
		return Math.max(0, Math.min(100, (1 - normalizedStdDev) * 100));
	}

	generateQuickReport() {
		if (!this.isEnabled) return null;

		const stats = this.getOptimizedStats();
		if (!stats) return null;

		// Compact report for performance
		const report = {
			memory: this.formatBytes(stats.current.heapUsed),
			peak: this.formatBytes(stats.peak),
			efficiency: `${stats.efficiency}%`,
			warnings: stats.warnings,
			uptime: this.formatDuration(stats.uptime)
		};

		// Only show full report in debug mode
		if (config.isDebugMode()) {
			console.log(chalk.hex("#bd93f9")("🧠 Memory:"), `${report.memory} (peak: ${report.peak}, efficiency: ${report.efficiency})`);
		}

		return report;
	}

	generateFinalReport() {
		const stats = this.getOptimizedStats();
		if (!stats) return;

		console.log(chalk.hex("#bd93f9")("🧠 Memory Summary:"));
		console.log(`  Peak: ${this.formatBytes(stats.peak)}`);
		console.log(`  Growth: ${this.formatBytes(stats.growth)}`);
		console.log(`  Efficiency: ${stats.efficiency}%`);
		console.log(`  GC Count: ${stats.gcCount}`);

		if (stats.warnings > 0) {
			console.log(chalk.hex("#ff5555")(`  Warnings: ${stats.warnings}`));
		}
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

		if (hours > 0) return `${hours}h${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m${seconds % 60}s`;
		return `${seconds}s`;
	}

	// Public API
	getMemoryStats() {
		return this.getOptimizedStats();
	}
	clearCache() {
		this.samples.clear();
		this.warnings.clear();
	}
	forceGC() {
		this.performGC();
	}
}

// 🔄 Circular Buffer for efficient memory management
class CircularBuffer {
	constructor(size) {
		this.size = size;
		this.buffer = new Array(size);
		this.index = 0;
		this.length = 0;
	}

	push(item) {
		this.buffer[this.index] = item;
		this.index = (this.index + 1) % this.size;
		if (this.length < this.size) this.length++;
	}

	getLast(count) {
		if (count <= 0 || this.length === 0) return [];

		const result = [];
		const actualCount = Math.min(count, this.length);

		for (let i = 0; i < actualCount; i++) {
			const idx = (this.index - 1 - i + this.size) % this.size;
			if (this.buffer[idx] !== undefined) {
				result.unshift(this.buffer[idx]);
			}
		}

		return result;
	}

	getAll() {
		if (this.length === 0) return [];

		const result = [];
		for (let i = 0; i < this.length; i++) {
			const idx = (this.index - this.length + i + this.size) % this.size;
			if (this.buffer[idx] !== undefined) {
				result.push(this.buffer[idx]);
			}
		}
		return result;
	}

	clear() {
		this.buffer.fill(undefined);
		this.index = 0;
		this.length = 0;
	}
}

// 🌍 Global monitor instance with lazy initialization
let globalMonitor = null;

export function startMemoryMonitoring(options = {}) {
	if (!globalMonitor) {
		globalMonitor = new OptimizedMemoryMonitor(options);
	}
	globalMonitor.start();
	return globalMonitor;
}

export function stopMemoryMonitoring() {
	if (globalMonitor) {
		globalMonitor.stop();
		globalMonitor = null;
	}
}

export function getMemoryStats() {
	return globalMonitor ? globalMonitor.getMemoryStats() : null;
}

export function generateMemoryReport() {
	return globalMonitor ? globalMonitor.generateQuickReport() : null;
}

export { OptimizedMemoryMonitor };
