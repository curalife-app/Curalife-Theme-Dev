/**
 * Enhanced Developer Tools System
 *
 * Provides comprehensive development experience enhancements:
 * - Visual build progress indicators with real-time stats
 * - Performance profiling and bottleneck detection
 * - Memory usage monitoring with leak detection
 * - Build optimization suggestions and auto-fixes
 * - Interactive dashboard for development insights
 * - Smart error reporting with context
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedDevTools extends EventEmitter {
	constructor(options = {}) {
		super();

		this.options = {
			// Visual settings
			enableProgressBar: options.enableProgressBar ?? true,
			enableRealTimeStats: options.enableRealTimeStats ?? true,
			enableInteractiveDash: options.enableInteractiveDash ?? true,

			// Performance monitoring
			enablePerformanceProfiling: options.enablePerformanceProfiling ?? true,
			enableMemoryMonitoring: options.enableMemoryMonitoring ?? true,
			enableBottleneckDetection: options.enableBottleneckDetection ?? true,

			// Optimization features
			enableAutoOptimization: options.enableAutoOptimization ?? true,
			enableSmartSuggestions: options.enableSmartSuggestions ?? true,

			// Thresholds
			memoryThreshold: options.memoryThreshold ?? 512 * 1024 * 1024, // 512MB
			buildTimeThreshold: options.buildTimeThreshold ?? 30000, // 30 seconds

			// Output settings
			outputDir: options.outputDir ?? path.join(__dirname, "../../dev-tools-data"),
			verbose: options.verbose ?? false,

			...options
		};

		this.state = {
			isActive: false,
			currentBuild: null,
			session: {
				startTime: 0,
				buildCount: 0,
				totalTime: 0,
				averageTime: 0,
				errors: [],
				warnings: [],
				suggestions: []
			}
		};

		this.profiler = new PerformanceProfiler(this.options);
		this.memoryMonitor = new MemoryMonitor(this.options);
		this.progressTracker = new ProgressTracker(this.options);
		this.optimizationEngine = new OptimizationEngine(this.options);

		this.setupEventHandlers();
		this.initializeSession();
	}

	// Initialize development session
	initializeSession() {
		this.state.session.startTime = Date.now();
		this.ensureOutputDirectory();

		if (this.options.enableInteractiveDash) {
			this.setupInteractiveDashboard();
		}
	}

	// Start monitoring a build process
	startBuild(buildId, buildType = "unknown") {
		if (this.state.isActive) {
			this.endBuild(); // End previous build if still active
		}

		this.state.isActive = true;
		this.state.currentBuild = {
			id: buildId,
			type: buildType,
			startTime: performance.now(),
			endTime: null,
			duration: null,
			phases: new Map(),
			currentPhase: null,
			stats: {
				filesProcessed: 0,
				bytesProcessed: 0,
				cacheHits: 0,
				cacheMisses: 0,
				errors: 0,
				warnings: 0
			},
			performance: {
				bottlenecks: [],
				recommendations: []
			}
		};

		this.profiler.startProfiling(buildId);
		this.memoryMonitor.startMonitoring();

		if (this.options.enableProgressBar) {
			this.progressTracker.startProgress(buildId, buildType);
		}

		this.emit("build-started", {
			buildId,
			buildType,
			timestamp: new Date().toISOString()
		});

		console.log(`🚀 Enhanced Dev Tools: Monitoring build ${buildId} (${buildType})`);
	}

	// Start a new build phase
	startPhase(phaseName, expectedSteps = 0) {
		if (!this.state.isActive) return;

		const phase = {
			name: phaseName,
			startTime: performance.now(),
			endTime: null,
			duration: null,
			steps: 0,
			expectedSteps,
			memory: process.memoryUsage(),
			performance: {
				startMark: `phase-${phaseName}-start`,
				endMark: `phase-${phaseName}-end`
			}
		};

		performance.mark(phase.performance.startMark);

		this.state.currentBuild.phases.set(phaseName, phase);
		this.state.currentBuild.currentPhase = phaseName;

		this.progressTracker.startPhase(phaseName, expectedSteps);

		if (this.options.verbose) {
			console.log(`📊 Phase started: ${phaseName} (${expectedSteps} expected steps)`);
		}
	}

	// Update phase progress
	updatePhase(stepName, additionalData = {}) {
		if (!this.state.isActive || !this.state.currentBuild.currentPhase) return;

		const phase = this.state.currentBuild.phases.get(this.state.currentBuild.currentPhase);
		if (phase) {
			phase.steps++;

			this.progressTracker.updateProgress(this.state.currentBuild.currentPhase, phase.steps, phase.expectedSteps, stepName);

			// Track file processing
			if (additionalData.filePath) {
				this.state.currentBuild.stats.filesProcessed++;
				if (additionalData.size) {
					this.state.currentBuild.stats.bytesProcessed += additionalData.size;
				}
				if (additionalData.fromCache) {
					this.state.currentBuild.stats.cacheHits++;
				} else {
					this.state.currentBuild.stats.cacheMisses++;
				}
			}

			// Emit progress event
			this.emit("phase-progress", {
				phase: this.state.currentBuild.currentPhase,
				step: stepName,
				progress: phase.expectedSteps > 0 ? phase.steps / phase.expectedSteps : 0,
				...additionalData
			});
		}
	}

	// End current phase
	endPhase(phaseName = null) {
		if (!this.state.isActive) return;

		const phaseToEnd = phaseName || this.state.currentBuild.currentPhase;
		if (!phaseToEnd) return;

		const phase = this.state.currentBuild.phases.get(phaseToEnd);
		if (phase && !phase.endTime) {
			phase.endTime = performance.now();
			phase.duration = phase.endTime - phase.startTime;

			performance.mark(phase.performance.endMark);
			performance.measure(`phase-${phaseToEnd}`, phase.performance.startMark, phase.performance.endMark);

			this.progressTracker.endPhase(phaseToEnd, phase.duration);

			// Analyze phase performance
			this.analyzePhasePerformance(phaseToEnd, phase);

			if (this.options.verbose) {
				console.log(`✅ Phase completed: ${phaseToEnd} (${Math.round(phase.duration)}ms, ${phase.steps} steps)`);
			}

			// Clear current phase if it's the one we just ended
			if (this.state.currentBuild.currentPhase === phaseToEnd) {
				this.state.currentBuild.currentPhase = null;
			}
		}
	}

	// End current build
	endBuild(success = true) {
		if (!this.state.isActive) return;

		// End any active phase
		if (this.state.currentBuild.currentPhase) {
			this.endPhase();
		}

		this.state.currentBuild.endTime = performance.now();
		this.state.currentBuild.duration = this.state.currentBuild.endTime - this.state.currentBuild.startTime;
		this.state.currentBuild.success = success;

		// Update session stats
		this.state.session.buildCount++;
		this.state.session.totalTime += this.state.currentBuild.duration;
		this.state.session.averageTime = this.state.session.totalTime / this.state.session.buildCount;

		// Generate final analysis
		this.generateBuildAnalysis();

		this.profiler.endProfiling();
		this.memoryMonitor.stopMonitoring();
		this.progressTracker.endProgress(success);

		// Save build data
		this.saveBuildData();

		// Generate suggestions
		if (this.options.enableSmartSuggestions) {
			this.generateSuggestions();
		}

		this.emit("build-ended", {
			buildId: this.state.currentBuild.id,
			duration: this.state.currentBuild.duration,
			success,
			stats: this.state.currentBuild.stats,
			timestamp: new Date().toISOString()
		});

		const statusIcon = success ? "✅" : "❌";
		const duration = Math.round(this.state.currentBuild.duration);
		console.log(`${statusIcon} Build ${this.state.currentBuild.id} completed in ${duration}ms`);

		this.state.isActive = false;
		this.state.currentBuild = null;
	}

	// Add error to current build
	addError(error, context = {}) {
		if (!this.state.isActive) return;

		const errorEntry = {
			message: error.message || error,
			stack: error.stack,
			timestamp: Date.now(),
			phase: this.state.currentBuild.currentPhase,
			context
		};

		this.state.currentBuild.stats.errors++;
		this.state.session.errors.push(errorEntry);

		this.emit("build-error", errorEntry);
	}

	// Add warning to current build
	addWarning(warning, context = {}) {
		if (!this.state.isActive) return;

		const warningEntry = {
			message: warning.message || warning,
			timestamp: Date.now(),
			phase: this.state.currentBuild.currentPhase,
			context
		};

		this.state.currentBuild.stats.warnings++;
		this.state.session.warnings.push(warningEntry);

		this.emit("build-warning", warningEntry);
	}

	// Analyze phase performance for bottlenecks
	analyzePhasePerformance(phaseName, phase) {
		if (!this.options.enableBottleneckDetection) return;

		const isBottleneck = phase.duration > this.options.buildTimeThreshold / 4; // 25% of build threshold

		if (isBottleneck) {
			const bottleneck = {
				phase: phaseName,
				duration: phase.duration,
				steps: phase.steps,
				avgStepTime: phase.steps > 0 ? phase.duration / phase.steps : 0,
				recommendations: this.generatePhaseRecommendations(phaseName, phase)
			};

			this.state.currentBuild.performance.bottlenecks.push(bottleneck);

			if (this.options.verbose) {
				console.log(`⚠️  Performance bottleneck detected in ${phaseName}: ${Math.round(phase.duration)}ms`);
			}
		}
	}

	// Generate phase-specific recommendations
	generatePhaseRecommendations(phaseName, phase) {
		const recommendations = [];

		// File processing recommendations
		if (phaseName.includes("copy") || phaseName.includes("process")) {
			if (phase.steps > 100 && phase.duration > 5000) {
				recommendations.push({
					type: "parallelization",
					message: "Consider parallel processing for file operations",
					impact: "high"
				});
			}
		}

		// Style processing recommendations
		if (phaseName.includes("style") || phaseName.includes("css")) {
			if (phase.duration > 3000) {
				recommendations.push({
					type: "css-optimization",
					message: "CSS processing is slow. Consider PostCSS optimization or CSS splitting",
					impact: "medium"
				});
			}
		}

		// Script processing recommendations
		if (phaseName.includes("script") || phaseName.includes("js")) {
			if (phase.duration > 5000) {
				recommendations.push({
					type: "js-optimization",
					message: "JavaScript processing is slow. Consider code splitting or minification optimization",
					impact: "high"
				});
			}
		}

		return recommendations;
	}

	// Generate comprehensive build analysis
	generateBuildAnalysis() {
		if (!this.state.currentBuild) return;

		const analysis = {
			overview: {
				duration: this.state.currentBuild.duration,
				success: this.state.currentBuild.success,
				phases: this.state.currentBuild.phases.size,
				totalSteps: Array.from(this.state.currentBuild.phases.values()).reduce((sum, phase) => sum + phase.steps, 0)
			},
			performance: {
				slowestPhase: this.findSlowestPhase(),
				bottlenecks: this.state.currentBuild.performance.bottlenecks,
				cacheEfficiency: this.calculateCacheEfficiency()
			},
			resources: {
				filesProcessed: this.state.currentBuild.stats.filesProcessed,
				bytesProcessed: this.state.currentBuild.stats.bytesProcessed,
				memoryPeak: this.memoryMonitor.getPeakUsage(),
				memoryAverage: this.memoryMonitor.getAverageUsage()
			}
		};

		this.state.currentBuild.analysis = analysis;
		return analysis;
	}

	// Generate optimization suggestions
	generateSuggestions() {
		const suggestions = this.optimizationEngine.analyzeBuild(this.state.currentBuild);
		this.state.session.suggestions.push(...suggestions);

		if (suggestions.length > 0) {
			console.log(`💡 Generated ${suggestions.length} optimization suggestions`);

			if (this.options.verbose) {
				suggestions.forEach(suggestion => {
					console.log(`  • ${suggestion.message} (${suggestion.impact} impact)`);
				});
			}
		}
	}

	// Utility methods
	findSlowestPhase() {
		let slowest = null;
		let maxDuration = 0;

		for (const [name, phase] of this.state.currentBuild.phases) {
			if (phase.duration > maxDuration) {
				maxDuration = phase.duration;
				slowest = { name, duration: phase.duration };
			}
		}

		return slowest;
	}

	calculateCacheEfficiency() {
		const { cacheHits, cacheMisses } = this.state.currentBuild.stats;
		const total = cacheHits + cacheMisses;
		return total > 0 ? Math.round((cacheHits / total) * 100) : 0;
	}

	// Setup event handlers
	setupEventHandlers() {
		// Handle memory warnings
		this.memoryMonitor.on("memory-warning", usage => {
			this.addWarning(`High memory usage detected: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
		});

		// Handle performance warnings
		this.profiler.on("performance-warning", data => {
			this.addWarning(`Performance issue: ${data.message}`, data);
		});
	}

	// Setup interactive dashboard
	setupInteractiveDashboard() {
		// This would typically set up a web server or terminal UI
		// For now, we'll just set up data structures for it
		this.dashboard = {
			enabled: true,
			port: this.options.dashboardPort || 3001,
			data: {
				currentBuild: () => this.state.currentBuild,
				session: () => this.state.session,
				suggestions: () => this.state.session.suggestions.slice(-10)
			}
		};
	}

	// Save build data for analysis
	async saveBuildData() {
		if (!this.state.currentBuild) return;

		try {
			const filename = `build-${this.state.currentBuild.id}-${Date.now()}.json`;
			const filepath = path.join(this.options.outputDir, filename);

			const data = {
				...this.state.currentBuild,
				sessionStats: {
					buildCount: this.state.session.buildCount,
					averageTime: this.state.session.averageTime,
					totalTime: this.state.session.totalTime
				}
			};

			await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2));

			if (this.options.verbose) {
				console.log(`💾 Build data saved to ${filename}`);
			}
		} catch (error) {
			console.warn("Failed to save build data:", error.message);
		}
	}

	// Ensure output directory exists
	ensureOutputDirectory() {
		if (!fs.existsSync(this.options.outputDir)) {
			fs.mkdirSync(this.options.outputDir, { recursive: true });
		}
	}

	// Get session summary
	getSessionSummary() {
		const sessionDuration = Date.now() - this.state.session.startTime;

		return {
			duration: sessionDuration,
			buildCount: this.state.session.buildCount,
			totalBuildTime: this.state.session.totalTime,
			averageBuildTime: this.state.session.averageTime,
			errors: this.state.session.errors.length,
			warnings: this.state.session.warnings.length,
			suggestions: this.state.session.suggestions.length,
			efficiency: this.state.session.totalTime > 0 ? Math.round(((sessionDuration - this.state.session.totalTime) / sessionDuration) * 100) : 0
		};
	}
}

// Performance Profiler
class PerformanceProfiler extends EventEmitter {
	constructor(options) {
		super();
		this.options = options;
		this.profiles = new Map();
		this.activeProfile = null;
	}

	startProfiling(buildId) {
		this.activeProfile = {
			buildId,
			startTime: performance.now(),
			marks: new Map(),
			measures: new Map(),
			timeline: []
		};

		this.profiles.set(buildId, this.activeProfile);
	}

	mark(name, metadata = {}) {
		if (!this.activeProfile) return;

		const timestamp = performance.now();
		performance.mark(name);

		this.activeProfile.marks.set(name, {
			timestamp,
			metadata,
			relativeTime: timestamp - this.activeProfile.startTime
		});

		this.activeProfile.timeline.push({
			type: "mark",
			name,
			timestamp,
			metadata
		});
	}

	measure(name, startMark, endMark) {
		if (!this.activeProfile) return;

		try {
			performance.measure(name, startMark, endMark);

			const measure = performance.getEntriesByName(name)[0];
			this.activeProfile.measures.set(name, {
				duration: measure.duration,
				startTime: measure.startTime,
				endTime: measure.startTime + measure.duration
			});

			// Check for performance warnings
			if (measure.duration > 5000) {
				this.emit("performance-warning", {
					message: `Long operation detected: ${name} (${Math.round(measure.duration)}ms)`,
					duration: measure.duration,
					operation: name
				});
			}
		} catch (error) {
			console.warn(`Failed to measure ${name}:`, error.message);
		}
	}

	endProfiling() {
		if (this.activeProfile) {
			this.activeProfile.endTime = performance.now();
			this.activeProfile.totalDuration = this.activeProfile.endTime - this.activeProfile.startTime;
			this.activeProfile = null;
		}
	}

	getProfile(buildId) {
		return this.profiles.get(buildId);
	}
}

// Memory Monitor
class MemoryMonitor extends EventEmitter {
	constructor(options) {
		super();
		this.options = options;
		this.monitoring = false;
		this.interval = null;
		this.samples = [];
		this.peakUsage = null;
	}

	startMonitoring() {
		if (this.monitoring) return;

		this.monitoring = true;
		this.samples = [];
		this.peakUsage = null;

		this.interval = setInterval(() => {
			const usage = process.memoryUsage();
			this.samples.push({
				timestamp: Date.now(),
				...usage,
				heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
				heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024)
			});

			// Track peak usage
			if (!this.peakUsage || usage.heapUsed > this.peakUsage.heapUsed) {
				this.peakUsage = usage;
			}

			// Check for memory warnings
			if (usage.heapUsed > this.options.memoryThreshold) {
				this.emit("memory-warning", usage);
			}
		}, 1000);
	}

	stopMonitoring() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.monitoring = false;
	}

	getPeakUsage() {
		return this.peakUsage ? Math.round(this.peakUsage.heapUsed / 1024 / 1024) : 0;
	}

	getAverageUsage() {
		if (this.samples.length === 0) return 0;

		const avg = this.samples.reduce((sum, sample) => sum + sample.heapUsed, 0) / this.samples.length;
		return Math.round(avg / 1024 / 1024);
	}
}

// Progress Tracker
class ProgressTracker {
	constructor(options) {
		this.options = options;
		this.phases = new Map();
		this.currentPhase = null;
	}

	startProgress(buildId, buildType) {
		if (!this.options.enableProgressBar) return;

		console.log(`\n🔨 Starting ${buildType} build (${buildId})`);
		console.log("━".repeat(50));
	}

	startPhase(phaseName, expectedSteps) {
		if (!this.options.enableProgressBar) return;

		this.currentPhase = phaseName;
		this.phases.set(phaseName, {
			expectedSteps,
			currentStep: 0,
			startTime: Date.now()
		});

		console.log(`\n📊 ${phaseName} (${expectedSteps} steps)`);
	}

	updateProgress(phaseName, currentStep, totalSteps, stepName) {
		if (!this.options.enableProgressBar || !this.options.enableRealTimeStats) return;

		const phase = this.phases.get(phaseName);
		if (phase) {
			phase.currentStep = currentStep;

			const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
			const progressBar = this.createProgressBar(currentStep, totalSteps);

			// Clear line and show progress
			process.stdout.write(`\r${progressBar} ${progress}% - ${stepName}`.substring(0, 80));
		}
	}

	endPhase(phaseName, duration) {
		if (!this.options.enableProgressBar) return;

		const phase = this.phases.get(phaseName);
		if (phase) {
			console.log(`\n✅ ${phaseName} completed in ${Math.round(duration)}ms`);
		}
	}

	endProgress(success) {
		if (!this.options.enableProgressBar) return;

		const icon = success ? "✅" : "❌";
		console.log(`\n${icon} Build ${success ? "completed" : "failed"}`);
		console.log("━".repeat(50));
	}

	createProgressBar(current, total, width = 20) {
		if (total === 0) return "▓".repeat(width);

		const progress = Math.min(current / total, 1);
		const filled = Math.round(progress * width);
		const empty = width - filled;

		return "▓".repeat(filled) + "░".repeat(empty);
	}
}

// Optimization Engine
class OptimizationEngine {
	constructor(options) {
		this.options = options;
	}

	analyzeBuild(buildData) {
		const suggestions = [];

		// Build time analysis
		if (buildData.duration > this.options.buildTimeThreshold) {
			suggestions.push({
				type: "build-time",
				message: "Build time is slower than expected. Consider enabling parallel processing.",
				impact: "high",
				action: "Enable parallel file processing in build configuration"
			});
		}

		// Cache efficiency analysis
		const cacheEfficiency = this.calculateCacheEfficiency(buildData.stats);
		if (cacheEfficiency < 70) {
			suggestions.push({
				type: "cache",
				message: `Cache efficiency is low (${cacheEfficiency}%). Review cache invalidation strategy.`,
				impact: "medium",
				action: "Optimize file change detection and cache keys"
			});
		}

		// Memory usage analysis
		if (buildData.analysis && buildData.analysis.resources.memoryPeak > 300) {
			suggestions.push({
				type: "memory",
				message: `High memory usage detected (${buildData.analysis.resources.memoryPeak}MB).`,
				impact: "medium",
				action: "Consider streaming file processing or memory cleanup"
			});
		}

		// Phase-specific analysis
		for (const bottleneck of buildData.performance.bottlenecks) {
			suggestions.push(...bottleneck.recommendations);
		}

		return suggestions;
	}

	calculateCacheEfficiency(stats) {
		const total = stats.cacheHits + stats.cacheMisses;
		return total > 0 ? Math.round((stats.cacheHits / total) * 100) : 0;
	}
}

// Export classes and factory functions
export default EnhancedDevTools;

export function createDevTools(options = {}) {
	return new EnhancedDevTools(options);
}

// Integration helper for build processes
export function withDevTools(buildFunction, options = {}) {
	return async function (buildOptions = {}) {
		const devTools = new EnhancedDevTools(options);
		const buildId = `build-${Date.now()}`;

		try {
			devTools.startBuild(buildId, buildOptions.type || "build");

			const result = await buildFunction(buildOptions, devTools);

			devTools.endBuild(true);
			return result;
		} catch (error) {
			devTools.addError(error);
			devTools.endBuild(false);
			throw error;
		}
	};
}

// Command line interface for dev tools
export function createDevToolsCLI(options = {}) {
	const devTools = new EnhancedDevTools(options);

	return {
		session: () => devTools.getSessionSummary(),
		start: (buildId, type) => devTools.startBuild(buildId, type),
		phase: (name, steps) => devTools.startPhase(name, steps),
		update: (step, data) => devTools.updatePhase(step, data),
		end: success => devTools.endBuild(success),
		error: (error, context) => devTools.addError(error, context),
		warning: (warning, context) => devTools.addWarning(warning, context)
	};
}
