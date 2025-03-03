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

// Logging function
const log = (message, type = "info") => {
	const colors = {
		info: "\x1b[36m", // Blue
		success: "\x1b[32m", // Green
		error: "\x1b[31m", // Red
		warning: "\x1b[33m" // Yellow
	};
	console.log(`${colors[type]}${message}\x1b[0m`);
};

// Initial setup - ensure directories exist
const setupDirectories = () => {
	// Create build folder if it doesn't exist
	if (!fs.existsSync(paths.build_folder)) {
		fs.mkdirSync(paths.build_folder, { recursive: true });
		log(`Created build directory: ${paths.build_folder}`, "success");
	}

	// Create asset directories
	Object.values(paths.build).forEach(dir => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			log(`Created directory: ${dir}`, "success");
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

// Watch files and directories
const setupWatchers = () => {
	// Start Tailwind CSS process for the main CSS file
	const tailwindWatch = spawn("npx", ["tailwindcss", "-i", "./src/styles/tailwind.css", "-o", "./Curalife-Theme-Build/assets/tailwind.css", "--watch"], {
		stdio: "inherit",
		shell: true
	});

	log("Tailwind CSS watcher started", "success");

	// Monitor source directories
	const watchDirs = [
		{ path: paths.source.fonts, ext: [".woff", ".woff2", ".eot", ".ttf", ".otf"] },
		{ path: paths.source.images, ext: [".png", ".jpg", ".jpeg", ".gif", ".svg"] },
		{ path: paths.source.styles, ext: [".css"] },
		{ path: paths.source.scripts, ext: [".js"] },
		{ path: paths.source.liquidLayout, ext: [".liquid"] },
		{ path: paths.source.liquidSections, ext: [".liquid"] },
		{ path: paths.source.liquidSnippets, ext: [".liquid"] },
		{ path: paths.source.liquidBlocks, ext: [".liquid"] }
	];

	// Setup watchers for all directories
	watchDirs.forEach(({ path: dirPath, ext }) => {
		if (!fs.existsSync(dirPath)) {
			log(`Directory not found: ${dirPath}`, "warning");
			return;
		}

		log(`Setting up watcher for: ${dirPath}`, "info");

		// Watch the directory recursively
		watchDir(dirPath, ext);
	});

	log("All file watchers established", "success");
	log("Waiting for file changes...", "info");
};

// Recursive directory watching
const watchDir = (dirPath, extensions) => {
	if (!fs.existsSync(dirPath)) return;

	// Watch current directory
	fs.watch(dirPath, (eventType, filename) => {
		if (!filename) return;

		const filePath = path.join(dirPath, filename);

		// Check if it's a file and has the right extension
		if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
			const ext = path.extname(filename).toLowerCase();
			if (extensions.includes(ext)) {
				// Copy the file to the destination
				const destPath = getDestination(filePath);
				if (destPath) {
					try {
						fs.copyFileSync(filePath, destPath);
						log(`Updated: ${filename} → ${destPath}`, "success");
					} catch (err) {
						log(`Error copying file: ${err.message}`, "error");
					}
				}
			}
		}
	});

	// Watch subdirectories recursively
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	entries.forEach(entry => {
		if (entry.isDirectory()) {
			watchDir(path.join(dirPath, entry.name), extensions);
		}
	});
};

// Main execution
try {
	log("Starting Curalife Theme watcher...", "info");
	setupDirectories();
	setupWatchers();

	// Keep process running
	process.stdin.resume();

	// Handle exit
	process.on("SIGINT", () => {
		log("Stopping file watchers...", "info");
		process.exit(0);
	});
} catch (err) {
	log(`Error: ${err.message}`, "error");
	process.exit(1);
}
