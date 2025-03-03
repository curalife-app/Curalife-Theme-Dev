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
import { viteStaticCopy } from "vite-plugin-static-copy";
import postcss from "postcss";
import postcssImport from "postcss-import";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import fs from "fs";
import glob from "glob";

console.log("Starting optimized Vite configuration...");

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

// Logging function to streamline messages (matches the webpack.mix.js implementation)
const log = (message, type = "info") => {
	const colors = {
		info: "\x1b[36m", // Blue
		success: "\x1b[32m", // Green
		error: "\x1b[31m" // Red
	};
	console.log(`${colors[type]}${message}\x1b[0m`);
};

// Handle post-build minification of Tailwind CSS
const createMinifiedCss = () => {
	try {
		const outputPath = path.join(paths.build.assets, "tailwind.css");
		const minPath = path.join(paths.build.assets, "tailwind.min.css");

		if (fs.existsSync(outputPath)) {
			const css = fs.readFileSync(outputPath, "utf8");

			// Use cssnano directly to minify the file
			postcss([
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
			])
				.process(css, { from: outputPath, to: minPath })
				.then(result => {
					fs.writeFileSync(minPath, result.css);
					log("Tailwind CSS minified version created.", "success");
				});
		}
	} catch (error) {
		console.error("Error creating minified version:", error);
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

		files.forEach(file => {
			const fullPath = path.join(directory, file);

			if (fs.lstatSync(fullPath).isDirectory()) {
				// Recursively delete directories
				fs.rmSync(fullPath, { recursive: true, force: true });
			} else {
				// Delete files
				fs.unlinkSync(fullPath);
			}
		});

		log(`Cleaned directory: ${directory}`, "success");
	}
};

// Custom plugin for file copying
const createCopyPlugin = () => {
	return {
		name: "custom-copy-plugin",
		buildStart() {
			log("Starting custom copy plugin", "info");

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

			// Copy files - fonts (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/fonts"))) {
				try {
					const fontFiles = findFiles(path.join(__dirname, "src/fonts"), "**/*.{woff,woff2,eot,ttf,otf}");
					for (const file of fontFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.assets, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied font files (flattened)", "success");
				} catch (e) {
					log(`Error copying fonts: ${e.message}`, "error");
				}
			}

			// Copy files - images (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/images"))) {
				try {
					const imageFiles = findFiles(path.join(__dirname, "src/images"), "**/*.{png,jpg,jpeg,gif,svg}");
					for (const file of imageFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.assets, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied image files (flattened)", "success");
				} catch (e) {
					log(`Error copying images: ${e.message}`, "error");
				}
			}

			// Copy files - CSS (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/styles/css"))) {
				try {
					const cssFiles = findFiles(path.join(__dirname, "src/styles/css"), "**/*");
					for (const file of cssFiles) {
						if (fs.statSync(file).isFile()) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.assets, flatFile);

							fs.copyFileSync(file, destPath);
						}
					}
					log("Copied CSS files (flattened)", "success");
				} catch (e) {
					log(`Error copying CSS: ${e.message}`, "error");
				}
			}

			// Copy files - scripts (flatten structure)
			if (fs.existsSync(path.join(__dirname, "src/scripts"))) {
				try {
					const scriptFiles = findFiles(path.join(__dirname, "src/scripts"), "**/*.js");
					for (const file of scriptFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.assets, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied script files (flattened)", "success");
				} catch (e) {
					log(`Error copying scripts: ${e.message}`, "error");
				}
			}

			// Copy files - liquid layout (FLATTEN structure for layout files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/layout"))) {
				try {
					const layoutFiles = findFiles(path.join(__dirname, "src/liquid/layout"), "**/*");
					for (const file of layoutFiles) {
						if (fs.statSync(file).isFile()) {
							// Flatten the path - just use the filename
							const flatFile = flattenPath(file);
							const destPath = path.join(paths.build.layout, flatFile);

							fs.copyFileSync(file, destPath);
						}
					}
					log("Copied layout files (flattened)", "success");
				} catch (e) {
					log(`Error copying layout: ${e.message}`, "error");
				}
			}

			// Copy files - liquid sections (FLATTEN structure for sections files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/sections"))) {
				try {
					const sectionFiles = findFiles(path.join(__dirname, "src/liquid/sections"), "**/*.liquid");
					for (const file of sectionFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.sections, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied section files (flattened)", "success");
				} catch (e) {
					log(`Error copying sections: ${e.message}`, "error");
				}
			}

			// Copy files - liquid snippets (FLATTEN structure for snippets files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/snippets"))) {
				try {
					const snippetFiles = findFiles(path.join(__dirname, "src/liquid/snippets"), "**/*.liquid");
					for (const file of snippetFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.snippets, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied snippet files (flattened)", "success");
				} catch (e) {
					log(`Error copying snippets: ${e.message}`, "error");
				}
			}

			// Copy files - liquid blocks (FLATTEN structure for blocks files)
			if (fs.existsSync(path.join(__dirname, "src/liquid/blocks"))) {
				try {
					const blockFiles = findFiles(path.join(__dirname, "src/liquid/blocks"), "**/*.liquid");
					for (const file of blockFiles) {
						// Flatten the path - just use the filename
						const flatFile = flattenPath(file);
						const destPath = path.join(paths.build.blocks, flatFile);

						fs.copyFileSync(file, destPath);
					}
					log("Copied block files (flattened)", "success");
				} catch (e) {
					log(`Error copying blocks: ${e.message}`, "error");
				}
			} else {
				log("No blocks directory found, skipping", "info");
			}

			log("All files copied successfully", "success");
		}
	};
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
			minify: isProduction,
			sourcemap: !isProduction,
			rollupOptions: {
				input: {
					tailwind: paths.assets.tailwind
				},
				output: {
					entryFileNames: "assets/[name].js",
					chunkFileNames: "assets/[name]-[hash].js",
					assetFileNames: "assets/[name].[ext]"
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
					...(isProduction
						? [
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
							]
						: [])
				]
			},
			devSourcemap: !isProduction
		},

		// Use our custom file copying plugin instead of vite-plugin-static-copy
		plugins: [
			createCopyPlugin(),
			// Custom plugin to handle post-build operations (like tailwind minification)
			{
				name: "post-build",
				closeBundle() {
					createMinifiedCss();
					log("Optimized build process complete.", "success");
				}
			},
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
				overlay: true
			}
		}
	};
});
