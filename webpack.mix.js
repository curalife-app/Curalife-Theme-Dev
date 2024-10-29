const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');
const async = require('async');

console.log("Starting optimized Laravel Mix configuration...");

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
  async.parallel(
    files.map(({ src, dest, flatten = false }) => (callback) => {
      try {
        mix.copy(src, dest, { flatten });
        log(`Copied files from ${src} to ${dest}`);
        callback();  // No error, proceed to next task
      } catch (error) {
        console.error(`Error copying files from ${src} to ${dest}:`, error);
        callback(error);  // Pass the error to async.parallel to handle
      }
    }),
    (err) => {
      if (err) console.error("Error during parallel file copying:", err);
      else log("File copying complete.");
    }
  );
}

// Configure Webpack for .liquid files with split chunks
function configureWebpack() {
  mix.webpackConfig({
    stats: { warnings: true, errors: true, children: true },
    optimization: { splitChunks: { chunks: 'all' } },
  });
  log("Webpack configuration complete.");
}

// Compile Tailwind CSS with PurgeCSS and Minify
function compileTailwind() {
  try {
    mix.postCss(paths.assets.tailwind, paths.build.assets, [
      tailwindcss('tailwind.config.js')
    ]).options({ processCssUrls: false }).minify(paths.build.assets + '/tailwind.css');
    log("Tailwind CSS compiled and minified successfully.");
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
