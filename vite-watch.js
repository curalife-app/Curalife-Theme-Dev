/**
 * Improved Vite Watch Script for Curalife Theme
 *
 * This script provides a simplified file watching solution using Vite's built-in
 * functionality. It:
 * 1. Starts Vite in watch mode for processing CSS and other assets
 * 2. Watches for file changes in specific directories
 * 3. Copies changed files to the build directory maintaining Shopify's flat structure
 * 4. Provides clean console feedback for each file change
 *
 * Usage:
 *   npm run watch:vite
 *   or
 *   node vite-watch.js
 */

import { createServer } from "vite";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import chalk from "chalk";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define directories and paths (simplified from the original watch.js)
const paths = {
	buildDir: path.resolve(__dirname, "Curalife-Theme-Build"),
	source: {
		fonts: path.join(__dirname, "src", "fonts"),
		images: path.join(__dirname, "src", "images"),
		styles: path.join(__dirname, "src", "styles", "css"),
		scripts: path.join(__dirname, "src", "scripts"),
		liquid: {
			layout: path.join(__dirname, "src", "liquid", "layout"),
			sections: path.join(__dirname, "src", "liquid", "sections"),
			snippets: path.join(__dirname, "src", "liquid", "snippets"),
			blocks: path.join(__dirname, "src", "liquid", "blocks")
		}
	},
	build: {
		assets: path.join(__dirname, "Curalife-Theme-Build", "assets"),
		layout: path.join(__dirname, "Curalife-Theme-Build", "layout"),
		sections: path.join(__dirname, "Curalife-Theme-Build", "sections"),
		snippets: path.join(__dirname, "Curalife-Theme-Build", "snippets"),
		blocks: path.join(__dirname, "Curalife-Theme-Build", "blocks")
	}
};

// Stats tracking
const stats = {
	startTime: Date.now(),
	filesCopied: 0,
	lastChanges: []
};

// Console formatters
const formatTime = () => {
	return new Date().toLocaleTimeString("en-US", {
		hour12: true,
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit"
	});
};

const printBanner = () => {
	console.log(`
${chalk.magenta("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓")}
${chalk.magenta("┃                                                            ┃")}
${chalk.magenta("┃")}            ${chalk.yellow("𝘾𝙐𝙍𝘼𝙇𝙄𝙁𝙀")} ${chalk.cyan("𝙒𝘼𝙏𝘾𝙃")}                          ${chalk.magenta("┃")}
${chalk.magenta("┃                                                            ┃")}
${chalk.magenta("┃")}           ${chalk.green(`Started at ${formatTime()}`)}                       ${chalk.magenta("┃")}
${chalk.magenta("┃                                                            ┃")}
${chalk.magenta("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛")}
  `);
};

// Logger with emoji indicators
const log = (message, type = "info") => {
	const icons = {
		info: "📝",
		success: "✅",
		error: "❌",
		warning: "⚠️",
		file: "📄",
		watch: "👁️"
	};

	const colorize = {
		info: chalk.blue,
		success: chalk.green,
		error: chalk.red,
		warning: chalk.yellow,
		file: chalk.cyan,
		watch: chalk.magenta
	};

	console.log(`${icons[type]} ${colorize[type](message)}`);
};

// Ensure build directories exist
const ensureDirectories = () => {
	Object.values(paths.build).forEach(dir => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			log(`Created directory: ${path.basename(dir)}`, "success");
		}
	});
};

// Get destination path based on source file
const getDestinationPath = sourcePath => {
	const fileName = path.basename(sourcePath);

	// Determine destination based on file location
	if (sourcePath.includes(paths.source.fonts) || sourcePath.includes(paths.source.images) || sourcePath.includes(paths.source.styles) || sourcePath.includes(paths.source.scripts)) {
		return path.join(paths.build.assets, fileName);
	} else if (sourcePath.includes(paths.source.liquid.layout)) {
		return path.join(paths.build.layout, fileName);
	} else if (sourcePath.includes(paths.source.liquid.sections)) {
		return path.join(paths.build.sections, fileName);
	} else if (sourcePath.includes(paths.source.liquid.snippets)) {
		return path.join(paths.build.snippets, fileName);
	} else if (sourcePath.includes(paths.source.liquid.blocks)) {
		return path.join(paths.build.blocks, fileName);
	}

	return null;
};

// Copy a file to the build directory
const copyFile = async sourcePath => {
	const destPath = getDestinationPath(sourcePath);

	if (!destPath) {
		log(`Couldn't determine destination for: ${sourcePath}`, "warning");
		return;
	}

	try {
		await fs.promises.copyFile(sourcePath, destPath);
		stats.filesCopied++;

		// Keep track of last 5 changes
		stats.lastChanges.unshift({
			file: path.basename(sourcePath),
			time: formatTime()
		});

		if (stats.lastChanges.length > 5) {
			stats.lastChanges.pop();
		}

		log(`Copied: ${path.basename(sourcePath)} → ${path.dirname(destPath)}`, "success");
	} catch (error) {
		log(`Error copying ${path.basename(sourcePath)}: ${error.message}`, "error");
	}
};

// Delete a file from the build directory
const deleteFile = async sourcePath => {
	const destPath = getDestinationPath(sourcePath);

	if (!destPath) {
		return;
	}

	try {
		if (fs.existsSync(destPath)) {
			await fs.promises.unlink(destPath);
			log(`Deleted: ${path.basename(sourcePath)}`, "warning");
		}
	} catch (error) {
		log(`Error deleting ${path.basename(sourcePath)}: ${error.message}`, "error");
	}
};

// Set up file watchers for each directory
const setupWatchers = () => {
	// Directories to watch
	const watchDirs = [paths.source.fonts, paths.source.images, paths.source.scripts, paths.source.liquid.layout, paths.source.liquid.sections, paths.source.liquid.snippets, paths.source.liquid.blocks];

	// Set up watcher with chokidar (more reliable than fs.watch)
	const watcher = chokidar.watch(watchDirs, {
		ignored: /(^|[\/\\])\../, // ignore dotfiles
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 300,
			pollInterval: 100
		}
	});

	// Watch events
	watcher
		.on("add", path => copyFile(path))
		.on("change", path => copyFile(path))
		.on("unlink", path => deleteFile(path));

	log("File watcher started", "watch");

	// List watched directories
	watchDirs.forEach(dir => {
		log(`Watching: ${path.basename(dir)}`, "info");
	});
};

// Print stats periodically
const startStatsReporting = () => {
	setInterval(() => {
		const runningTime = Math.floor((Date.now() - stats.startTime) / 1000);
		const hours = Math.floor(runningTime / 3600);
		const minutes = Math.floor((runningTime % 3600) / 60);
		const seconds = runningTime % 60;
		const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

		console.log(`\n${chalk.cyan("━━━━━━━━━━━━━━ Stats ━━━━━━━━━━━━━━")}`);
		console.log(`${chalk.green("⏱️ Running time:")} ${timeString}`);
		console.log(`${chalk.green("📁 Files copied:")} ${stats.filesCopied}`);
		console.log(`${chalk.green("🕒 Current time:")} ${formatTime()}`);

		if (stats.lastChanges.length > 0) {
			console.log(`\n${chalk.yellow("Recent changes:")}`);
			stats.lastChanges.forEach(change => {
				console.log(`  ${chalk.cyan(change.time)} - ${change.file}`);
			});
		}

		console.log(chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
	}, 60000); // Update every minute
};

// Main function to start the watch process
const startWatch = async () => {
	printBanner();

	try {
		// Ensure build directories exist
		ensureDirectories();

		// Set up file watchers
		setupWatchers();

		// Start periodic stats reporting
		startStatsReporting();

		// Start Vite server in watch mode for CSS processing
		const viteServer = await createServer({
			configFile: path.resolve(__dirname, "vite.config.js"),
			mode: "development",
			server: {
				hmr: false // Disable HMR to avoid conflicts
			}
		});

		await viteServer.listen();
		log("Vite server started for CSS processing", "success");
	} catch (error) {
		log(`Error starting watch process: ${error.message}`, "error");
		console.error(error);
		process.exit(1);
	}
};

// Start the watch process
startWatch();
