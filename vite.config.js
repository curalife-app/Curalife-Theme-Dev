/**
 * Vite Configuration for Curalife Theme
 *
 * This configuration replicates the functionality of the original webpack.mix.js build,
 * but uses Vite for improved performance and modern JavaScript support.
 *
 * Key features:
 * - Flattens ALL folder structures (assets, sections, snippets, layout, blocks) as required by Shopify
 * - Processes Tailwind CSS with optimizations using @tailwindcss/vite
 * - Creates minified CSS files
 * - Optimized for production builds
 *
 * Usage:
 * - Development: `npm run dev` or `pnpm dev`
 * - Production build: `npm run build` or `pnpm build`
 * - Preview: `npm run preview` or `pnpm preview`
 * - File watching: `npm run watch` (uses the custom watch.js script for automatic rebuilds)
 */

import { defineConfig } from "vite";
import path from "path";
import postcss from "postcss";
import postcssImport from "postcss-import";
import tailwind from "@tailwindcss/vite";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import fs from "fs";
import * as globModule from "glob";

const isProduction = process.env.NODE_ENV === "production";
const isWatchMode = process.env.VITE_WATCH_MODE === "true";
const skipClean = process.env.VITE_SKIP_CLEAN === "true";
// Control logging verbosity - set to false for minimal logging
const verboseLogging = process.env.VITE_VERBOSE_LOGGING === "true";

// Console styling configuration
const STYLES = {
	// Base colors
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	italic: "\x1b[3m",
	underline: "\x1b[4m",

	// Text colors
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",

	// Bright text
	brightRed: "\x1b[91m",
	brightGreen: "\x1b[92m",
	brightYellow: "\x1b[93m",
	brightBlue: "\x1b[94m",
	brightMagenta: "\x1b[95m",
	brightCyan: "\x1b[96m",
	brightWhite: "\x1b[97m",

	// Background colors
	bgBlack: "\x1b[40m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
	bgMagenta: "\x1b[45m",
	bgCyan: "\x1b[46m",
	bgWhite: "\x1b[47m",

	// Modern symbols
	symbols: {
		check: "✓",
		cross: "✗",
		bullet: "•",
		arrow: "→",
		arrowRight: "▶",
		arrowDown: "▼",
		star: "★",
		warning: "⚠",
		info: "ℹ",
		folder: "📁",
		file: "📄",
		build: "🔨",
		watch: "👁",
		sparkles: "✨",
		gear: "⚙",
		clock: "🕒",
		checkmark: "✓",
		error: "❌",
		success: "✅",
		progress: "⏳",
		complete: "🏁",
		delete: "🗑"
	}
};

// Theme colors
const THEME = {
	primary: STYLES.cyan,
	secondary: STYLES.magenta,
	success: STYLES.brightGreen,
	error: STYLES.brightRed,
	warning: STYLES.brightYellow,
	info: STYLES.brightBlue,
	accent: STYLES.brightMagenta,
	muted: STYLES.dim
};

// Fancy console banner for the build process - more compact version
const printWelcomeBanner = () => {
	if (!verboseLogging) {
		console.log(`${THEME.primary}${STYLES.bold}${STYLES.symbols.build} CURALIFE ${isProduction ? `${THEME.success}PRODUCTION` : `${THEME.warning}DEVELOPMENT`}${THEME.primary} BUILD${STYLES.reset}`);
		return;
	}

	// Brand colors for Curalife
	const brandPrimary = THEME.primary;
	const brandSecondary = THEME.secondary;
	const brandAccent = THEME.accent;

	const date = new Date();
	const timeString = date.toLocaleTimeString();
	const dateString = date.toLocaleDateString();

	console.log(`
${STYLES.reset}${brandPrimary}╔════════════════════════════════════════════════════════════╗
║                                                            ║
${brandPrimary}║  ${brandSecondary}${STYLES.bold}CURALIFE${STYLES.reset}${brandPrimary} ${brandAccent}${STYLES.bold}THEME BUILDER${STYLES.reset}${brandPrimary}                                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${STYLES.reset}

${THEME.info}${STYLES.symbols.build}  ${STYLES.bold}Build Mode:${STYLES.reset} ${isProduction ? `${THEME.success}Production` : `${THEME.warning}Development`}
${THEME.info}${STYLES.symbols.gear}  ${STYLES.bold}Task:${STYLES.reset} ${isWatchMode ? `${THEME.info}Watch` : `${THEME.info}Build`}
${THEME.info}${STYLES.symbols.clock}  ${STYLES.bold}Time:${STYLES.reset} ${timeString} | ${dateString}
${STYLES.reset}`);
};

printWelcomeBanner();

// Define absolute paths for all directories and files - matching the webpack.mix.js structure
const paths = {
	build_folder: path.resolve(__dirname, "Curalife-Theme-Build"),
	assets: {
		fonts: path.join(__dirname, "./src", "fonts", "**/*.{woff,woff2,eot,ttf,otf}"),
		images: path.join(__dirname, "./src", "images", "**/*.{png,jpg,jpeg,gif,svg}"),
		css: path.join(__dirname, "./src", "styles", "css", "**"),
		scripts: path.join(__dirname, "./src", "scripts", "**/*.js"),
		tailwind: path.join(__dirname, "./src", "styles", "tailwind.css")
	},
	liquid: {
		layout: path.join(__dirname, "./src", "liquid", "layout", "**"),
		sections: path.join(__dirname, "./src", "liquid", "sections", "**/*.liquid"),
		snippets: path.join(__dirname, "./src", "liquid", "snippets", "**/*.liquid"),
		blocks: path.join(__dirname, "./src", "liquid", "blocks", "**/*.liquid"),
		templates: path.join(__dirname, "./src", "liquid", "templates", "**/*.liquid")
	},
	locales: path.join(__dirname, "./src", "locales", "**/*.json"),
	config: path.join(__dirname, "./src", "config", "**/*.json"),
	build: {
		assets: path.join(__dirname, "Curalife-Theme-Build", "assets"),
		layout: path.join(__dirname, "Curalife-Theme-Build", "layout"),
		sections: path.join(__dirname, "Curalife-Theme-Build", "sections"),
		snippets: path.join(__dirname, "Curalife-Theme-Build", "snippets"),
		blocks: path.join(__dirname, "Curalife-Theme-Build", "blocks"),
		templates: path.join(__dirname, "Curalife-Theme-Build", "templates"),
		locales: path.join(__dirname, "Curalife-Theme-Build", "locales"),
		config: path.join(__dirname, "Curalife-Theme-Build", "config")
	}
};

// Enhanced logging function with improved visual styling
const log = (message, type = "info", importance = "normal") => {
	// Skip detailed logs if not in verbose mode, unless they are important
	if (!verboseLogging && importance === "detail") return;

	// Define symbols and colors for different log types
	const logStyles = {
		info: { color: THEME.info, symbol: STYLES.symbols.info },
		success: { color: THEME.success, symbol: STYLES.symbols.success },
		error: { color: THEME.error, symbol: STYLES.symbols.error },
		warning: { color: THEME.warning, symbol: STYLES.symbols.warning },
		header: { color: THEME.accent, symbol: STYLES.symbols.star },
		detail: { color: THEME.muted, symbol: STYLES.symbols.bullet },
		path: { color: THEME.primary, symbol: STYLES.symbols.arrow }
	};

	const style = logStyles[type] || logStyles.info;

	// Format the message with appropriate styling
	console.log(`${style.color}${style.symbol} ${message}${STYLES.reset}`);
};

// Print a fancy section divider - more compact version
const printSectionDivider = title => {
	if (!verboseLogging) {
		console.log(`\n${THEME.secondary}${STYLES.bold}${STYLES.symbols.arrowRight} ${title} ${STYLES.reset}\n`);
		return;
	}

	const titleLine = ` ${title} `;
	const padding = 65 - titleLine.length;
	const leftPad = "═".repeat(Math.floor(padding / 2));
	const rightPad = "═".repeat(Math.ceil(padding / 2));

	console.log(`\n${THEME.muted}${leftPad}${STYLES.reset}${THEME.secondary}${STYLES.bold}${titleLine}${STYLES.reset}${THEME.muted}${rightPad}${STYLES.reset}\n`);
};

// Enhanced build summary with improved visual design
const printBuildSummary = (startTime, totalFiles) => {
	const endTime = new Date();
	const elapsedMs = endTime - startTime;
	const elapsedSec = (elapsedMs / 1000).toFixed(2);

	const filesPerSecond = totalFiles > 0 ? (totalFiles / (elapsedMs / 1000)).toFixed(2) : 0;

	if (!verboseLogging) {
		log(`${STYLES.bold}Build completed in ${elapsedSec}s${STYLES.reset} (${totalFiles} files, ${filesPerSecond}/s)`, "success");
		return;
	}

	console.log(`
${THEME.success}╔════════════════════════════════════════════════════════════╗
║                    ${STYLES.bold}BUILD COMPLETED${STYLES.reset}${THEME.success}                      ║
╚════════════════════════════════════════════════════════════╝${STYLES.reset}

${THEME.primary}${STYLES.symbols.checkmark}  ${STYLES.bold}Time:${STYLES.reset} ${elapsedSec} seconds
${THEME.primary}${STYLES.symbols.file}  ${STYLES.bold}Files:${STYLES.reset} ${totalFiles} processed
${THEME.primary}${STYLES.symbols.gear}  ${STYLES.bold}Speed:${STYLES.reset} ${filesPerSecond} files/second

${THEME.success}${STYLES.symbols.sparkles} ${STYLES.bold}Successfully completed all tasks!${STYLES.reset}
`);
};

// Handle post-build minification of Tailwind CSS
const createMinifiedCss = async () => {
	try {
		const outputPath = path.join(paths.build.assets, "tailwind.css");
		const minPath = path.join(paths.build.assets, "tailwind.min.css");

		if (fs.existsSync(outputPath)) {
			log("Processing CSS", "info");

			const css = fs.readFileSync(outputPath, "utf8");
			const startSize = Buffer.byteLength(css, "utf8") / 1024;

			// Skip minification in watch mode
			if (isWatchMode) {
				log("Skipping CSS minification in watch mode", "info");
				return true;
			}

			// Use cssnano directly to minify the file
			const result = await postcss([
				cssnano({
					preset: [
						"default",
						{
							discardComments: { removeAll: true },
							reduceIdents: false,
							reduceInitial: false,
							zindex: false,
							mergeIdents: false
						}
					]
				})
			]).process(css, { from: outputPath, to: minPath });

			fs.writeFileSync(minPath, result.css);

			const endSize = Buffer.byteLength(result.css, "utf8") / 1024;
			const reduction = (((startSize - endSize) / startSize) * 100).toFixed(1);

			log(`CSS: ${startSize.toFixed(1)}KB → ${endSize.toFixed(1)}KB (${reduction}%)`, "success");
			return true;
		} else {
			log("CSS file not found", "warning");
			return false;
		}
	} catch (error) {
		log(`CSS Error: ${error.message}`, "error");
		return false;
	}
};

// Helper function to find files recursively
const findFiles = (directory, pattern) => {
	// Using glob.sync with a function that works in ESM
	return globModule.sync(path.join(directory, pattern));
};

// Flatten a file path - extract only the filename
const flattenPath = filePath => {
	return path.basename(filePath);
};

// Clean directory with improved visual feedback
const cleanDirectory = (directory, preserveFilters = []) => {
	// Skip cleaning in watch mode if VITE_SKIP_CLEAN is true
	if (skipClean) {
		log(`Skipping clean for ${path.basename(directory)} in watch mode`, "info");
		return { removed: 0, preserved: 0 };
	}

	if (!fs.existsSync(directory)) {
		return { removed: 0, preserved: 0 };
	}

	try {
		const files = fs.readdirSync(directory);
		const dirName = path.basename(directory);
		let preservedCount = 0;
		let removedCount = 0;

		// Show clean operation header
		if (verboseLogging && files.length > 0) {
			console.log(`${THEME.muted}Cleaning directory: ${STYLES.reset}${STYLES.bold}${dirName}${STYLES.reset}`);
		}

		for (const file of files) {
			const fullPath = path.join(directory, file);

			// Check if this file/directory should be preserved
			const shouldPreserve = preserveFilters.some(filter => {
				if (typeof filter === "function") return filter(file);
				return file === filter || file.includes(filter);
			});

			if (shouldPreserve) {
				preservedCount++;
				if (verboseLogging) {
					console.log(`  ${THEME.info}${STYLES.symbols.bullet} ${STYLES.reset}${STYLES.italic}Preserving:${STYLES.reset} ${file}`);
				}
				continue;
			}

			if (fs.lstatSync(fullPath).isDirectory()) {
				fs.rmSync(fullPath, { recursive: true, force: true });
			} else {
				fs.unlinkSync(fullPath);
			}
			removedCount++;

			if (verboseLogging) {
				console.log(`  ${THEME.error}${STYLES.symbols.delete} ${STYLES.reset}${STYLES.italic}Removing:${STYLES.reset} ${file}`);
			}
		}

		// Show clean operation summary with visual elements
		if (removedCount > 0 || preservedCount > 0) {
			log(`Cleaned: ${STYLES.bold}${dirName}${STYLES.reset} (${removedCount} removed, ${preservedCount} preserved)`, "success");
		}
		return { removed: removedCount, preserved: preservedCount };
	} catch (error) {
		log(`Error cleaning directory ${directory}: ${error.message}`, "error");
		return { removed: 0, preserved: 0, error: true };
	}
};

// Simplified progress bar with improved visual styling
const createProgressBar = (total, title) => {
	if (total === 0) return { increment: () => {}, finish: () => {} };

	let current = 0;
	const barWidth = 30;

	// Choose appropriate colors based on file type
	let color = THEME.info;
	if (title.toLowerCase().includes("css")) color = THEME.primary;
	if (title.toLowerCase().includes("script")) color = THEME.secondary;
	if (title.toLowerCase().includes("image")) color = THEME.accent;

	return {
		increment: () => {
			current++;
			if (verboseLogging) {
				const percent = Math.floor((current / total) * 100);
				const chars = Math.floor((current / total) * barWidth);
				const bar = "█".repeat(chars) + "░".repeat(barWidth - chars);

				process.stdout.write(`\r${color}${STYLES.symbols.progress} ${title}: ${STYLES.reset}${bar} ${color}${percent}%${STYLES.reset}`);
			}
		},
		finish: () => {
			if (verboseLogging) {
				const bar = "█".repeat(barWidth);
				process.stdout.write(`\r${color}${STYLES.symbols.complete} ${title}: ${STYLES.reset}${bar} ${color}100%${STYLES.reset}\n`);
			}
		}
	};
};

// Custom plugin for file copying
const createCopyPlugin = () => {
	// Store the start time and file counter
	const buildStartTime = new Date();
	let totalFilesProcessed = 0;

	return {
		name: "custom-copy-plugin",
		buildStart() {
			printSectionDivider("STARTING CURALIFE THEME BUILD");
			log("Initializing build process", "header");

			// We'll skip the cleaning here since it's handled by the selective-clean plugin
			// This prevents double-cleaning and makes the process more efficient
		},
		async closeBundle() {
			// Create the necessary directories
			const dirs = [paths.build.assets, paths.build.layout, paths.build.sections, paths.build.snippets, paths.build.blocks, paths.build.templates, paths.build.locales, paths.build.config];

			// Create missing directories silently
			for (const dir of dirs) {
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
					log(`Created directory: ${dir}`, "success", "detail");
				}
			}

			// Initialize file arrays to track processed files
			let fontFiles = [];
			let imageFiles = [];
			let cssFiles = [];
			let scriptFiles = [];
			let layoutFiles = [];
			let sectionFiles = [];
			let snippetFiles = [];
			let blockFiles = [];

			// Track total files for summary
			let totalProcessedFiles = 0;

			// Copy files - fonts (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/fonts"))) {
				try {
					fontFiles = findFiles(path.join(__dirname, "src/fonts"), "**/*.{woff,woff2,eot,ttf,otf}");

					if (fontFiles.length > 0) {
						totalProcessedFiles += fontFiles.length;
						log(`Processing ${fontFiles.length} font files`, "info", "detail");
						const progressBar = createProgressBar(fontFiles.length, "Fonts");

						for (const file of fontFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.assets, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					// Simplify success message to be more concise
					if (fontFiles.length > 0) {
						log(`Fonts: ${fontFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying fonts: ${e.message}`, "error");
				}
			}

			// Copy files - images (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/images"))) {
				try {
					imageFiles = findFiles(path.join(__dirname, "src/images"), "**/*.{png,jpg,jpeg,gif,svg}");

					if (imageFiles.length > 0) {
						totalProcessedFiles += imageFiles.length;
						log(`Processing ${imageFiles.length} image files`, "info", "detail");
						const progressBar = createProgressBar(imageFiles.length, "Images");

						for (const file of imageFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.assets, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (imageFiles.length > 0) {
						log(`Images: ${imageFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying images: ${e.message}`, "error");
				}
			}

			// Copy files - CSS (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/styles/css"))) {
				try {
					cssFiles = findFiles(path.join(__dirname, "src/styles/css"), "**/*");

					if (cssFiles.length > 0) {
						totalProcessedFiles += cssFiles.length;
						log(`Processing ${cssFiles.length} CSS files`, "info", "detail");
						const progressBar = createProgressBar(cssFiles.length, "CSS");

						for (const file of cssFiles) {
							if (fs.statSync(file).isFile()) {
								// Flatten the path - just use the filename
								const flatFile = flattenPath(file);
								const destPath = path.join(paths.build.assets, flatFile);

								fs.copyFileSync(file, destPath);
								progressBar.increment();
							}
						}
						progressBar.finish();
					}

					if (cssFiles.length > 0) {
						log(`CSS: ${cssFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying CSS: ${e.message}`, "error");
				}
			}

			// Copy files - JS Scripts (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/scripts"))) {
				try {
					scriptFiles = findFiles(path.join(__dirname, "src/scripts"), "**/*.js");

					if (scriptFiles.length > 0) {
						totalProcessedFiles += scriptFiles.length;
						log(`Processing ${scriptFiles.length} script files`, "info", "detail");
						const progressBar = createProgressBar(scriptFiles.length, "Scripts");

						for (const file of scriptFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.assets, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (scriptFiles.length > 0) {
						log(`Scripts: ${scriptFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying scripts: ${e.message}`, "error");
				}
			}

			// Copy files - liquid layout (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/liquid/layout"))) {
				try {
					layoutFiles = findFiles(path.join(__dirname, "src/liquid/layout"), "**/*");

					if (layoutFiles.length > 0) {
						totalProcessedFiles += layoutFiles.length;
						log(`Processing ${layoutFiles.length} layout files`, "info", "detail");
						const progressBar = createProgressBar(layoutFiles.length, "Layout");

						for (const file of layoutFiles) {
							if (fs.statSync(file).isFile()) {
								// For layout files, we keep the base name
								const flatFile = flattenPath(file);
								const destPath = path.join(paths.build.layout, flatFile);

								fs.copyFileSync(file, destPath);
								progressBar.increment();
							}
						}
						progressBar.finish();
					}

					if (layoutFiles.length > 0) {
						log(`Layout: ${layoutFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying layout: ${e.message}`, "error");
				}
			}

			// Copy files - liquid sections (FLATTEN structure for sections files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/sections"))) {
				try {
					sectionFiles = findFiles(path.join(__dirname, "src/liquid/sections"), "**/*.liquid");

					if (sectionFiles.length > 0) {
						totalProcessedFiles += sectionFiles.length;
						log(`Processing ${sectionFiles.length} section files`, "info", "detail");
						const progressBar = createProgressBar(sectionFiles.length, "Sections");

						for (const file of sectionFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.sections, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (sectionFiles.length > 0) {
						log(`Sections: ${sectionFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying sections: ${e.message}`, "error");
				}
			}

			// Copy files - liquid snippets (FLATTEN structure for snippets files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/snippets"))) {
				try {
					snippetFiles = findFiles(path.join(__dirname, "src/liquid/snippets"), "**/*.liquid");

					if (snippetFiles.length > 0) {
						totalProcessedFiles += snippetFiles.length;
						log(`Processing ${snippetFiles.length} snippet files`, "info", "detail");
						const progressBar = createProgressBar(snippetFiles.length, "Snippets");

						for (const file of snippetFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.snippets, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (snippetFiles.length > 0) {
						log(`Snippets: ${snippetFiles.length} files`, "success");
					}
				} catch (e) {
					log(`Error copying snippets: ${e.message}`, "error");
				}
			}

			// Copy files - liquid blocks (FLATTEN structure for blocks files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/blocks"))) {
				try {
					blockFiles = findFiles(path.join(__dirname, "src/liquid/blocks"), "**/*.liquid");

					if (blockFiles.length > 0) {
						totalProcessedFiles += blockFiles.length;
						log(`Processing ${blockFiles.length} block files`, "info", "detail");
						const progressBar = createProgressBar(blockFiles.length, "Blocks");

						for (const file of blockFiles) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.blocks, flatFile);

							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (blockFiles.length > 0) {
						log(`Blocks: ${blockFiles.length} files`, "success");
					} else {
						log("No blocks found", "info");
					}
				} catch (e) {
					log(`Error copying blocks: ${e.message}`, "error");
				}
			} else {
				log("No blocks directory found, skipping", "info");
			}

			// Copy files - liquid templates (keep structure for template files)
			let templateFiles = [];
			if (fs.existsSync(path.join(__dirname, "src/liquid/templates"))) {
				try {
					templateFiles = findFiles(path.join(__dirname, "src/liquid/templates"), "**/*.liquid");

					if (templateFiles.length > 0) {
						totalProcessedFiles += templateFiles.length;
						log(`Processing ${templateFiles.length} template files`, "info", "detail");
						const progressBar = createProgressBar(templateFiles.length, "Templates");

						for (const file of templateFiles) {
							// Get the relative path within the templates directory
							const relativePath = path.relative(path.join(__dirname, "src/liquid/templates"), file);
							const destPath = path.join(paths.build.templates, relativePath);

							// Ensure the destination directory exists
							fs.mkdirSync(path.dirname(destPath), { recursive: true });
							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (templateFiles.length > 0) {
						log(`Templates: ${templateFiles.length} files`, "success");
					} else {
						log("No templates found", "info");
					}
				} catch (e) {
					log(`Error copying templates: ${e.message}`, "error");
				}
			} else {
				log("No templates directory found, skipping", "info");
			}

			// Copy files - locales (keep structure)
			let localeFiles = [];
			if (fs.existsSync(path.join(__dirname, "src/locales"))) {
				try {
					localeFiles = findFiles(path.join(__dirname, "src/locales"), "**/*.json");

					if (localeFiles.length > 0) {
						totalProcessedFiles += localeFiles.length;
						log(`Processing ${localeFiles.length} locale files`, "info", "detail");
						const progressBar = createProgressBar(localeFiles.length, "Locales");

						for (const file of localeFiles) {
							// Keep the same structure as in src
							const relativePath = path.relative(path.join(__dirname, "src/locales"), file);
							const destPath = path.join(paths.build.locales, relativePath);

							// Ensure the destination directory exists
							fs.mkdirSync(path.dirname(destPath), { recursive: true });
							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (localeFiles.length > 0) {
						log(`Locales: ${localeFiles.length} files`, "success");
					} else {
						log("No locale files found", "info");
					}
				} catch (e) {
					log(`Error copying locales: ${e.message}`, "error");
				}
			} else {
				log("No locales directory found, skipping", "info");
			}

			// Copy files - config (keep structure)
			let configFiles = [];
			if (fs.existsSync(path.join(__dirname, "src/config"))) {
				try {
					configFiles = findFiles(path.join(__dirname, "src/config"), "**/*.json");

					if (configFiles.length > 0) {
						totalProcessedFiles += configFiles.length;
						log(`Processing ${configFiles.length} config files`, "info", "detail");
						const progressBar = createProgressBar(configFiles.length, "Config");

						for (const file of configFiles) {
							// Keep the same structure as in src
							const relativePath = path.relative(path.join(__dirname, "src/config"), file);
							const destPath = path.join(paths.build.config, relativePath);

							// Ensure the destination directory exists
							fs.mkdirSync(path.dirname(destPath), { recursive: true });
							fs.copyFileSync(file, destPath);
							progressBar.increment();
						}
						progressBar.finish();
					}

					if (configFiles.length > 0) {
						log(`Config: ${configFiles.length} files`, "success");
					} else {
						log("No config files found", "info");
					}
				} catch (e) {
					log(`Error copying config: ${e.message}`, "error");
				}
			} else {
				log("No config directory found, skipping", "info");
			}

			log("Build completed successfully!", "success");

			// Process Tailwind CSS separately
			await createMinifiedCss();

			// Final build completion message
			printBuildSummary(buildStartTime, totalProcessedFiles);

			// Add a final success message at the very end
			const currentTime = new Date().toLocaleTimeString();
			log(`✓ Ready at ${currentTime}`, "header");
		}
	};
};

const copyFiles = (sourceDir, pattern, destDir) => {
	if (!fs.existsSync(sourceDir)) return;

	try {
		const files = findFiles(sourceDir, pattern);
		for (const file of files) {
			if (!fs.statSync(file).isFile()) continue;
			const flatFile = flattenPath(file);
			const destPath = path.join(destDir, flatFile);
			fs.copyFileSync(file, destPath);
		}
		log(`Copied files from ${sourceDir} (flattened)`, "success");
	} catch (e) {
		log(`Error copying from ${sourceDir}: ${e.message}`, "error");
	}
};

// Custom plugin for file watching
const createWatchPlugin = () => {
	return {
		name: "custom-watch-plugin",
		apply: "serve", // Only apply during development
		configureServer(server) {
			if (!isWatchMode) return;

			// Create a visually appealing watch mode start message
			console.log(`
${THEME.info}╔════════════════════════════════════════════════════════════╗
║                    ${STYLES.bold}WATCH MODE ACTIVE${STYLES.reset}${THEME.info}                     ║
╚════════════════════════════════════════════════════════════╝${STYLES.reset}

${THEME.primary}${STYLES.symbols.watch}  ${STYLES.bold}Watching for file changes...${STYLES.reset}
${THEME.muted}Changes will be automatically processed and deployed${STYLES.reset}
`);

			// Create cache manager instance for watch mode
			const watchCacheManager = createCacheManager();

			// Create watch patterns from source directories with optimized globbing
			const watchPatterns = sourceDirectories.map(({ dir, pattern }) => path.join(dir, pattern).replace(/\\/g, "/"));

			// Add watchers for all patterns with improved config
			let watcher = server.watcher;

			// Override watcher configuration for better reliability
			watcher.options = {
				...watcher.options,
				usePolling: true,
				interval: 300,
				batchDelay: 50,
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50
				},
				alwaysStat: true,
				ignoreInitial: true
			};

			watchPatterns.forEach(pattern => {
				watcher.add(pattern);
			});

			// Debounce function to avoid processing the same file multiple times
			const debounceMap = new Map();

			// Handle file events (both change and add) with debouncing
			const handleFileEvent = (filePath, event) => {
				const key = `${filePath}-${event}`;

				// Clear any existing timeout for this file+event
				if (debounceMap.has(key)) {
					clearTimeout(debounceMap.get(key));
				}

				// Set a new timeout
				const timeoutId = setTimeout(() => {
					processFileChange(filePath, event, watchCacheManager);
					debounceMap.delete(key);
				}, 100);

				debounceMap.set(key, timeoutId);
			};

			// Set up event handlers
			watcher.on("change", filePath => {
				handleFileEvent(filePath, "change");
			});

			watcher.on("add", filePath => {
				handleFileEvent(filePath, "add");
			});

			watcher.on("unlink", filePath => {
				console.log(`${THEME.warning}${STYLES.symbols.delete} Deleted:${STYLES.reset} ${STYLES.bold}${path.basename(filePath)}${STYLES.reset}`);

				// Process deletion events
				const key = `${filePath}-unlink`;
				if (debounceMap.has(key)) {
					clearTimeout(debounceMap.get(key));
				}

				const timeoutId = setTimeout(() => {
					// Try to determine the destination path and delete it
					try {
						const relativePath = path.relative(path.resolve(__dirname, "src"), filePath);
						// Find which directory pattern this file belongs to
						for (const { dir, destDir } of sourceDirectories) {
							const dirRelative = path.relative(path.resolve(__dirname, "src"), dir);
							if (relativePath.startsWith(dirRelative)) {
								const fileName = path.basename(filePath);
								const destPath = path.join(destDir, fileName);

								if (fs.existsSync(destPath)) {
									fs.unlinkSync(destPath);
									console.log(`${THEME.success} Deleted from build: ${fileName}`);
								}
								break;
							}
						}
					} catch (err) {
						console.error(`Error processing deletion: ${err.message}`);
					}

					debounceMap.delete(key);
				}, 100);

				debounceMap.set(key, timeoutId);
			});

			log(`Enhanced file watchers established for all source directories`, "success");
		}
	};
};

// Main Vite configuration
export default defineConfig(({ command, mode }) => {
	// Set isWatchMode based on command or environment variable
	const isWatchMode = command === "serve" || process.env.VITE_WATCH_MODE === "true";

	// Log the mode for clarity
	log(`Running in ${isWatchMode ? "watch" : "build"} mode with ${isProduction ? "production" : "development"} settings`, "info");

	return {
		// Base configuration
		root: path.resolve(__dirname, "src"),
		base: "/",

		// Build configuration
		build: {
			outDir: path.resolve(__dirname, "Curalife-Theme-Build"),
			emptyOutDir: false, // We'll handle directory cleaning ourselves
			assetsDir: "assets",
			sourcemap: !isProduction,
			minify: isProduction,
			cssCodeSplit: true,

			// Output CSS to assets directory with flattened structure
			rollupOptions: {
				input: {
					tailwind: path.resolve(__dirname, "src/styles/tailwind.css")
				},
				output: {
					entryFileNames: "assets/[name].js",
					chunkFileNames: "assets/[name].js",
					assetFileNames: "assets/[name].[ext]"
				},
				// Add a plugin to preserve specific directories during the build process
				plugins: [
					{
						name: "selective-clean",
						buildStart() {
							// Skip cleaning if in watch mode or skipClean is true
							if (skipClean) {
								log("Skipping directory cleaning in watch mode", "info");
								return;
							}

							log("Selectively cleaning build directory", "info");

							// Define directories to preserve
							const preserveDirs = ["templates", "locales", "config"];

							// Define directories to clean
							const cleanDirs = ["assets", "layout", "sections", "snippets", "blocks"];

							// Track preserved files
							let preservedFiles = [];

							// Clean only specified directories
							cleanDirs.forEach(dir => {
								const dirPath = path.join(paths.build_folder, dir);
								if (fs.existsSync(dirPath)) {
									// Get all files and directories
									const entries = fs.readdirSync(dirPath);

									// Count how many files were removed and preserved
									let filesRemoved = 0;

									// Remove each file/directory
									entries.forEach(entry => {
										const entryPath = path.join(dirPath, entry);

										// Skip files in sections directory that contain "group" in their names
										if (dir === "sections" && entry.toLowerCase().includes("group")) {
											preservedFiles.push(entry);
											return;
										}

										if (fs.lstatSync(entryPath).isDirectory()) {
											fs.rmSync(entryPath, { recursive: true, force: true });
										} else {
											fs.unlinkSync(entryPath);
										}
										filesRemoved++;
									});

									log(`Cleaned: ${dir} (${filesRemoved} files removed)`, "success");
								}
							});

							// Log which directories are being preserved
							log(`Preserving folders: ${preserveDirs.join(", ")}`, "info");

							// Log preserved files count
							if (preservedFiles.length > 0) {
								log(`Preserved ${preservedFiles.length} group files in sections`, "success");
								// Only log individual files in verbose mode
								if (verboseLogging) {
									preservedFiles.forEach(file => {
										log(`Preserved: ${file}`, "detail", "detail");
									});
								}
							}
						}
					}
				]
			}
		},

		// CSS configuration
		css: {
			postcss: {
				plugins: [
					postcssImport(),
					autoprefixer(),
					...(isProduction
						? [
								cssnano({
									preset: [
										"default",
										{
											discardComments: {
												removeAll: true
											},
											normalizeWhitespace: false
										}
									]
								})
							]
						: [])
				]
			}
		},

		plugins: [
			// Add Tailwind CSS Vite plugin
			tailwind({
				config: path.resolve(__dirname, "tailwind.config.js")
			}),
			createCopyPlugin(),
			createWatchPlugin() // Add our custom watch plugin
		],

		// Configure server for development
		server: {
			watch: {
				usePolling: true,
				interval: 300, // Reduced interval for faster detection
				batchDelay: 50, // Add a short delay to batch multiple changes
				ignored: ["node_modules/**", "Curalife-Theme-Build/**", ".git/**"]
			},
			hmr: {
				overlay: true,
				timeout: 5000 // Increased timeout for slower systems
			},
			open: true,
			cors: true
		}
	};
});
