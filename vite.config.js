/**
 * Vite Configuration for Curalife Theme
 *
 * This configuration replicates the functionality of the original webpack.mix.js build,
 * but uses Vite for improved performance and modern JavaScript support.
 *
 * Key features:
 * - Flattens ALL folder structures (assets, sections, snippets, layout, blocks) as required by Shopify
 * - Processes Tailwind CSS with optimizations
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
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import fs from "fs";
import glob from "glob";

const isProduction = process.env.NODE_ENV === "production";

// Fancy console banner for the build process - more compact version
const printWelcomeBanner = () => {
	const boxWidth = 60;
	console.log(`
\x1b[35m┏${"━".repeat(boxWidth)}┓
┃${" ".repeat(boxWidth)}┃
┃${" ".repeat(Math.floor((boxWidth - 23) / 2))}\x1b[33m𝘾𝙐𝙍𝘼𝙇𝙄𝙁𝙀 \x1b[32m𝘽𝙐𝙄𝙇𝘿\x1b[35m${" ".repeat(Math.ceil((boxWidth - 23) / 2))}┃
┃${" ".repeat(boxWidth)}┃
┗${"━".repeat(boxWidth)}┛
\x1b[36m
  🔮 ${isProduction ? "\x1b[32mProduction" : "\x1b[33mDevelopment"} Build
  📦 Shopify Theme Builder
  ⏱️  ${new Date().toLocaleTimeString()}
\x1b[0m`);
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
		blocks: path.join(__dirname, "./src", "liquid", "blocks", "**/*.liquid")
	},
	build: {
		assets: path.join(__dirname, "Curalife-Theme-Build", "assets"),
		layout: path.join(__dirname, "Curalife-Theme-Build", "layout"),
		sections: path.join(__dirname, "Curalife-Theme-Build", "sections"),
		snippets: path.join(__dirname, "Curalife-Theme-Build", "snippets"),
		blocks: path.join(__dirname, "Curalife-Theme-Build", "blocks")
	}
};

// Logging function to streamline messages - modified to show only filenames, not full paths
const log = (message, type = "info") => {
	const colors = {
		info: "\x1b[36m", // Cyan
		success: "\x1b[32m", // Green
		error: "\x1b[31m", // Red
		warning: "\x1b[33m", // Yellow
		header: "\x1b[35m", // Magenta
		detail: "\x1b[90m", // Gray
		path: "\x1b[94m" // Light Blue for paths
	};

	const icons = {
		info: "ℹ️ ",
		success: "✅ ",
		error: "❌ ",
		warning: "⚠️ ",
		header: "🚀 ",
		detail: "  → ",
		path: "📄 "
	};

	// Simplify paths for cleaner output
	let displayMessage = message;
	if (message.includes("\\")) {
		// Extract just the filename from paths
		const parts = message.split("\\");
		const filename = parts[parts.length - 1];
		displayMessage = message.replace(
			/C:\\Users\\yotam\\Desktop\\Curalife Projects\\Curalife-Theme-Dev\\Curalife-Theme-Build\\[^\\]+/g,
			match => `output: ${colors.path}${filename}\x1b[0m${colors[type]}`
		);
	}

	console.log(`${colors[type]}${icons[type]}${displayMessage}\x1b[0m`);
};

// Print a fancy section divider - more compact version
const printSectionDivider = title => {
	const boxWidth = 60;
	log("", "detail");
	log(`┏${"━".repeat(boxWidth)}┓`, "header");
	log(`┃ ${title.padEnd(boxWidth - 2, " ")} ┃`, "header");
	log(`┗${"━".repeat(boxWidth)}┛`, "header");
};

// Print build summary with more compact format
const printBuildSummary = (startTime, totalFiles) => {
	const boxWidth = 60; // Smaller box for more compact display
	const endTime = new Date();
	const buildTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);
	log("", "detail");
	log(`┏${"━".repeat(boxWidth)}┓`, "success");
	log(`┃ ${" BUILD COMPLETED ".padEnd(boxWidth - 2, " ")} ┃`, "success");
	log(`┃ ${" ".repeat(boxWidth - 2)} ┃`, "success");
	log(`┃  ⏱️  Time: ${buildTimeSeconds}s ${" ".repeat(boxWidth - 12 - buildTimeSeconds.length)} ┃`, "success");
	log(`┃  📦 Files: ${totalFiles} ${" ".repeat(boxWidth - 12 - totalFiles.toString().length)} ┃`, "success");
	log(`┗${"━".repeat(boxWidth)}┛`, "success");
	log("", "detail");
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
	return glob.sync(path.join(directory, pattern));
};

// Flatten a file path - extract only the filename
const flattenPath = filePath => {
	return path.basename(filePath);
};

// Helper to recursively delete a directory but keep the parent
const cleanDirectory = directory => {
	if (fs.existsSync(directory)) {
		const files = fs.readdirSync(directory);

		// Get directory name for cleaner output
		const dirName = path.basename(directory);

		files.forEach(file => {
			const fullPath = path.join(directory, file);

			// Skip files in sections directory that contain "group" in their names
			if (directory === paths.build.sections && file.toLowerCase().includes("group")) {
				log(`Preserving: ${file}`, "info");
				return;
			}

			if (fs.lstatSync(fullPath).isDirectory()) {
				// Recursively delete directories
				fs.rmSync(fullPath, { recursive: true, force: true });
			} else {
				// Delete files
				fs.unlinkSync(fullPath);
			}
		});

		log(`Cleaned: ${dirName}`, "success");
	}
};

// File operation progress tracker - enhanced for more compact display
const createProgressBar = (total, title) => {
	let current = 0;
	const barWidth = 30; // Shorter bar width for more compact display

	return {
		increment: () => {
			current++;
			const percent = Math.floor((current / total) * 100);
			const chars = Math.floor((current / total) * barWidth);
			const bar = "█".repeat(chars) + "░".repeat(barWidth - chars);

			// Use carriage return for inline updates
			process.stdout.write(`\r\x1b[36m🔄 ${title}: \x1b[0m${bar} \x1b[32m${percent}%\x1b[0m`);

			if (current === total) {
				process.stdout.write("\n");
			}
		},
		finish: () => {
			if (current < total) {
				current = total;
				const bar = "█".repeat(barWidth);
				process.stdout.write(`\r\x1b[36m✓ ${title}: \x1b[0m${bar} \x1b[32m100%\x1b[0m\n`);
			}
		},
		// New summary method that just shows the completed count
		summary: () => {
			return `Processed ${total} files`;
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
			log("Cleaning directories to prepare for build", "info");

			// Clean directories to ensure they're completely flat
			if (fs.existsSync(paths.build.assets)) {
				cleanDirectory(paths.build.assets);
			}
			if (fs.existsSync(paths.build.sections)) {
				cleanDirectory(paths.build.sections);
			}
			if (fs.existsSync(paths.build.snippets)) {
				cleanDirectory(paths.build.snippets);
			}
			if (fs.existsSync(paths.build.layout)) {
				cleanDirectory(paths.build.layout);
			}
			if (fs.existsSync(paths.build.blocks)) {
				cleanDirectory(paths.build.blocks);
			}
		},
		async closeBundle() {
			// Create the necessary directories
			const dirs = [paths.build.assets, paths.build.layout, paths.build.sections, paths.build.snippets, paths.build.blocks];

			for (const dir of dirs) {
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
					log(`Created directory: ${dir}`, "success");
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

			// Copy files - fonts (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/fonts"))) {
				try {
					fontFiles = findFiles(path.join(__dirname, "src/fonts"), "**/*.{woff,woff2,eot,ttf,otf}");

					if (fontFiles.length > 0) {
						log(`Processing ${fontFiles.length} font files`, "info");
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
						log(`Processing ${imageFiles.length} image files`, "info");
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
						log(`Processing ${cssFiles.length} CSS files`, "info");
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
						log(`Processing ${scriptFiles.length} script files`, "info");
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
						log(`Processing ${layoutFiles.length} layout files`, "info");
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
						log(`Processing ${sectionFiles.length} section files`, "info");
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
						log(`Processing ${snippetFiles.length} snippet files`, "info");
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
						log(`Processing ${blockFiles.length} block files`, "info");
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

			// Update with processed files count
			totalFilesProcessed +=
				fontFiles.length + imageFiles.length + cssFiles.length + scriptFiles.length + layoutFiles.length + sectionFiles.length + snippetFiles.length + (blockFiles ? blockFiles.length : 0);

			log("Build completed successfully!", "success");

			// Process Tailwind CSS separately
			await createMinifiedCss();

			// Final build completion message
			printBuildSummary(buildStartTime, totalFilesProcessed);

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

// Main Vite configuration
export default defineConfig(({ command, mode }) => {
	const isProduction = mode === "production";
	const isWatchMode = process.argv.includes("--watch") || command === "serve";

	log(`Starting Vite build in ${isProduction ? "production" : "development"} mode${isWatchMode ? " with file watching" : ""}...`);

	// Create build folder if it doesn't exist
	if (!fs.existsSync(paths.build_folder)) {
		fs.mkdirSync(paths.build_folder, { recursive: true });
		log(`Created build directory: ${paths.build_folder}`, "success");
	}

	return {
		// Set the build output directory to match webpack.mix.js
		build: {
			outDir: paths.build_folder,
			emptyOutDir: false, // Don't empty the output directory
			minify: isProduction ? "terser" : false,
			sourcemap: false,
			target: ["es2015", "edge88", "firefox78", "chrome87", "safari13"],
			reportCompressedSize: isProduction,
			chunkSizeWarningLimit: 500,
			rollupOptions: {
				input: {
					tailwind: paths.assets.tailwind
				},
				output: {
					entryFileNames: "assets/[name].js",
					chunkFileNames: "assets/[name]-[hash].js",
					assetFileNames: "assets/[name].[ext]",
					manualChunks: id => {
						if (id.includes("node_modules")) return "vendor";
					}
				}
			}
		},

		// CSS processing with Tailwind - matches the webpack.mix.js setup
		css: {
			postcss: {
				plugins: [
					postcssImport(),
					tailwindcss("./tailwind.config.js"),
					autoprefixer(),
					isProduction &&
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
				].filter(Boolean)
			},
			devSourcemap: !isProduction
		},

		// Use our custom file copying plugin instead of vite-plugin-static-copy
		plugins: [
			createCopyPlugin(),
			// Custom plugin for file watching
			{
				name: "watch-plugin",
				apply: "serve", // Only apply during development server
				configureServer(server) {
					if (isWatchMode || command === "serve") {
						// Watch all source files
						const srcFolders = [
							"src/fonts/**/*",
							"src/images/**/*",
							"src/styles/css/**/*",
							"src/scripts/**/*.js",
							"src/liquid/layout/**/*",
							"src/liquid/sections/**/*.liquid",
							"src/liquid/snippets/**/*.liquid",
							"src/liquid/blocks/**/*.liquid"
						];

						// Setup watchers for each folder
						srcFolders.forEach(pattern => {
							server.watcher.add(pattern);
						});

						// Watch for changes to copy files on change
						server.watcher.on("change", filePath => {
							log(`File changed: ${filePath}`, "info");

							// Determine destination based on file path
							if (filePath.includes("/fonts/")) {
								// Copy changed font file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.assets, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated font file: ${flatFile}`, "success");
							} else if (filePath.includes("/images/")) {
								// Copy changed image file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.assets, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated image file: ${flatFile}`, "success");
							} else if (filePath.includes("/styles/css/")) {
								// Copy changed CSS file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.assets, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated CSS file: ${flatFile}`, "success");
							} else if (filePath.includes("/scripts/")) {
								// Copy changed script file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.assets, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated script file: ${flatFile}`, "success");
							} else if (filePath.includes("/liquid/layout/")) {
								// Copy changed layout file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.layout, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated layout file: ${flatFile}`, "success");
							} else if (filePath.includes("/liquid/sections/")) {
								// Copy changed section file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.sections, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated section file: ${flatFile}`, "success");
							} else if (filePath.includes("/liquid/snippets/")) {
								// Copy changed snippet file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.snippets, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated snippet file: ${flatFile}`, "success");
							} else if (filePath.includes("/liquid/blocks/")) {
								// Copy changed block file
								const flatFile = flattenPath(filePath);
								const destPath = path.join(paths.build.blocks, flatFile);
								fs.copyFileSync(filePath, destPath);
								log(`Updated block file: ${flatFile}`, "success");
							}
						});

						log("File watchers established for all source directories", "success");
					}
				}
			}
		],

		// Configure server for development
		server: {
			watch: {
				usePolling: true,
				interval: 100,
				ignored: ["node_modules/**", "Curalife-Theme-Build/**"]
			},
			hmr: {
				overlay: true,
				timeout: 3000
			},
			open: true,
			cors: true
		}
	};
});
