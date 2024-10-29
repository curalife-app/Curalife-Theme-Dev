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
  script_files: 'src/scripts/**/*.js',
  sections_folder_files: 'src/liquid/sections/**/*.liquid',
  snippets_folder_files: 'src/liquid/snippets/**/*.liquid',
  blocks_folder_files: 'src/liquid/blocks/**/*.liquid',
  tailwindcss_file: 'src/styles/tailwind.css'
};

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
  },
  stats: {
    all: undefined,
    warnings: true,
    errors: true,
    children: true,
  }
});

console.log("Webpack loader for .liquid files configured.");
console.log("Configuring file copying...");

// Copy all required files to target destination
copyFiles(paths.script_files, paths.build_assets_folder, false);
copyFiles(paths.font_files, paths.build_assets_folder, false);
copyFiles(paths.css_folder_files, paths.build_assets_folder, false);
copyFiles(paths.image_files, paths.build_assets_folder, true);

// Copy liquid files
copyFiles(paths.layout_folder_files, paths.build_layout_folder);
copyFiles(paths.sections_folder_files, paths.build_sections_folder);
copyFiles(paths.snippets_folder_files, paths.build_snippets_folder);
copyFiles(paths.blocks_folder_files, paths.build_blocks_folder);

console.log("File copying configured.");
console.log("Configuring Tailwind CSS compilation...");

// Compile Tailwind CSS using PostCSS
mix.postCss(paths.tailwindcss_file, paths.build_assets_folder, [
  tailwindcss('tailwind.config.js'),
]).options({
  processCssUrls: false,
});

console.log("Tailwind CSS compilation configured.");
console.log("Laravel Mix configuration complete.");