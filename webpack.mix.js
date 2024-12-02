const mix = require('laravel-mix');
const tailwindcss = require('@tailwindcss/postcss');
const async = require('async');

console.log("Starting optimized Laravel Mix configuration...");

// Set the public path to your build directory
mix.setPublicPath('Curalife-Theme-Build');

// Define file paths
const paths = {
		build_folder: 'Curalife-Theme-Build',
		assets: {
				fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf,otf}',
				images: 'src/images/**/*.{png,jpg,jpeg,gif,svg}',
				css: 'src/styles/css/**',
				scripts: 'src/scripts/**/*.js',
				tailwind: 'src/styles/tailwind.css'
		},
		liquid: {
				layout: 'src/liquid/layout/**',
				sections: 'src/liquid/sections/**/*.liquid',
				snippets: 'src/liquid/snippets/**/*.liquid',
				blocks: 'src/liquid/blocks/**/*.liquid'
		},
		build: {
				assets: 'Curalife-Theme-Build/assets',
				layout: 'Curalife-Theme-Build/layout',
				sections: 'Curalife-Theme-Build/sections',
				snippets: 'Curalife-Theme-Build/snippets',
				blocks: 'Curalife-Theme-Build/blocks'
		}
};

// Logging function to streamline messages
const log = (message) => console.log(`\x1b[36m${message}\x1b[0m`); // Blue color for logs

// Parallelized Copy files with error handling
function copyFiles(files) {
	// Copy assets and liquid files
	mix.copy(paths.assets.scripts, paths.build.assets)
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
		stats: { warnings: true, errors: true, children: true },
		optimization: { splitChunks: { chunks: 'all' } },
	});
	log("Webpack configuration complete.");
}

// Compile Tailwind CSS with PostCSS and Minify
function compileTailwind() {
	try {
		mix.postCss(paths.assets.tailwind, paths.build.assets, [tailwindcss()])
		.options({processCssUrls: true});

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

	// Enable cache and versioning
	if (mix.inProduction()) {
		mix.version();
		log("Enabled versioning for cache.");
	}

	// Configure Webpack
	configureWebpack();

	// Copy assets and liquid files in parallel
	copyFiles([
		{ src: paths.assets.scripts, dest: paths.build.assets },
		{ src: paths.assets.fonts, dest: paths.build.assets },
		{ src: paths.assets.css, dest: paths.build.assets },
		{ src: paths.assets.images, dest: paths.build.assets, flatten: true },
		{ src: paths.liquid.layout, dest: paths.build.layout },
		{ src: paths.liquid.sections, dest: paths.build.sections },
		{ src: paths.liquid.snippets, dest: paths.build.snippets },
		{ src: paths.liquid.blocks, dest: paths.build.blocks }
	]);

	compileTailwind();

	log("Optimized build process complete.");
}

// Run the build function
build();
