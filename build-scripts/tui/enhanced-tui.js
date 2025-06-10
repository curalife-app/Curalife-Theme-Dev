#!/usr/bin/env node

/**
 * 🎮 Enhanced TUI - Beautiful Interactive Interface
 */

import blessed from "blessed";
import contrib from "blessed-contrib";
import chalk from "chalk";

export class EnhancedTUI {
	constructor(buildEngine) {
		try {
			this.buildEngine = buildEngine;
			this.screen = null;
			this.widgets = {};
			this.isShopifyMode = false;
			this.shopifyUrls = { local: null, preview: null };
			this.data = {
				logs: [],
				metrics: {},
				status: "idle"
			};

			this.setupUI();
			this.bindEvents();

			// Capture console output to prevent conflicts
			this.originalConsoleLog = console.log;
			this.originalConsoleError = console.error;
			this.originalConsoleWarn = console.warn;

			// Redirect console output to TUI logs
			console.log = (...args) => this.addLog({ level: "info", message: args.join(" ") });
			console.error = (...args) => this.addLog({ level: "error", message: args.join(" ") });
			console.warn = (...args) => this.addLog({ level: "warning", message: args.join(" ") });
		} catch (error) {
			console.error("TUI Constructor Error:", error.message);
			if (process.env.DEBUG) {
				console.error("TUI Constructor Stack:", error.stack);
			}
			throw error;
		}
	}

	setupUI() {
		// 🖥️ Main screen
		this.screen = blessed.screen({
			smartCSR: true,
			title: "🚀 Curalife Build Engine",
			fullUnicode: true
		});

		// 📊 Main layout
		this.widgets.grid = new contrib.grid({
			rows: 12,
			cols: 12,
			screen: this.screen
		});

		// 🎯 Status panel
		this.widgets.status = this.widgets.grid.set(0, 0, 3, 6, blessed.box, {
			label: " 🎯 Status ",
			border: { type: "line" },
			style: {
				border: { fg: "cyan" },
				label: { fg: "white", bold: true }
			}
		});

		// 📈 Metrics panel
		this.widgets.metrics = this.widgets.grid.set(0, 6, 3, 6, contrib.gauge, {
			label: " 📈 Performance ",
			stroke: "green",
			fill: "white"
		});

		// 📋 Logs panel
		this.widgets.logs = this.widgets.grid.set(3, 0, 6, 12, contrib.log, {
			label: " 📋 Build Logs ",
			style: {
				border: { fg: "yellow" }
			}
		});

		// 📊 Progress panel
		this.widgets.progress = this.widgets.grid.set(9, 0, 3, 8, blessed.progressbar, {
			label: " 🔄 Progress ",
			border: { type: "line" },
			style: {
				border: { fg: "magenta" },
				bar: { bg: "blue" }
			},
			ch: "█",
			filled: 0
		});

		// 🎮 Controls panel
		this.widgets.controls = this.widgets.grid.set(9, 8, 3, 4, blessed.box, {
			label: " 🎮 Controls ",
			border: { type: "line" },
			content: this.getControlsText(),
			style: {
				border: { fg: "green" }
			}
		});

		this.screen.render();
	}

	getControlsText() {
		return [
			"{bold}Available Commands:{/bold}",
			"",
			"{cyan-fg}b{/cyan-fg} - Build project",
			"{cyan-fg}w{/cyan-fg} - Start watch mode",
			"{cyan-fg}s{/cyan-fg} - Shopify dev",
			"{cyan-fg}o{/cyan-fg} - Optimize assets",
			"{cyan-fg}a{/cyan-fg} - Analyze bundle",
			"{cyan-fg}c{/cyan-fg} - Clear logs",
			"{cyan-fg}x{/cyan-fg} - Stop watch mode",
			"{cyan-fg}q{/cyan-fg} - Quit",
			"",
			"{yellow-fg}Press any key to continue{/yellow-fg}"
		].join("\n");
	}

	bindEvents() {
		// 🎮 Keyboard controls
		this.screen.key(["q", "C-c"], () => {
			// Restore console functions
			console.log = this.originalConsoleLog;
			console.error = this.originalConsoleError;
			console.warn = this.originalConsoleWarn;
			process.exit(0);
		});

		this.screen.key("b", () => this.runBuild());
		this.screen.key("w", () => this.runWatch());
		this.screen.key("s", () => this.runShopifyDev());
		this.screen.key("o", () => this.runOptimize());
		this.screen.key("a", () => this.runAnalyze());
		this.screen.key("c", () => this.clearLogs());
		this.screen.key("x", () => this.stopWatch());

		// 🔗 Build engine events
		this.buildEngine.on("start", context => this.updateStatus("running", context));
		this.buildEngine.on("progress", data => this.updateProgress(data));
		this.buildEngine.on("log", log => this.addLog(log));
		this.buildEngine.on("metrics", metrics => this.updateMetrics(metrics));
		this.buildEngine.on("complete", result => this.updateStatus("completed", result));
		this.buildEngine.on("error", error => this.updateStatus("error", error));

		// 🛍️ Shopify-specific events
		this.buildEngine.on("shopify:ready", () => {
			this.isShopifyMode = true;
			this.addLog({ level: "success", message: "🛍️ Shopify development server is ready!" });
			this.updateShopifyStatus();
		});

		this.buildEngine.on("shopify:url", ({ type, url }) => {
			this.shopifyUrls[type] = url;
			const label = type === "local" ? "Local development" : "Store preview";
			this.addLog({ level: "success", message: `🌐 ${label}: ${url}` });
			this.updateShopifyStatus();
		});

		this.buildEngine.on("shopify:stopped", () => {
			this.isShopifyMode = false;
			this.addLog({ level: "warning", message: "🛍️ Shopify development server stopped" });
			this.updateShopifyStatus();
		});

		this.buildEngine.on("file:changed", ({ fileName, event, fileExt }) => {
			const typeIcon =
				{
					".liquid": "💧",
					".css": "🎨",
					".scss": "🎨",
					".js": "⚡",
					".json": "📋"
				}[fileExt] || "📁";

			this.addLog({
				level: "info",
				message: `${typeIcon} ${event.toUpperCase()}: ${fileName}${this.isShopifyMode ? " (Shopify sync)" : ""}`
			});
		});

		this.buildEngine.on("watch:ready", () => {
			this.addLog({ level: "success", message: "👁️ File watcher ready! Watching for changes..." });
		});
	}

	// 🛍️ Update Shopify status display
	updateShopifyStatus() {
		if (!this.isShopifyMode) return;

		const shopifyInfo = [
			"🛍️ SHOPIFY MODE ACTIVE",
			"",
			this.shopifyUrls.local ? `🌐 Local: ${this.shopifyUrls.local}` : "🌐 Local: Starting...",
			this.shopifyUrls.preview ? `🛍️ Preview: ${this.shopifyUrls.preview}` : "🛍️ Preview: Connecting...",
			"",
			"📁 File sync: Active",
			"💧 Theme path: Curalife-Theme-Build"
		].join("\n");

		// Update the status panel with Shopify info
		const currentContent = this.widgets.status.getContent();
		const updatedContent = currentContent + "\n\n" + shopifyInfo;
		this.widgets.status.setContent(updatedContent);
		this.screen.render();
	}

	// 🎯 Update status display
	updateStatus(status, data) {
		this.data.status = status;

		const statusColors = {
			idle: "white",
			running: "yellow",
			completed: "green",
			error: "red"
		};

		const statusIcons = {
			idle: "⏸️",
			running: "🔄",
			completed: "✅",
			error: "❌"
		};

		const statusText = [
			`{bold}Current Status:{/bold}`,
			"",
			`${statusIcons[status]} ${status.toUpperCase()}`,
			"",
			data.operation ? `Operation: ${data.operation}` : "",
			data.duration ? `Duration: ${data.duration.toFixed(2)}s` : "",
			data.error ? `Error: ${data.error.message}` : ""
		]
			.filter(Boolean)
			.join("\n");

		this.widgets.status.setContent(statusText);

		// Add Shopify info if in Shopify mode
		if (this.isShopifyMode) {
			this.updateShopifyStatus();
		}

		this.screen.render();
	}

	// 📈 Update performance metrics
	updateMetrics(metrics) {
		this.data.metrics = metrics;

		// Update gauge with cache hit rate
		const cacheHitRate = metrics.cacheHitRate || 0;
		this.widgets.metrics.setStack([{ percent: cacheHitRate, stroke: "green" }]);

		this.screen.render();
	}

	// 📊 Update progress
	updateProgress(data) {
		const percent = data.percent || 0;
		this.widgets.progress.setProgress(percent);

		if (data.message) {
			this.widgets.progress.setLabel(` 🔄 ${data.message} `);
		}

		this.screen.render();
	}

	// 📋 Add log entry
	addLog(log) {
		const timestamp = new Date().toLocaleTimeString();
		const level = log.level || "info";
		const message = log.message || "";

		const levelColors = {
			info: "white",
			success: "green",
			warning: "yellow",
			error: "red"
		};

		const formattedLog = `{${levelColors[level]}-fg}[${timestamp}] ${level.toUpperCase()}: ${message}{/}`;

		this.widgets.logs.log(formattedLog);
		this.screen.render();
	}

	// 🧹 Clear logs
	clearLogs() {
		this.widgets.logs.setContent("");
		this.addLog({ level: "info", message: "Logs cleared" });
	}

	// 🏗️ Build operations
	async runBuild() {
		this.addLog({ level: "info", message: "Starting build..." });
		try {
			await this.buildEngine.execute("build");
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	async runWatch() {
		this.addLog({ level: "info", message: "Starting watch mode..." });
		try {
			await this.buildEngine.execute("watch");
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	async runShopifyDev() {
		this.addLog({ level: "info", message: "Starting Shopify development..." });
		try {
			await this.buildEngine.execute("build:watch", { shopify: true });
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	async runOptimize() {
		this.addLog({ level: "info", message: "Optimizing assets..." });
		try {
			await this.buildEngine.execute("optimize");
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	async runAnalyze() {
		this.addLog({ level: "info", message: "Analyzing bundle..." });
		try {
			await this.buildEngine.execute("analyze");
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	async stopWatch() {
		this.addLog({ level: "info", message: "Stopping watch mode..." });
		try {
			await this.buildEngine.stopWatch();
			this.isShopifyMode = false;
			this.shopifyUrls = { local: null, preview: null };
		} catch (error) {
			this.addLog({ level: "error", message: error.message });
		}
	}

	// 🚀 Start the TUI
	start() {
		this.updateStatus("idle");
		this.addLog({
			level: "success",
			message: "🚀 Enhanced TUI ready! Use keyboard shortcuts to control the build system."
		});
	}
}
