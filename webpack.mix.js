let mix = require('laravel-mix');
let clean = require('laravel-mix-clean');
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
  build_config_folder: 'Curalife-Theme-Build/config/',
  build_locales_folder: 'Curalife-Theme-Build/locales/',
  css_folder: 'src/styles/css/',
  scss_folder: 'src/styles/scss/',
  script_files: 'src/scripts/**/*.js',
  image_files: 'src/images/*/*.{png,jpg,jpeg,gif,svg}',
  font_files: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
  layout_folder_files: 'src/liquid/layout/**',
  config_folder_files: 'src/config/**',
  locales_folder_files: 'src/locales/**',
  sections_folder_files: 'src/liquid/sections/**',
  snippets_folder_files: 'src/liquid/snippets/**',
  templates_folder: 'src/liquid/templates/'
}

// mix.clean({cleanOnceBeforeBuildPatterns: [paths.build_folder]});

mix.js(paths.script_files, paths.build_assets_folder)
  .copy(paths.font_files, paths.build_assets_folder)
  .copy(paths.image_files, paths.build_assets_folder)
  .copy(paths.config_folder_files, paths.build_config_folder)
  .copy(paths.locales_folder_files, paths.build_locales_folder)
  .copy(paths.layout_folder_files, paths.build_layout_folder)
  .copy(paths.sections_folder_files, paths.build_sections_folder)
  .copy(paths.snippets_folder_files, paths.build_snippets_folder)
  .copy(paths.templates_folder, paths.build_templates_folder, false)
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  });

  getFiles(paths.scss_folder).forEach(function (filepath) {
      mix.sass(paths.scss_folder + filepath, paths.build_assets_folder);
  });
  getFiles(paths.css_folder).forEach(function (filepath) {
      mix.css(paths.css_folder + filepath, paths.build_assets_folder);
  });