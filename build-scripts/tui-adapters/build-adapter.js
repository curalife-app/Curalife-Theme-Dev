#!/usr/bin/env node

/**
 * TUI Build Adapter for Curalife Theme
 *
 * This adapter wraps the existing optimized build script and provides
 * structured JSON output for the Bubble Tea TUI while preserving all
 * existing functionality and optimizations.
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
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";

class TUIBuildAdapter extends EventEmitter {
	constructor() {
		super();
		this.startTime = Date.now();
		this.isTUIMode = process.env.TUI_MODE === "true" || process.argv.includes("--tui-mode");
		this.steps = [
			{ name: "File Copy", phase: "copy", weight: 40 },
			{ name: "Tailwind CSS", phase: "styles", weight: 30 },
			{ name: "Vite Build", phase: "scripts", weight: 30 }
		];
		this.currentStep = 0;
		this.totalProgress = 0;
		this.lastProgressStep = 0;
		this.buildCompleted = false;
		this.cacheReported = false;
		this.optimizationsReported = false;
		this.filesReported = false;
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

	outputProgress(step, progress, status, message = "") {
		this.outputTUIData("progress", {
			step,
			progress,
			status,
			message,
			currentStep: this.currentStep,
			totalSteps: this.steps.length,
			elapsedMs: Date.now() - this.startTime
		});
	}

	outputStats(stats) {
		this.outputTUIData("stats", stats);
	}

	async runBuild(withReport = false) {
		try {
			this.outputTUIData("log", {
				level: "info",
				message: "Starting optimized build process",
				source: "build"
			});
			this.outputClean("Starting optimized build process...");
			this.outputProgress("init", 0, "running", "Initializing build system");

			// Determine the build command with proper cross-platform handling
			let command, args;
			if (process.platform === "win32") {
				command = "cmd";
				args = withReport ? ["/c", "npm", "run", "build:report"] : ["/c", "npm", "run", "build"];
			} else {
				command = "npm";
				args = withReport ? ["run", "build:report"] : ["run", "build"];
			}

			const buildProcess = spawn(command, args, {
				stdio: ["pipe", "pipe", "pipe"],
				shell: false // Always use shell=false to avoid argument concatenation
			});

			if (!buildProcess) {
				throw new Error("Failed to spawn build process");
			}

			let lastProgress = 0;
			let currentPhase = "";

			// Parse stdout for progress information
			buildProcess.stdout.on("data", data => {
				const output = data.toString();
				// Only parse for TUI data in TUI mode, show clean output otherwise
				if (this.isTUIMode) {
					this.parseOutputForProgress(output);
				} else {
					this.parseCleanBuildOutput(output);
				}
			});

			// Parse stderr for errors
			buildProcess.stderr.on("data", data => {
				const output = data.toString();
				if (this.isTUIMode) {
					this.outputTUIData("log", {
						level: "error",
						message: output.trim(),
						source: "build"
					});
				} else {
					// Only show actual errors, not deprecation warnings
					if (!output.includes("DeprecationWarning") && output.trim()) {
						this.outputClean(output.trim(), "error");
					}
				}
			});

			buildProcess.on("close", code => {
				if (code === 0) {
					this.outputProgress("complete", 100, "completed", "Build completed successfully!");
					this.outputStats(this.getCompletionStats());
					this.outputTUIData("log", {
						level: "success",
						message: `Build completed in ${Date.now() - this.startTime}ms`,
						source: "build"
					});
					this.outputClean(`Build completed successfully in ${Date.now() - this.startTime}ms!`, "success");
				} else {
					this.outputProgress("error", lastProgress, "failed", `Build failed with code ${code}`);
					this.outputTUIData("log", {
						level: "error",
						message: `Build process failed with exit code ${code}`,
						source: "build"
					});
					this.outputClean(`Build process failed with exit code ${code}`, "error");
				}
			});

			return new Promise((resolve, reject) => {
				buildProcess.on("close", code => {
					if (code === 0) resolve();
					else reject(new Error(`Build failed with code ${code}`));
				});
			});
		} catch (error) {
			this.outputProgress("error", 0, "failed", error.message);
			this.outputTUIData("log", {
				level: "error",
				message: `Build error: ${error.message}`,
				source: "build"
			});
			this.outputClean(`Build error: ${error.message}`, "error");
			throw error;
		}
	}

	parseOutputForProgress(output) {
		// Remove ANSI codes for parsing
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

		// Look for progress indicators
		const progressMatch = cleanOutput.match(/(\d+)%/);
		if (progressMatch) {
			const progress = parseInt(progressMatch[1]);
			this.updateProgress(progress);
		}

		// Look for step indicators
		if (cleanOutput.includes("Copying files") || cleanOutput.includes("File copy")) {
			this.setCurrentStep(0, "Copying files...");
			this.outputClean("Copying files...", "info");
		} else if (cleanOutput.includes("Building styles") || cleanOutput.includes("Tailwind")) {
			this.setCurrentStep(1, "Building Tailwind CSS...");
			this.outputClean("Building styles with Tailwind CSS...", "info");
		} else if (cleanOutput.includes("Building scripts") || cleanOutput.includes("Vite")) {
			this.setCurrentStep(2, "Building with Vite...");
			this.outputClean("Building scripts with Vite...", "info");
		}

		// Look for completion indicators
		if (cleanOutput.includes("Build completed") || cleanOutput.includes("✨")) {
			this.outputProgress("complete", 100, "completed", "Build completed successfully!");
		}

		// Look for cache hits and optimizations
		const cacheMatch = cleanOutput.match(/(\d+) cache hits/);
		if (cacheMatch) {
			this.outputStats({ cacheHits: parseInt(cacheMatch[1]) });
		}

		const optimizationMatch = cleanOutput.match(/(\d+) optimizations/);
		if (optimizationMatch) {
			this.outputStats({ optimizations: parseInt(optimizationMatch[1]) });
		}

		// Only forward raw log messages in TUI mode
		if (this.isTUIMode) {
			// Forward significant log messages
			const lines = cleanOutput.split("\n").filter(line => line.trim());
			for (const line of lines) {
				if (this.isSignificantLogLine(line)) {
					const level = this.getLogLevel(line);
					this.outputTUIData("log", {
						level,
						message: line.trim(),
						source: "build"
					});
				}
			}
		}
	}

	parseCleanBuildOutput(output) {
		// Remove ANSI codes for parsing
		const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, "");

		// Look for progress indicators
		const progressMatch = cleanOutput.match(/(\d+)%/);
		if (progressMatch) {
			const progress = parseInt(progressMatch[1]);
			this.updateProgressClean(progress);
		}

		// Look for step indicators (only show once per step)
		if ((cleanOutput.includes("Copying files") || cleanOutput.includes("File copy")) && this.currentStep !== 0) {
			this.setCurrentStepClean(0, "Copying files...");
		} else if ((cleanOutput.includes("Building styles") || cleanOutput.includes("Tailwind")) && this.currentStep !== 1) {
			this.setCurrentStepClean(1, "Building styles with Tailwind CSS...");
		} else if ((cleanOutput.includes("Building scripts") || cleanOutput.includes("Vite")) && this.currentStep !== 2) {
			this.setCurrentStepClean(2, "Building scripts with Vite...");
		}

		// Look for completion indicators (only show once)
		if ((cleanOutput.includes("Build completed") || cleanOutput.includes("✨")) && !this.buildCompleted) {
			this.buildCompleted = true;
			this.outputClean("Build completed successfully!", "success");
		}

		// Look for cache hits and optimizations (only show once)
		const cacheMatch = cleanOutput.match(/(\d+) cache hits/);
		if (cacheMatch && !this.cacheReported) {
			this.cacheReported = true;
			this.outputClean(`${cacheMatch[1]} cache hits`, "info");
		}

		const optimizationMatch = cleanOutput.match(/(\d+) optimizations/);
		if (optimizationMatch && !this.optimizationsReported) {
			this.optimizationsReported = true;
			this.outputClean(`${optimizationMatch[1]} optimizations applied`, "info");
		}

		// Look for file counts (only show once)
		const fileMatch = cleanOutput.match(/(\d+) files processed/);
		if (fileMatch && !this.filesReported) {
			this.filesReported = true;
			this.outputClean(`${fileMatch[1]} files processed`, "info");
		}
	}

	setCurrentStepClean(stepIndex, message) {
		this.currentStep = stepIndex;
		this.outputClean(message, "info");
	}

	updateProgressClean(progress) {
		// Show progress updates less frequently for cleaner output
		const step = Math.floor(progress / 10) * 10;
		if (step > this.lastProgressStep) {
			this.lastProgressStep = step;
			this.outputClean(`Build progress: ${progress}%`, "info");
		}
	}

	setCurrentStep(stepIndex, message) {
		if (stepIndex !== this.currentStep) {
			// Mark previous step as completed
			if (this.currentStep < this.steps.length) {
				const prevStep = this.steps[this.currentStep];
				this.outputProgress(prevStep.phase, 100, "completed", `${prevStep.name} completed`);
			}

			this.currentStep = stepIndex;
			if (stepIndex < this.steps.length) {
				const step = this.steps[stepIndex];
				this.outputProgress(step.phase, 0, "running", message);
			}
		}
	}

	isSignificantLogLine(line) {
		const ignoredPatterns = [/^\s*$/, /^TUI_DATA:/, /╭|╰|│|─/, /^[\s\-\+\*]*$/];

		return (
			!ignoredPatterns.some(pattern => pattern.test(line)) &&
			(line.includes("✓") ||
				line.includes("❌") ||
				line.includes("⚡") ||
				line.includes("error") ||
				line.includes("warning") ||
				line.includes("success") ||
				line.includes("completed") ||
				line.includes("failed"))
		);
	}

	getLogLevel(line) {
		if (line.includes("error") || line.includes("❌") || line.includes("failed")) {
			return "error";
		} else if (line.includes("warning") || line.includes("⚠️")) {
			return "warning";
		} else if (line.includes("success") || line.includes("✓") || line.includes("✨")) {
			return "success";
		}
		return "info";
	}

	getCompletionStats() {
		const duration = Date.now() - this.startTime;

		// Try to read cache and performance data
		let stats = {
			duration,
			filesCopied: 0,
			cacheHits: 0,
			optimizations: 0
		};

		try {
			const cachePath = path.join(process.cwd(), "build-scripts/cache/.build-cache.json");
			if (fs.existsSync(cachePath)) {
				const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf8"));
				stats.cacheHits = Object.keys(cacheData.files || {}).length;
			}

			const perfPath = path.join(process.cwd(), "build-scripts/cache/.build-performance.json");
			if (fs.existsSync(perfPath)) {
				const perfData = JSON.parse(fs.readFileSync(perfPath, "utf8"));
				stats.filesCopied = perfData.fileStats?.processed || 0;
				stats.optimizations = perfData.optimizations?.length || 0;
			}
		} catch (error) {
			// Ignore errors reading stats files
		}

		return stats;
	}

	updateProgress(progress) {
		if (this.currentStep < this.steps.length) {
			const step = this.steps[this.currentStep];

			// Calculate total progress based on step weights
			let totalProgress = 0;
			for (let i = 0; i < this.currentStep; i++) {
				totalProgress += this.steps[i].weight;
			}
			totalProgress += (progress / 100) * step.weight;

			this.totalProgress = Math.round(totalProgress);
			this.outputProgress(step.phase, progress, "running", `${step.name} (${progress}%)`);
		}
	}
}

// Main execution
async function main() {
	const adapter = new TUIBuildAdapter();
	const withReport = process.argv.includes("--report");

	if (!adapter.isTUIMode) {
		console.log("\n🔨 Curalife Build Adapter");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	}

	try {
		await adapter.runBuild(withReport);
		if (!adapter.isTUIMode) {
			console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		}
		process.exit(0);
	} catch (error) {
		adapter.outputTUIData("log", {
			level: "error",
			message: `Build failed: ${error.message}`,
			source: "build"
		});
		adapter.outputClean(`Build failed: ${error.message}`, "error");
		process.exit(1);
	}
}

// Handle cleanup
process.on("SIGINT", () => {
	console.log("\nBuild interrupted by user");
	process.exit(1);
});

process.on("SIGTERM", () => {
	console.log("\nBuild terminated");
	process.exit(1);
});

// Execute main if this file is run directly
main().catch(error => {
	console.error("Fatal error:", error);
	process.exit(1);
});
