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
  build_folder: 'build/',
  build_assets_folder: 'build/assets/',
  build_templates_folder: 'build/templates/',
  build_layout_folder: 'build/layout/',
  build_sections_folder: 'build/sections/',
  build_snippets_folder: 'build/snippets/',
  styles: 'src/styles/',
  css_folder: 'src/styles/css/',
  scss_folder: 'src/styles/scss/',
  scripts: 'src/scripts/**/*.js',
  images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}',
  fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
  layout_folder: 'src/liquid/layout/',
  config_folder: 'src/liquid/config/',
  locales_folder: 'src/liquid/locales/',
  sections_folder: 'src/liquid/sections/',
  snippets_folder: 'src/liquid/snippets/',
  templates_folder: 'src/liquid/templates/'
}

mix.clean({cleanOnceBeforeBuildPatterns: [paths.build_folder]});

mix.js(paths.scripts, paths.build_assets_folder)
  .copy(paths.fonts, paths.build_assets_folder)
  .copy(paths.images, paths.build_assets_folder)
  .copy(paths.layout_folder, paths.build_layout_folder)
  .copy(paths.sections_folder, paths.build_sections_folder)
  .copy(paths.snippets_folder, paths.build_snippets_folder)
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