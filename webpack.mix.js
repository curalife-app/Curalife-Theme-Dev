const mix = require("laravel-mix");
const tailwindcss = require("@tailwindcss/postcss");
const path = require("path");
const { reduce } = require("bluebird");

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

// Configure Webpack for .liquid files with split chunks
function configureWebpack() {
	mix.webpackConfig({
		stats: "minimal",
		optimization: { splitChunks: { chunks: "all" } }
	});
	log("Webpack configuration complete.");
}

// Compile Tailwind CSS with PostCSS and Minify
function compileTailwind() {
	try {
		mix.postCss(paths.assets.tailwind, paths.build.assets, [tailwindcss()]).options({ processCssUrls: true });

		if (mix.inProduction()) {
			log("Purging unused CSS classes...");
		}

		log("Tailwind CSS compiled successfully.");
	} catch (error) {
		console.error("Error in Tailwind CSS compilation:", error);
	}
}

// Main build function with caching
function build() {
	log("Starting optimized build process...");

	// Disable notifications globally for Mix
	mix.disableNotifications();

	// Enable cache and versioning in production
	if (mix.inProduction()) {
		mix.version();
		log("Enabled versioning for cache.");
	}

	// Configure Webpack
	configureWebpack();

	// Copy assets and Liquid files
	copyFiles();

	// Compile Tailwind CSS
	compileTailwind();

	log("Optimized build process complete.");
}

// Run the build function
build();
