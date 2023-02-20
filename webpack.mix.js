let mix = require('laravel-mix');
let clean = require('laravel-mix-clean');
const tailwindcss = require('tailwindcss');

const paths = {
  build: 'dist/',
  build_assets: 'dist/assets/',
  build_templates: 'dist/templates/',
  styles: 'src/styles/',
  css: 'src/styles/**/*.css',
  scss: 'src/styles/scss/**/*.scss',
  js: 'src/scripts/**/*.js',
  fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
  layout_folder: 'src/liquid/layout/**',
  sections_folder: 'src/liquid/sections/**',
  snippets_folder: 'src/liquid/snippets/**',
  templates_folder: 'src/liquid/templates/**',
  liquid_folders: ['src/liquid/layout/**', 'src/liquid/sections/**', 'src/liquid/snippets/**'],
  templates: 'src/liquid/templates/**',
  images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}'
}

mix.clean({cleanOnceBeforeBuildPatterns: [paths.build]});

mix.js(paths.js, "assets")
  .css(paths.css, "assets")
  .sass(paths.scss, "assets")
  .copy(paths.fonts, "assets")
  .copy(paths.images, "assets")
  .copy(paths.layout_folder, "layout")
  .copy(paths.sections_folder, "sections")
  .copy(paths.snippets_folder, "snippets")
  .copy(paths.templates_folder, "templates")
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  })
  .setPublicPath(paths.build);