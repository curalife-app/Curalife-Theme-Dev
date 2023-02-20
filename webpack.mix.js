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
  config_folder: 'src/liquid/config/**',
  locales_folder: 'src/liquid/locales/**',
  sections_folder: 'src/liquid/sections/**',
  snippets_folder: 'src/liquid/snippets/**',
  templates_folder: 'src/liquid/templates/**',
  liquid_folders: ['src/liquid/layout/**', 'src/liquid/sections/**', 'src/liquid/snippets/**'],
  templates: 'src/liquid/templates/**',
  images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}'
}

mix.clean({cleanOnceBeforeBuildPatterns: [paths.build]});

mix.js(paths.js, "dist/assets")
  .css(paths.css, "dist/assets")
  .sass(paths.scss, "dist/assets")
  .copy(paths.fonts, "dist/assets")
  .copy(paths.images, "dist/assets")
  .copy(paths.layout_folder, "dist/layout")
  .copy(paths.sections_folder, "dist/sections")
  .copy(paths.snippets_folder, "dist/snippets")
  .copy(paths.templates_folder, "dist/templates", false)
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  })
  .setPublicPath(paths.build);