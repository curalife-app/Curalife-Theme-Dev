const mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');
const fs = require('fs');

const getFiles = (dir) => {
  return fs.readdirSync(dir).filter(file => fs.statSync(`${dir}/${file}`).isFile());
};

const paths = {
  build_folder: 'Curalife-Theme-Build',
  build_assets_folder: 'Curalife-Theme-Build/assets',
  build_templates_folder: 'Curalife-Theme-Build/templates',
  build_layout_folder: 'Curalife-Theme-Build/layout',
  build_sections_folder: 'Curalife-Theme-Build/sections',
  build_snippets_folder: 'Curalife-Theme-Build/snippets',
  css_folder_files: 'src/styles/css/**',
  font_files: 'src/fonts/**/*.{woff,woff2,eot,ttf,otf}',
  image_files: 'src/images/**/*.{png,jpg,jpeg,gif,svg}',
  layout_folder_files: 'src/liquid/layout/**',
  scss_folder: 'src/styles/scss/',
  script_files: 'src/scripts/**/*.js',
  sections_folder_files: 'src/liquid/sections/**/*.liquid',
  snippets_folder_files: 'src/liquid/snippets/**/*.liquid',
  tailwindcss_file: 'src/styles/tailwind.scss'
}

// Copy all required files to target destination
mix.copy(paths.script_files, paths.build_assets_folder)
mix.copy(paths.font_files, paths.build_assets_folder);
mix.copy(paths.css_folder_files, paths.build_assets_folder);
mix.copy(paths.image_files, paths.build_assets_folder, { flatten: true });
mix.copy(paths.layout_folder_files, paths.build_layout_folder);
mix.copy(paths.sections_folder_files, paths.build_sections_folder);
mix.copy(paths.snippets_folder_files, paths.build_snippets_folder);

// Compile all SCSS source files using TailwindCSS
mix.sass(paths.tailwindcss_file, paths.build_assets_folder)
  .options({
    processCssUrls: false,
    postCss: [ tailwindcss('tailwind.config.js') ],
  });

// Compile each individual SCSS into CSS
getFiles(paths.scss_folder).forEach(filename =>
  mix.sass(`${paths.scss_folder}${filename}`, paths.build_assets_folder));