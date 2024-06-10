const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');
const path = require('path');
const fs = require('fs');

console.log("Starting Laravel Mix configuration...");

const getFiles = (dir) => {
  return fs.readdirSync(dir).filter(file => fs.statSync(`${dir}/${file}`).isFile());
};

function copyFiles(source, destination, isFlattened = false) {
  mix.copy(source, destination, { flatten: isFlattened });
}

function processFiles(source, destination) {
  mix.js(source, destination);
}

const paths = {
  build_folder: 'Curalife-Theme-Build',
  build_assets_folder: 'Curalife-Theme-Build/assets',
  build_templates_folder: 'Curalife-Theme-Build/templates',
  build_layout_folder: 'Curalife-Theme-Build/layout',
  build_sections_folder: 'Curalife-Theme-Build/sections',
  build_snippets_folder: 'Curalife-Theme-Build/snippets',
  build_blocks_folder: 'Curalife-Theme-Build/blocks',
  css_folder_files: 'src/styles/css/**',
  font_files: 'src/fonts/**/*.{woff,woff2,eot,ttf,otf}',
  image_files: 'src/images/**/*.{png,jpg,jpeg,gif,svg}',
  layout_folder_files: 'src/liquid/layout/**',
  scss_folder: 'src/styles/scss/',
  script_files: 'src/scripts/**/*.js',
  sections_folder_files: 'src/liquid/sections/**/*.liquid',
  snippets_folder_files: 'src/liquid/snippets/**/*.liquid',
  blocks_folder_files: 'src/liquid/blocks/**/*.liquid',
  tailwindcss_file: 'src/styles/tailwind.scss'
}

console.log("Configuring Webpack...");

mix.webpackConfig({
  module: {
    rules: [
      {
        test: /\article.liquid$/,
        use: [
          {
            loader: 'liquid-loader',
          },
          path.resolve('webpack-loaders/liquid-css-processor-loader.js')
        ]
      }
    ]
  }
});

console.log("Webpack loader for .liquid files configured.");
console.log("Configuring file copying...");

// Copy all required files to target destination
copyFiles(paths.script_files, paths.build_assets_folder, false);
copyFiles(paths.font_files, paths.build_assets_folder, false);
copyFiles(paths.css_folder_files, paths.build_assets_folder, false);
copyFiles(paths.image_files, paths.build_assets_folder, true);

// copy liquid files
copyFiles(paths.layout_folder_files, paths.build_layout_folder);
copyFiles(paths.sections_folder_files, paths.build_sections_folder);
copyFiles(paths.snippets_folder_files, paths.build_snippets_folder);
copyFiles(paths.blocks_folder_files, paths.build_blocks_folder);

// processFiles('src/liquid/sections/pages/blogs/articles/article.liquid', '/')

console.log("File copying configured.");
console.log("Configuring SCSS compilation...");

// Compile all SCSS source files using TailwindCSS
mix.sass(paths.tailwindcss_file, paths.build_assets_folder)
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  });

console.log("SCSS compilation configured.");
console.log("Compiling individual SCSS files...");

// Compile each individual SCSS into CSS
getFiles(paths.scss_folder).forEach(filename =>
  mix.sass(`${paths.scss_folder}${filename}`, paths.build_assets_folder));

console.log("Laravel Mix configuration complete.");