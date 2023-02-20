let mix = require('laravel-mix');
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
  liquid: ['src/liquid/layout/**/*.{liquid}', 'src/liquid/sections/**/*.{liquid}', 'src/liquid/snippets/**/*.{liquid}'],
  templates: 'src/liquid/templates/**/*.{liquid,json}',
  images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}'
}

mix.js(paths.js, paths.build_assets)
  .css(paths.css, paths.build_assets)
  .sass(paths.scss, paths.build_assets)
  .copy(paths.fonts, paths.build_assets)
  .copy(paths.liquid, paths.build)
  .copyDirectory(paths.images, paths.build_assets)
  .copyDirectory(paths.templates, paths.build)
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  });