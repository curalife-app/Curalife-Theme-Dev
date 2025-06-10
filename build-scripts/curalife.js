#!/usr/bin/env node

/**
 * 🚀 Curalife Build System - Unified Entry Point
 *
 * One command to rule them all!
 */

import { program } from "commander";
import chalk from "chalk";
import { BuildEngine } from "./core/build-engine.js";
import { VisualEngine } from "./core/visual-engine.js";
import { ConfigManager } from "./config/unified-config.js";
import { EnhancedTUI } from "./tui/enhanced-tui.js";

// 🎯 Initialize systems
const config = new ConfigManager();
const visual = new VisualEngine(config.get("ui"));
const engine = new BuildEngine(config.config);

// 🎮 CLI Commands
program.name("curalife").description("🚀 Curalife Theme Build System").version("2.0.0");

program
	.command("build")
	.description("🏗️ Build the theme")
	.option("--production", "Production build")
	.option("--analyze", "Analyze bundle size")
	.option("--no-cache", "Disable caching")
	.option("--no-vite", "Skip Vite build")
	.action(async options => {
		visual.showWelcomeBanner("build", options);

		try {
			// Set up progress tracking
			engine.on("progress", data => {
				visual.showProgress(data.percent, data.message);
			});

			engine.on("log", log => {
				if (log.level === "success" && log.message.includes("Updated:")) {
					const fileName = log.message.split("Updated: ")[1];
					visual.showFileChange(fileName, "copied");
				}
			});

			const result = await engine.execute("build", {
				...options,
				production: options.production || config.isProduction(),
				minify: options.production || config.get("build.minify"),
				optimize: options.production || config.get("build.optimize")
			});

			visual.showSuccess("build", result.stats);

			if (options.analyze) {
				console.log("\n📊 Running bundle analysis...");
				await engine.execute("analyze");
			}
		} catch (error) {
			visual.showError(error, { operation: "build" });
			process.exit(1);
		}
	});

program
	.command("watch")
	.description("👁️ Watch for changes")
	.option("--shopify", "Enable Shopify development mode")
	.option("--no-shopify", "Disable Shopify integration")
	.option("--no-hot", "Disable hot reload")
	.action(async options => {
		const watchMode = options.shopify ? "shopify-watch" : "watch";
		visual.showWelcomeBanner(watchMode, options);

		try {
			// Set up file change notifications
			engine.on("log", log => {
				if (log.message.includes("📁")) {
					const parts = log.message.split(": ");
					if (parts.length >= 2) {
						const action = parts[0].split(" ")[1]; // Get action (add, change, etc.)
						const fileName = parts[1].split(" (Shopify mode)")[0]; // Remove Shopify indicator
						visual.showFileChange(fileName, action);
					}
				} else if (log.message.includes("✅ Updated:")) {
					const fileName = log.message.split("Updated: ")[1];
					visual.showFileChange(fileName, "copied");
				}
			});

			// Shopify-specific event handlers
			if (options.shopify && !options.noShopify) {
				engine.on("shopify:ready", () => {
					visual.showSuccess("shopify-startup", { message: "Shopify development server ready!" });
				});

				engine.on("shopify:url", ({ type, url }) => {
					const icon = type === "local" ? "🌐" : "🛍️";
					const label = type === "local" ? "Local development" : "Store preview";

					// Make URLs very visible
					console.log(`\n${"=".repeat(60)}`);
					console.log(`${icon} ${chalk.hex("#50fa7b").bold(label.toUpperCase())}`);
					console.log(`${chalk.hex("#8be9fd").underline(url)}`);
					console.log(`${"=".repeat(60)}\n`);
				});

				engine.on("shopify:status", ({ status, message }) => {
					if (status === "syncing") {
						console.log(`🔄 ${chalk.hex("#ffb86c")(message)}`);
					} else if (status === "error") {
						console.log(`⚠️ ${chalk.hex("#ff5555")(message)}`);
					}
				});

				engine.on("shopify:file_change", ({ action, file, type }) => {
					const typeIcon =
						{
							".liquid": "💧",
							".css": "🎨",
							".scss": "🎨",
							".js": "⚡",
							".json": "📋"
						}[type] || "📁";

					console.log(`${typeIcon} Shopify sync: ${chalk.hex("#8be9fd")(file)} (${action})`);
				});
			}

			engine.on("watch:ready", data => {
				visual.showWatchReady({
					filesWatched: "all files",
					cacheEnabled: config.get("performance.cache"),
					shopifyMode: data?.shopify || false
				});

				// Provide manual URL check option
				console.log(`\n💡 ${chalk.dim("If URLs don't appear automatically, run:")} ${chalk.hex("#50fa7b")("npm run shopify-urls")}\n`);
			});

			await engine.execute("watch", {
				...options,
				shopify: (options.shopify && !options.noShopify) || config.isShopify()
			});
		} catch (error) {
			visual.showError(error, { operation: watchMode });
			process.exit(1);
		}
	});

program
	.command("watch-only")
	.description("👁️ Watch files without Shopify integration")
	.option("--no-hot", "Disable hot reload")
	.action(async options => {
		visual.showWelcomeBanner("watch", { ...options, noShopify: true });

		try {
			// Set up file change notifications
			engine.on("log", log => {
				if (log.message.includes("📁")) {
					const parts = log.message.split(": ");
					if (parts.length >= 2) {
						const action = parts[0].split(" ")[1];
						const fileName = parts[1];
						visual.showFileChange(fileName, action);
					}
				} else if (log.message.includes("✅ Updated:")) {
					const fileName = log.message.split("Updated: ")[1];
					visual.showFileChange(fileName, "copied");
				}
			});

			engine.on("watch:ready", () => {
				visual.showWatchReady({
					filesWatched: "all files",
					cacheEnabled: config.get("performance.cache"),
					shopifyMode: false
				});
			});

			await engine.execute("watch", {
				...options,
				shopify: false
			});
		} catch (error) {
			visual.showError(error, { operation: "watch" });
			process.exit(1);
		}
	});

program
	.command("shopify")
	.description("🛍️ Start Shopify development mode")
	.option("--ui", "Enable TUI interface (experimental)")
	.option("--build-first", "Run full build before starting")
	.action(async options => {
		// Force Shopify mode
		options.shopify = true;

		const shopifyOptions = {
			...options,
			shopify: true
		};

		// TUI Mode - only if explicitly requested with --ui flag
		if (options.ui === true) {
			try {
				console.clear(); // Clear any existing output
				const tui = new EnhancedTUI(engine);

				// Set up TUI-specific engine events (no console output)
				engine.removeAllListeners(); // Clear existing listeners

				tui.start();

				// Run build first if requested
				if (options.buildFirst) {
					await engine.execute("build", shopifyOptions);
				}

				// Start watch mode (TUI will handle all output)
				await engine.execute("watch", shopifyOptions);
				return;
			} catch (error) {
				console.warn("⚠️ TUI not available, falling back to standard mode");
				console.warn("TUI Error details:", error.message);
				if (process.env.DEBUG) {
					console.warn("Full error stack:", error.stack);
				}
				// Continue to standard mode below
			}
		}

		// Standard CLI mode - only if TUI is disabled
		visual.showWelcomeBanner("shopify", shopifyOptions);

		try {
			// Set up Shopify-specific event handlers
			engine.on("shopify:ready", () => {
				console.log("\n🎉 " + chalk.hex("#50fa7b").bold("Shopify development server is ready!"));
				console.log("📝 " + chalk.dim("File changes will be automatically synced to your store"));
			});

			engine.on("shopify:url", ({ type, url }) => {
				const icon = type === "local" ? "🌐" : "🛍️";
				const label = type === "local" ? "Local development" : "Store preview";

				// Make URLs very visible
				console.log(`\n${"=".repeat(60)}`);
				console.log(`${icon} ${chalk.hex("#50fa7b").bold(label.toUpperCase())}`);
				console.log(`${chalk.hex("#8be9fd").underline(url)}`);
				console.log(`${"=".repeat(60)}\n`);
			});

			engine.on("file:changed", ({ fileName, event, fileExt }) => {
				const typeIcon =
					{
						".liquid": "💧",
						".css": "🎨",
						".scss": "🎨",
						".js": "⚡",
						".json": "📋"
					}[fileExt] || "📁";

				visual.showFileChange(fileName, event);
				console.log(`${typeIcon} Syncing to Shopify...`);
			});

			engine.on("watch:ready", () => {
				visual.showWatchReady({
					filesWatched: "all files",
					cacheEnabled: config.get("performance.cache"),
					shopifyMode: true
				});

				// Provide manual URL check option
				console.log(`\n💡 ${chalk.dim("If URLs don't appear automatically, run:")} ${chalk.hex("#50fa7b")("npm run shopify-urls")}\n`);
			});

			if (options.buildFirst) {
				await engine.execute("build", shopifyOptions);
			}

			await engine.execute("watch", shopifyOptions);
		} catch (error) {
			visual.showError(error, { operation: "shopify" });
			process.exit(1);
		}
	});

program
	.command("dev")
	.description("🚀 Start development with TUI")
	.option("--no-ui", "Disable TUI interface")
	.option("--shopify", "Enable Shopify mode")
	.action(async options => {
		if (options.ui !== false) {
			try {
				const tui = new EnhancedTUI(engine);
				tui.start();
			} catch (error) {
				console.warn("⚠️ TUI not available, falling back to standard mode");
				options.ui = false;
			}
		}

		if (options.ui === false) {
			visual.showWelcomeBanner("development", options);

			try {
				// Set up progress and notifications
				engine.on("progress", data => {
					visual.showProgress(data.percent, data.message);
				});

				engine.on("log", log => {
					if (log.message.includes("✅ Updated:")) {
						const fileName = log.message.split("Updated: ")[1];
						visual.showFileChange(fileName, "copied");
					}
				});

				engine.on("watch:ready", () => {
					visual.showWatchReady({
						filesWatched: "all files",
						cacheEnabled: config.get("performance.cache")
					});
				});

				await engine.execute("build:watch", {
					...options,
					shopify: options.shopify || config.isShopify()
				});
			} catch (error) {
				visual.showError(error, { operation: "development" });
				process.exit(1);
			}
		}
	});

program
	.command("optimize")
	.description("⚡ Optimize assets")
	.option("--images", "Optimize images only")
	.option("--css", "Optimize CSS only")
	.action(async options => {
		visual.showWelcomeBanner("optimize", options);

		try {
			const result = await engine.execute("optimize", options);
			visual.showSuccess("optimize", result);
		} catch (error) {
			visual.showError(error, { operation: "optimize" });
			process.exit(1);
		}
	});

program
	.command("analyze")
	.description("📊 Analyze build performance")
	.action(async options => {
		visual.showWelcomeBanner("analyze", options);

		try {
			const result = await engine.execute("analyze", options);

			// Show detailed analysis
			visual.showMetrics({
				filesProcessed: result.stats.filesCopied,
				cacheHitRate: parseInt(result.cacheStats.hitRate),
				timeSaved: result.stats.timeSaved,
				memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
			});

			visual.showSuccess("analyze", result.stats);
		} catch (error) {
			visual.showError(error, { operation: "analyze" });
			process.exit(1);
		}
	});

program
	.command("shopify-urls")
	.description("🔍 Check Shopify development URLs")
	.action(async options => {
		console.log("🔍 Checking Shopify development URLs...\n");

		try {
			const result = await engine.checkShopifyStatus();
			console.log("✅ Shopify status check completed\n");
		} catch (error) {
			console.error("❌ Failed to check Shopify status:", error.message);
		}
	});

// 🔧 Configuration commands
program
	.command("config")
	.description("🔧 Show configuration")
	.action(() => {
		console.log("📋 Current Configuration:");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`Environment: ${config.environment}`);
		console.log(`Theme: ${config.getTheme()}`);
		console.log(`Performance: ${JSON.stringify(config.getPerformanceConfig(), null, 2)}`);
		console.log(`Watch: ${JSON.stringify(config.getWatchConfig(), null, 2)}`);
		console.log(`Build: ${JSON.stringify(config.getBuildConfig(), null, 2)}`);
	});

// 🧹 Cleanup commands
program
	.command("clean")
	.description("🧹 Clean build cache and temporary files")
	.action(async () => {
		console.log("🧹 Cleaning build cache...");

		try {
			const fs = await import("fs");
			const path = await import("path");

			const cleanPaths = ["build-scripts/cache", ".tmp", "Curalife-Theme-Build"];

			for (const cleanPath of cleanPaths) {
				if (fs.existsSync(cleanPath)) {
					await fs.promises.rm(cleanPath, { recursive: true, force: true });
					console.log(`✅ Cleaned: ${cleanPath}`);
				}
			}

			console.log("✨ Clean complete!");
		} catch (error) {
			console.error("❌ Clean failed:", error.message);
			process.exit(1);
		}
	});

// 🚀 Handle errors gracefully
process.on("uncaughtException", error => {
	visual.showError(error, { operation: "system" });
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	visual.showError(new Error(`Unhandled rejection: ${reason}`), { operation: "system" });
	process.exit(1);
});

// 🚀 Launch
program.parse();
