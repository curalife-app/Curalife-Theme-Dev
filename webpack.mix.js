let mix = require('laravel-mix');

mix.js('src/scripts/*.js', 'dist/assets').setPublicPath('dist/assets')
  .options({
    processCssUrls: false,
    postCss: [tailwindcss('tailwind.config.js')],
  });