/**
 * Custom File Watcher for Curalife Shopify Theme
 *
 * This script provides a reliable file watching solution that:
 * 1. Watches all source directories for changes
 * 2. Immediately copies changed files to the build directory
 * 3. Maintains the flattened structure required by Shopify
 * 4. Runs Tailwind CSS in watch mode for CSS processing
 *
 * ADVANTAGES OVER OTHER APPROACHES:
 * - Works without package manager issues (pnpm/npm/yarn)
 * - Bypasses Vite CLI limitations (doesn't require --watch flag)
 * - Provides detailed console feedback for each file change
 * - Significantly faster than full rebuilds
 *
 * Usage:
 *   npm run watch
 *   or
 *   node watch.js
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// Paths configuration - must match vite.config.js
const paths = {
	build_folder: path.resolve(process.cwd(), "Curalife-Theme-Build"),
	source: {
		fonts: path.join(process.cwd(), "src", "fonts"),
		images: path.join(process.cwd(), "src", "images"),
		styles: path.join(process.cwd(), "src", "styles", "css"),
		scripts: path.join(process.cwd(), "src", "scripts"),
		liquidLayout: path.join(process.cwd(), "src", "liquid", "layout"),
		liquidSections: path.join(process.cwd(), "src", "liquid", "sections"),
		liquidSnippets: path.join(process.cwd(), "src", "liquid", "snippets"),
		liquidBlocks: path.join(process.cwd(), "src", "liquid", "blocks")
	},
	build: {
		assets: path.join(process.cwd(), "Curalife-Theme-Build", "assets"),
		layout: path.join(process.cwd(), "Curalife-Theme-Build", "layout"),
		sections: path.join(process.cwd(), "Curalife-Theme-Build", "sections"),
		snippets: path.join(process.cwd(), "Curalife-Theme-Build", "snippets"),
		blocks: path.join(process.cwd(), "Curalife-Theme-Build", "blocks")
	}
};

// File processing debounce cache to prevent duplicate notifications
const processedFiles = new Map();
const DEBOUNCE_TIME = 500; // ms

// Stats tracking for file changes
const stats = {
	startTime: Date.now(),
	totalChanges: 0,
	changesByType: {
		".css": 0,
		".js": 0,
		".liquid": 0,
		".woff": 0,
		".woff2": 0,
		".eot": 0,
		".ttf": 0,
		".otf": 0,
		".png": 0,
		".jpg": 0,
		".jpeg": 0,
		".gif": 0,
		".svg": 0,
		other: 0
	},
	sessionDuration: () => {
		const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
		const hours = Math.floor(elapsed / 3600);
		const minutes = Math.floor((elapsed % 3600) / 60);
		const seconds = elapsed % 60;
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	},
	changeLog: [] // Keep track of last 10 changes
};

// Get formatted time
const getFormattedTime = () => {
	const now = new Date();
	return now.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" });
};

// Clear terminal function
const clearTerminal = () => {
	// Use ANSI escape sequences to clear terminal
	process.stdout.write("\x1Bc");
};

// Fancy console banner for watch process
const printWelcomeBanner = () => {
	const boxWidth = 60;
	console.log(`
\x1b[35m┏${"━".repeat(boxWidth)}┓
┃${" ".repeat(boxWidth)}┃
┃${" ".repeat(Math.floor((boxWidth - 23) / 2))}\x1b[33m𝘾𝙐𝙍𝘼𝙇𝙄𝙁𝙀 \x1b[36m𝙒𝘼𝙏𝘾𝙃\x1b[35m${" ".repeat(Math.ceil((boxWidth - 23) / 2))}┃
┃${" ".repeat(boxWidth)}┃
┃${" ".repeat(Math.floor((boxWidth - 34) / 2))}\x1b[32mStarted at ${getFormattedTime()}\x1b[35m${" ".repeat(Math.ceil((boxWidth - 34) / 2))}┃
┃${" ".repeat(boxWidth)}┃
┗${"━".repeat(boxWidth)}┛\x1b[0m`);
};

// Print section divider
const printSectionDivider = title => {
	const boxWidth = 60;
	const titleText = `[ ${title} ]`;
	const leftPadding = Math.floor((boxWidth - titleText.length) / 2);
	const rightPadding = boxWidth - titleText.length - leftPadding;

	console.log(`\x1b[35m┏${"━".repeat(leftPadding)}${titleText}${"━".repeat(rightPadding)}┓\x1b[0m`);
};

// Print section end
const printSectionEnd = () => {
	const boxWidth = 60;
	console.log(`\x1b[35m┗${"━".repeat(boxWidth)}┛\x1b[0m`);
};

// Enhanced logging function
const log = (message, type = "info") => {
	const icons = {
		info: "ℹ️ ",
		success: "✅ ",
		error: "❌ ",
		warning: "⚠️ ",
		file: "📄 ",
		watch: "👁️ "
	};

	const colors = {
		info: "\x1b[36m", // Blue
		success: "\x1b[32m", // Green
		error: "\x1b[31m", // Red
		warning: "\x1b[33m", // Yellow
		file: "\x1b[36m", // Blue
		watch: "\x1b[35m", // Purple
		status: "\x1b[33m" // Yellow
	};

	const timestamp = getFormattedTime();
	console.log(`${colors[type]}${icons[type]} ${message}\x1b[0m`);
};

// Format path to be more readable
const formatPath = fullPath => {
	const parts = fullPath.split(path.sep);
	// Get last 3 parts of path for shorter display
	const shortPath = parts.slice(Math.max(parts.length - 3, 0)).join("/");
	return shortPath;
};

// Initial setup - ensure directories exist
const setupDirectories = () => {
	// Create build folder if it doesn't exist
	if (!fs.existsSync(paths.build_folder)) {
		fs.mkdirSync(paths.build_folder, { recursive: true });
		log(`Created build directory: ${formatPath(paths.build_folder)}`, "success");
	}

	// Create asset directories
	Object.values(paths.build).forEach(dir => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			log(`Created directory: ${formatPath(dir)}`, "success");
		}
	});
};

// Helper to get destination based on source path
const getDestination = sourcePath => {
	const filename = path.basename(sourcePath);

	if (sourcePath.includes(paths.source.fonts) || sourcePath.includes(paths.source.images) || sourcePath.includes(paths.source.styles) || sourcePath.includes(paths.source.scripts)) {
		return path.join(paths.build.assets, filename);
	} else if (sourcePath.includes(paths.source.liquidLayout)) {
		return path.join(paths.build.layout, filename);
	} else if (sourcePath.includes(paths.source.liquidSections)) {
		return path.join(paths.build.sections, filename);
	} else if (sourcePath.includes(paths.source.liquidSnippets)) {
		return path.join(paths.build.snippets, filename);
	} else if (sourcePath.includes(paths.source.liquidBlocks)) {
		return path.join(paths.build.blocks, filename);
	}

	return null;
};

// Helper to get file type icon
const getFileTypeIcon = ext => {
	const icons = {
		".css": "🎨",
		".js": "📜",
		".liquid": "💧",
		".woff": "🔤",
		".woff2": "🔤",
		".eot": "🔤",
		".ttf": "��",
		".otf": "��",
		".png": "🖼️",
		".jpg": "🖼️",
		".jpeg": "🖼️",
		".gif": "🖼️",
		".svg": "🖼️"
	};
	return icons[ext] || "📄";
};

// Sleep function for delays
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Copy file with retry mechanism for handling file locks
const copyFileWithRetry = async (src, dest, filename, ext) => {
	const MAX_RETRIES = 3;
	const RETRY_DELAY = 100; // ms

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			fs.copyFileSync(src, dest);

			// Update statistics
			stats.totalChanges++;
			if (stats.changesByType[ext]) {
				stats.changesByType[ext]++;
			} else {
				stats.changesByType.other++;
			}

			// Add to change log (limited to last 5 entries)
			stats.changeLog.unshift({
				time: getFormattedTime(),
				file: filename,
				type: ext
			});
			if (stats.changeLog.length > 5) {
				stats.changeLog.pop();
			}

			// Print success message
			const fileIcon = getFileTypeIcon(ext);
			const shortSrc = formatPath(src);
			const shortDest = formatPath(dest);
			log(`${fileIcon} ${filename} (${shortSrc} → ${shortDest})`, "success");

			// Update status display
			updateStatusDisplay();

			return true; // Success
		} catch (err) {
			if (err.code === "EBUSY" && attempt < MAX_RETRIES - 1) {
				// File is locked, wait and retry
				if (attempt === 0) {
					log(`File busy, retrying... ${filename}`, "info");
				}
				await sleep(RETRY_DELAY * (attempt + 1)); // Increase delay with each retry
				continue;
			}
			// Either it's not a busy error or we've run out of retries
			log(`Error copying file: ${err.message}`, "error");
			return false;
		}
	}
	return false;
};

// Print current status
const updateStatusDisplay = () => {
	// Don't update too frequently to avoid console flicker
	const now = Date.now();
	if (updateStatusDisplay.lastUpdate && now - updateStatusDisplay.lastUpdate < 1000) {
		return;
	}
	updateStatusDisplay.lastUpdate = now;

	// Update the status periodically
	printStatusBar();
};

// Format counts for status display
const formatCounts = () => {
	let result = "";
	const relevantTypes = {
		".liquid": "💧",
		".css": "🎨",
		".js": "📜",
		".png": "🖼️",
		".jpg": "🖼️",
		".svg": "🖼️"
	};

	for (const [ext, icon] of Object.entries(relevantTypes)) {
		const count = stats.changesByType[ext];
		if (count > 0) {
			result += `${icon} ${count}  `;
		}
	}

	return result.trim() || "No changes yet";
};

// Print status bar at the bottom of terminal
const printStatusBar = () => {
	const boxWidth = 60;
	console.log(`\n\x1b[33m┏${"━".repeat(boxWidth)}┓`);
	console.log(`┃ 🕒 Session: ${stats.sessionDuration()}    🔄 Changes: ${stats.totalChanges} ${" ".repeat(boxWidth - 35)}┃`);
	console.log(`┃ ${formatCounts()}${" ".repeat(boxWidth - formatCounts().length - 2)}┃`);

	// Show recent activity if available
	if (stats.changeLog.length > 0) {
		console.log(`┃${" ".repeat(boxWidth)}┃`);
		console.log(`┃ Recent Activity:${" ".repeat(boxWidth - 18)}┃`);
		stats.changeLog.forEach((change, i) => {
			if (i < 3) {
				// Show only last 3 changes
				const icon = getFileTypeIcon(change.type);
				const entry = ` ${icon} ${change.time} - ${change.file}`;
				const truncatedEntry = entry.length > boxWidth - 4 ? entry.substring(0, boxWidth - 7) + "..." : entry;
				console.log(`┃${truncatedEntry}${" ".repeat(boxWidth - truncatedEntry.length - 1)}┃`);
			}
		});
	}

	console.log(`┗${"━".repeat(boxWidth)}┛\x1b[0m`);
};

// Check if a file was recently processed (for debouncing)
const wasRecentlyProcessed = filePath => {
	const lastProcessed = processedFiles.get(filePath);
	const now = Date.now();

	if (lastProcessed && now - lastProcessed < DEBOUNCE_TIME) {
		return true;
	}

	// Update the last processed time
	processedFiles.set(filePath, now);

	// Clean up old entries every minute to prevent memory leaks
	if (processedFiles.size > 100) {
		for (const [path, time] of processedFiles.entries()) {
			if (now - time > 60000) {
				// Remove entries older than 1 minute
				processedFiles.delete(path);
			}
		}
	}

	return false;
};

// Watch files and directories
const setupWatchers = () => {
	printSectionDivider("SETTING UP WATCHERS");

	// Start Tailwind CSS process for the main CSS file
	log("Starting Tailwind CSS watcher...", "info");
	const tailwindWatch = spawn("npx", ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--watch"], {
		stdio: "inherit",
		shell: true
	});

	log("Tailwind CSS watcher active", "success");

	// Monitor source directories
	const watchDirs = [
		{ path: paths.source.fonts, name: "Fonts", ext: [".woff", ".woff2", ".eot", ".ttf", ".otf"] },
		{ path: paths.source.images, name: "Images", ext: [".png", ".jpg", ".jpeg", ".gif", ".svg"] },
		{ path: paths.source.styles, name: "Styles", ext: [".css"] },
		{ path: paths.source.scripts, name: "Scripts", ext: [".js"] },
		{ path: paths.source.liquidLayout, name: "Layout", ext: [".liquid"] },
		{ path: paths.source.liquidSections, name: "Sections", ext: [".liquid"] },
		{ path: paths.source.liquidSnippets, name: "Snippets", ext: [".liquid"] },
		{ path: paths.source.liquidBlocks, name: "Blocks", ext: [".liquid"] }
	];

	// Setup watchers for all directories
	watchDirs.forEach(({ path: dirPath, name, ext }) => {
		if (!fs.existsSync(dirPath)) {
			log(`Directory not found: ${name}`, "warning");
			return;
		}

		log(`Setting up watcher for ${name}`, "watch");

		// Watch the directory recursively
		watchDir(dirPath, name, ext);
	});

	log("All file watchers established", "success");
	printSectionEnd();
	log("Waiting for file changes...", "info");

	// Initial status display
	printStatusBar();
};

// Recursive directory watching
const watchDir = (dirPath, dirName, extensions) => {
	if (!fs.existsSync(dirPath)) return;

	// Watch current directory
	fs.watch(dirPath, (eventType, filename) => {
		if (!filename) return;

		const filePath = path.join(dirPath, filename);

		// Check if it's a file and has the right extension
		if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
			const ext = path.extname(filename).toLowerCase();
			if (extensions.includes(ext)) {
				// Skip if this file was just processed (debouncing)
				if (wasRecentlyProcessed(filePath)) {
					return;
				}

				// Copy the file to the destination
				const destPath = getDestination(filePath);
				if (destPath) {
					// Use async copy with retry
					copyFileWithRetry(filePath, destPath, filename, ext);
				}
			}
		}
	});

	// Watch subdirectories recursively
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	entries.forEach(entry => {
		if (entry.isDirectory()) {
			watchDir(path.join(dirPath, entry.name), dirName, extensions);
		}
	});
};

// Update the status display every minute
const startStatusUpdates = () => {
	setInterval(() => {
		updateStatusDisplay();
	}, 60000);
};

// Main execution
try {
	clearTerminal();
	printWelcomeBanner();
	setupDirectories();
	setupWatchers();
	startStatusUpdates();

	// Keep process running
	process.stdin.resume();

	// Handle exit
	process.on("SIGINT", () => {
		log("Stopping file watchers...", "info");

		// Print final summary
		printSectionDivider("WATCH SESSION SUMMARY");
		console.log(`\x1b[32m• Total time: ${stats.sessionDuration()}`);
		console.log(`• Total files processed: ${stats.totalChanges}`);

		if (stats.totalChanges > 0) {
			console.log(`• File types:`);
			for (const [ext, count] of Object.entries(stats.changesByType)) {
				if (count > 0) {
					const icon = getFileTypeIcon(ext);
					console.log(`  ${icon} ${ext}: ${count}`);
				}
			}
		}
		console.log(`\x1b[0m`);

		process.exit(0);
	});
} catch (err) {
	log(`Error: ${err.message}`, "error");
	process.exit(1);
}
