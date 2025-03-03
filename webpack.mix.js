const mix = require("laravel-mix");
const tailwindcss = require("tailwindcss");
const path = require("path");
const fs = require("fs");

console.log("Starting optimized Laravel Mix configuration...");

// Define absolute paths for all directories and files
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

// Set the public path to your build directory
mix.setPublicPath(paths.build_folder);

// Logging function to streamline messages
const log = (message, type = "info") => {
	const colors = {
		info: "\x1b[36m", // Blue
		success: "\x1b[32m", // Green
		error: "\x1b[31m" // Red
	};
	console.log(`${colors[type]}${message}\x1b[0m`);
};

// Parallelized Copy files with error handling
function copyFiles() {
	mix
		.copy(paths.assets.scripts, paths.build.assets)
		.copy(paths.assets.fonts, paths.build.assets)
		.copy(paths.assets.css, paths.build.assets)
		.copy(paths.assets.images, paths.build.assets)
		.copy(paths.liquid.layout, paths.build.layout)
		.copy(paths.liquid.sections, paths.build.sections)
		.copy(paths.liquid.snippets, paths.build.snippets)
		.copy(paths.liquid.blocks, paths.build.blocks);

	log("File copying complete.");
}

// Configure Webpack for .liquid files with split chunks and caching
function configureWebpack() {
	mix.webpackConfig({
		stats: "minimal",
		optimization: {
			splitChunks: { chunks: "all" }
		},
		// Add webpack caching here - this is the proper way to enable caching
		cache: {
			type: "filesystem",
			cacheDirectory: path.resolve(__dirname, "node_modules/.cache/webpack")
		}
	});
	log("Webpack configuration complete.");
}

// Compile only Tailwind CSS - fix for duplicate entry issue
function compileTailwind() {
	try {
		// Only create the regular tailwind.css file using Mix
		mix.postCss(paths.assets.tailwind, path.join(paths.build.assets, "tailwind.css"), [require("postcss-import"), require("tailwindcss")("./tailwind.config.js"), require("autoprefixer")]).options({
			processCssUrls: false // Faster processing
		});

		// Add a finish event to create the minified version after the build completes
		// This avoids the duplicate entry point issue
		mix.then(() => {
			// Create minified version after the build completes
			try {
				const outputPath = path.join(paths.build.assets, "tailwind.css");
				const minPath = path.join(paths.build.assets, "tailwind.min.css");

				if (fs.existsSync(outputPath)) {
					const css = fs.readFileSync(outputPath, "utf8");

					// Use cssnano directly to minify the file
					const postcss = require("postcss");
					const cssnano = require("cssnano");

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
		});

		if (mix.inProduction()) {
			log("Purging unused CSS classes for Tailwind...");
		}

		log("Tailwind CSS compilation started...");
	} catch (error) {
		console.error("Error in Tailwind CSS compilation:", error);
	}
}

// Main build function with caching
function build() {
	log("Starting optimized build process...");

	// Disable notifications globally for Mix
	mix.disableNotifications();

	// Enable versioning in production
	if (mix.inProduction()) {
		mix.version();
		log("Enabled versioning for cache.");
	}

	// Configure Webpack
	configureWebpack();

	// Copy assets and Liquid files
	copyFiles();

	// Compile Tailwind CSS only
	compileTailwind();

	log("Optimized build process complete.");
}

// Run the build function
build();

// Only in development mode (when watching)
if (process.argv.includes("--watch")) {
	mix.webpackConfig({
		watchOptions: {
			ignored: /node_modules/,
			aggregateTimeout: 300,
			poll: 1000
		}
	});
}
