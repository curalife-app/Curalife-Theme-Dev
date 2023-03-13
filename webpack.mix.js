let mix = require('laravel-mix');
const tailwindcss = require('tailwindcss');
let fs = require('fs');

let getFiles = function (dir) {
  return fs.readdirSync(dir).filter(file => {
      return fs.statSync(`${dir}/${file}`).isFile();
  });
};

const paths = {
  build_folder: 'Curalife-Theme-Build/',
  build_assets_folder: 'Curalife-Theme-Build/assets/',
  build_templates_folder: 'Curalife-Theme-Build/templates/',
  build_layout_folder: 'Curalife-Theme-Build/layout/',
  build_sections_folder: 'Curalife-Theme-Build/sections/',
  build_snippets_folder: 'Curalife-Theme-Build/snippets/',
  build_locales_folder: 'Curalife-Theme-Build/locales/',
  css_folder_files: 'src/styles/css/**',
  scss_folder: 'src/styles/scss/',
  script_files: 'src/scripts/**/*.js',
  image_files: 'src/images/*/*.{png,jpg,jpeg,gif,svg}',
  font_files: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
  layout_folder_files: 'src/liquid/layout/**',
  locales_folder_files: 'src/locales/**',
  sections_folder_files: 'src/liquid/sections/**',
  snippets_folder_files: 'src/liquid/snippets/**',
  tailwindcss_file: 'src/styles/tailwind.scss'
}

// Example for not flattening folder: .copy(paths.templates_folder, paths.build_templates_folder, false)

mix.copy(paths.script_files, paths.build_assets_folder)
    .copy(paths.font_files, paths.build_assets_folder)
    .copy(paths.css_folder_files, paths.build_assets_folder)
    .copy(paths.image_files, paths.build_assets_folder)
    .copy(paths.layout_folder_files, paths.build_layout_folder)
    .copy(paths.sections_folder_files, paths.build_sections_folder)
    .copy(paths.snippets_folder_files, paths.build_snippets_folder)
    .sass(paths.tailwindcss_file, paths.build_assets_folder)
      .options({
        processCssUrls: false,
        postCss: [tailwindcss('tailwind.config.js')],
      });

  getFiles(paths.scss_folder).forEach(function (filepath) {
      mix.sass(paths.scss_folder + filepath, paths.build_assets_folder);
  });