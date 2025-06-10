#!/usr/bin/env node

/**
 * 🎨 Visual Engine - Beautiful Build Feedback
 *
 * Features:
 * - Animated progress indicators
 * - Real-time performance metrics
 * - Beautiful error displays
 * - Smart notifications
 * - Gradient themes
 */

import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import figures from "figures";

export class VisualEngine {
	constructor(options = {}) {
		this.theme = options.theme || "modern";
		this.animations = options.animations !== false;
		this.compact = options.compact || false;
		this.colors = this.getTheme(this.theme);
	}

	// 🎭 Theme definitions
	getTheme(name) {
		const themes = {
			modern: {
				primary: "#6366f1",
				secondary: "#8b5cf6",
				success: "#10b981",
				warning: "#f59e0b",
				error: "#ef4444",
				info: "#06b6d4",
				accent: "#ec4899"
			},
			cyberpunk: {
				primary: "#ff0080",
				secondary: "#00ff80",
				success: "#00ff80",
				warning: "#ffff00",
				error: "#ff0080",
				info: "#0080ff",
				accent: "#ff8000"
			},
			minimal: {
				primary: "#374151",
				secondary: "#6b7280",
				success: "#059669",
				warning: "#d97706",
				error: "#dc2626",
				info: "#0284c7",
				accent: "#7c3aed"
			},
			dracula: {
				primary: "#bd93f9",
				secondary: "#ff79c6",
				success: "#50fa7b",
				warning: "#ffb86c",
				error: "#ff5555",
				info: "#8be9fd",
				accent: "#f1fa8c"
			}
		};
		return themes[name] || themes.modern;
	}

	// ✨ Animated welcome banner
	showWelcomeBanner(operation, options = {}) {
		const title = gradient(this.colors.primary, this.colors.secondary);
		const subtitle = chalk.hex(this.colors.info);

		const operationIcons = {
			build: "🏗️",
			watch: "👁️",
			"shopify-watch": "🛍️",
			shopify: "🛍️",
			development: "🚀",
			optimize: "⚡",
			analyze: "📊"
		};

		const icon = operationIcons[operation] || "🔧";

		const banner = boxen(
			`${title(`${icon} CURALIFE BUILD ENGINE`)}\n` +
				`${subtitle("⚡ Next-generation theme development")}\n\n` +
				`${chalk.dim("Operation:")} ${chalk.hex(this.colors.accent)(operation.toUpperCase())}\n` +
				`${chalk.dim("Mode:")} ${chalk.hex(this.colors.primary)(options.mode || process.env.NODE_ENV || "development")}\n` +
				`${chalk.dim("Theme:")} ${chalk.hex(this.colors.secondary)(this.theme)}\n` +
				`${chalk.dim("Time:")} ${chalk.hex(this.colors.info)(new Date().toLocaleTimeString())}`,
			{
				padding: 1,
				margin: 1,
				borderStyle: "double",
				borderColor: this.colors.primary,
				backgroundColor: this.theme === "minimal" ? undefined : "#1a1a1a"
			}
		);

		console.clear();
		console.log(banner);

		if (this.animations) {
			this.showLoadingAnimation();
		}
	}

	// 🔄 Loading animation
	showLoadingAnimation() {
		const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		let i = 0;

		const animation = setInterval(() => {
			process.stdout.write(`\r${chalk.hex(this.colors.accent)(frames[i])} ${chalk.dim("Initializing build system...")}`);
			i = (i + 1) % frames.length;
		}, 100);

		setTimeout(() => {
			clearInterval(animation);
			process.stdout.write("\r\x1b[K"); // Clear line
		}, 2000);
	}

	// 📊 Real-time metrics display
	showMetrics(metrics) {
		const data = [
			["Files Processed", metrics.filesProcessed || 0, this.colors.primary],
			["Cache Hit Rate", `${metrics.cacheHitRate || 0}%`, this.colors.success],
			["Time Saved", `${metrics.timeSaved || 0}ms`, this.colors.warning],
			["Memory Usage", `${metrics.memoryUsage || 0}MB`, this.colors.info]
		];

		const maxLabelLength = Math.max(...data.map(([label]) => label.length));

		const table = data
			.map(([label, value, color]) => {
				const paddedLabel = label.padEnd(maxLabelLength);
				const formattedValue = typeof value === "string" ? value : value.toString();

				return `${chalk.dim(paddedLabel)} ${chalk.hex(color).bold(formattedValue)}`;
			})
			.join("\n");

		const metricsBox = boxen(`${chalk.hex(this.colors.accent).bold("📊 Live Metrics")}\n\n${table}`, {
			padding: { top: 0, bottom: 0, left: 1, right: 1 },
			borderStyle: "round",
			borderColor: this.colors.accent,
			backgroundColor: this.theme === "minimal" ? undefined : "#0a0a0a"
		});

		console.log(`\n${metricsBox}\n`);
	}

	// 🔄 Enhanced progress indicator
	createProgressBar(total, current = 0) {
		return new AdvancedProgressBar({
			total,
			current,
			width: 40,
			colors: this.colors,
			showETA: true,
			showSpeed: true,
			animations: this.animations,
			theme: this.theme
		});
	}

	// 📈 Progress update helper
	showProgress(percent, message = "") {
		const width = 30;
		const filled = Math.round((width * percent) / 100);

		let bar = "";
		for (let i = 0; i < width; i++) {
			if (i < filled) {
				const intensity = i / width;
				if (intensity < 0.3) {
					bar += chalk.hex(this.colors.primary)("█");
				} else if (intensity < 0.6) {
					bar += chalk.hex(this.colors.secondary)("█");
				} else if (intensity < 0.8) {
					bar += chalk.hex(this.colors.accent)("█");
				} else {
					bar += chalk.hex(this.colors.success)("█");
				}
			} else {
				bar += chalk.hex("#2c2c2c")("░");
			}
		}

		const percentStr = `${percent.toString().padStart(3)}%`;
		const status = message ? ` ${message}` : "";

		process.stdout.write(`\r${bar} ${chalk.hex(this.colors.info).bold(percentStr)}${chalk.dim(status)}`);

		if (percent >= 100) {
			console.log(); // New line when complete
		}
	}

	// 🎉 Success celebration
	showSuccess(operation, stats) {
		const gradient_text = gradient(this.colors.success, this.colors.accent);
		const duration = stats.duration || 0;

		const successEmojis = ["🎉", "✨", "🚀", "⭐", "🎊"];
		const randomEmoji = successEmojis[Math.floor(Math.random() * successEmojis.length)];

		const celebration = boxen(
			`${gradient_text(`${randomEmoji} BUILD SUCCESSFUL!`)}\n\n` +
				`${figures.tick} Operation: ${chalk.hex(this.colors.primary)(operation.toUpperCase())}\n` +
				`${figures.clock} Duration: ${chalk.hex(this.colors.info)(duration.toFixed(2))}s\n` +
				`${figures.star} Files: ${chalk.hex(this.colors.success)(stats.filesProcessed || stats.filesCopied || 0)}\n` +
				`${figures.pointer} Cache Hits: ${chalk.hex(this.colors.warning)(stats.cacheHits || 0)}\n` +
				`${figures.arrowRight} ${chalk.hex(this.colors.accent)("Ready for deployment")}`,
			{
				padding: 1,
				margin: 1,
				borderStyle: "round",
				borderColor: this.colors.success,
				backgroundColor: this.theme === "minimal" ? undefined : "#0a3d0a"
			}
		);

		console.log(celebration);

		// Show additional stats if available
		if (stats.optimizations > 0 || stats.timeSaved > 0) {
			this.showOptimizationStats(stats);
		}
	}

	// ⚡ Optimization stats
	showOptimizationStats(stats) {
		const optimizationData = [];

		if (stats.optimizations > 0) {
			optimizationData.push(["Optimizations Applied", stats.optimizations, this.colors.accent]);
		}

		if (stats.timeSaved > 0) {
			optimizationData.push(["Time Saved", `${stats.timeSaved}ms`, this.colors.warning]);
		}

		if (stats.cacheHits > 0) {
			optimizationData.push(["Cache Efficiency", `${((stats.cacheHits / (stats.cacheHits + (stats.filesCopied || 0))) * 100).toFixed(1)}%`, this.colors.success]);
		}

		if (optimizationData.length > 0) {
			const table = optimizationData.map(([label, value, color]) => `${chalk.dim(label.padEnd(20))} ${chalk.hex(color).bold(value)}`).join("\n");

			const optimizationBox = boxen(`${chalk.hex(this.colors.accent)("⚡ Performance Stats")}\n\n${table}`, {
				padding: { top: 0, bottom: 0, left: 1, right: 1 },
				borderStyle: "single",
				borderColor: this.colors.accent,
				backgroundColor: this.theme === "minimal" ? undefined : "#0a0a0a"
			});

			console.log(optimizationBox);
		}
	}

	// ⚠️ Enhanced error display
	showError(error, context = {}) {
		const errorEmojis = ["❌", "💥", "🚫", "⚠️"];
		const randomEmoji = errorEmojis[Math.floor(Math.random() * errorEmojis.length)];

		const errorDetails = [
			`${chalk.hex(this.colors.error).bold(`${randomEmoji} BUILD FAILED`)}\n`,
			`${chalk.hex(this.colors.warning)("Error:")} ${error.message}`,
			context.operation ? `${chalk.hex(this.colors.info)("Operation:")} ${context.operation}` : "",
			`${chalk.hex(this.colors.secondary)("Time:")} ${new Date().toLocaleTimeString()}`,
			context.duration ? `${chalk.hex(this.colors.accent)("Duration:")} ${context.duration.toFixed(2)}s` : ""
		].filter(Boolean);

		// Add helpful suggestions based on error type
		const suggestions = this.getErrorSuggestions(error);
		if (suggestions.length > 0) {
			errorDetails.push("");
			errorDetails.push(chalk.hex(this.colors.accent)("💡 Suggestions:"));
			suggestions.forEach(suggestion => {
				errorDetails.push(`   ${chalk.dim("•")} ${suggestion}`);
			});
		}

		const errorBox = boxen(errorDetails.join("\n"), {
			padding: 1,
			margin: 1,
			borderStyle: "double",
			borderColor: this.colors.error,
			backgroundColor: this.theme === "minimal" ? undefined : "#3d0a0a"
		});

		console.log(errorBox);
	}

	// 💡 Error suggestions
	getErrorSuggestions(error) {
		const suggestions = [];
		const message = error.message.toLowerCase();

		if (message.includes("enoent") || message.includes("no such file")) {
			suggestions.push("Check if all required files exist");
			suggestions.push("Ensure paths are correct in configuration");
		}

		if (message.includes("permission denied") || message.includes("eacces")) {
			suggestions.push("Check file permissions");
			suggestions.push("Try running with elevated privileges");
		}

		if (message.includes("port") || message.includes("eaddrinuse")) {
			suggestions.push("Another process might be using the same port");
			suggestions.push("Try stopping other development servers");
		}

		if (message.includes("network") || message.includes("timeout")) {
			suggestions.push("Check your internet connection");
			suggestions.push("Verify proxy settings if behind corporate firewall");
		}

		if (message.includes("memory") || message.includes("heap")) {
			suggestions.push("Close other applications to free memory");
			suggestions.push("Try running with --max-old-space-size=4096");
		}

		return suggestions;
	}

	// 👁️ Watch mode display
	showWatchReady(stats = {}) {
		const isShopify = stats.shopifyMode;
		const title = isShopify ? "🛍️ SHOPIFY DEVELOPMENT ACTIVE" : "👁️ WATCH MODE ACTIVE";
		const titleGradient = gradient(this.colors.success, isShopify ? this.colors.accent : this.colors.secondary);

		let content =
			`${titleGradient(title)}\n\n` +
			`${figures.play} Monitoring: ${chalk.hex(this.colors.primary)(stats.filesWatched || "all files")}\n` +
			`${figures.info} Hot Reload: ${chalk.hex(this.colors.success)("enabled")}\n` +
			`${figures.pointer} Cache: ${chalk.hex(this.colors.warning)(stats.cacheEnabled ? "enabled" : "disabled")}\n`;

		if (isShopify) {
			content += `${figures.star} Shopify Sync: ${chalk.hex(this.colors.accent)("active")}\n` + `${figures.info} Theme Path: ${chalk.hex(this.colors.info)("Curalife-Theme-Build")}\n`;
		}

		content += `\n${chalk.dim("File changes will be processed automatically")}\n`;

		if (isShopify) {
			content += `${chalk.dim("Changes will be synced to your Shopify store")}\n`;
		}

		content += `${chalk.dim("Press Ctrl+C to stop watching")}`;

		const watchBox = boxen(content, {
			padding: 1,
			margin: 1,
			borderStyle: "round",
			borderColor: isShopify ? this.colors.accent : this.colors.success,
			backgroundColor: this.theme === "minimal" ? undefined : isShopify ? "#2d0a2d" : "#0a2d0a"
		});

		console.log(watchBox);
	}

	// 📁 File change notification
	showFileChange(fileName, action = "changed") {
		const actionIcons = {
			changed: "📝",
			added: "➕",
			removed: "🗑️",
			copied: "📋"
		};

		const actionColors = {
			changed: this.colors.info,
			added: this.colors.success,
			removed: this.colors.error,
			copied: this.colors.accent
		};

		const icon = actionIcons[action] || "📁";
		const color = actionColors[action] || this.colors.info;

		process.stdout.write(`\r\x1b[K${chalk.hex(color)(icon)} ${chalk.hex(this.colors.primary)(action.toUpperCase())}: ${chalk.hex(color)(fileName)}\n`);
	}

	// 🔧 Utility methods
	clearLine() {
		process.stdout.write("\r\x1b[K");
	}

	newLine() {
		console.log();
	}
}

// 🔄 Advanced Progress Bar
class AdvancedProgressBar {
	constructor(options) {
		this.total = options.total;
		this.current = options.current;
		this.width = options.width || 40;
		this.colors = options.colors;
		this.showETA = options.showETA;
		this.showSpeed = options.showSpeed;
		this.startTime = Date.now();
		this.lastUpdate = this.startTime;
		this.theme = options.theme || "modern";
		this.animations = options.animations !== false;
	}

	update(current, status = "") {
		this.current = current;
		const percentage = Math.round((current / this.total) * 100);
		const filled = Math.round((this.width * current) / this.total);

		// Create gradient progress bar
		let bar = "";
		for (let i = 0; i < this.width; i++) {
			if (i < filled) {
				const intensity = i / this.width;
				if (intensity < 0.25) {
					bar += chalk.hex(this.colors.primary)("█");
				} else if (intensity < 0.5) {
					bar += chalk.hex(this.colors.secondary)("█");
				} else if (intensity < 0.75) {
					bar += chalk.hex(this.colors.accent)("█");
				} else {
					bar += chalk.hex(this.colors.success)("█");
				}
			} else {
				bar += chalk.hex("#2c2c2c")("░");
			}
		}

		// Calculate ETA and speed
		const elapsed = Date.now() - this.startTime;
		const speed = current / (elapsed / 1000);
		const eta = speed > 0 ? Math.ceil((this.total - current) / speed) : 0;

		// Format output
		const percentageStr = `${percentage.toString().padStart(3)}%`;
		const speedStr = this.showSpeed && speed > 0 ? ` ${speed.toFixed(1)}/s` : "";
		const etaStr = this.showETA && eta > 0 && percentage < 100 ? ` ETA ${eta}s` : "";
		const statusStr = status ? ` ${status}` : "";

		// Add animation effect
		let animationChar = "";
		if (this.animations && percentage < 100) {
			const animFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
			const frameIndex = Math.floor(Date.now() / 100) % animFrames.length;
			animationChar = ` ${chalk.hex(this.colors.accent)(animFrames[frameIndex])}`;
		}

		process.stdout.write(`\r${bar} ${chalk.hex(this.colors.info).bold(percentageStr)}${speedStr}${etaStr}${animationChar}${chalk.dim(statusStr)}`);
	}

	complete(message = "Complete!") {
		this.update(this.total, message);
		console.log(); // New line

		const duration = (Date.now() - this.startTime) / 1000;
		console.log(chalk.hex(this.colors.success)(`✨ Completed in ${duration.toFixed(2)}s`));
	}
}
