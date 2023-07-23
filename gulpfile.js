const [
  gulp,
  sass,
  postcss,
  precss,
  tailwind,
  autoprefixer,
  cssnano,
  copy,
  through,
  plumber,
  imagemin,
  uglify,
  concat,
  browserSync,
  cache,
  newer,
  remember,
  cached
] = [
  'gulp',
  'gulp-sass',
  'gulp-postcss',
  'precss',
  'tailwindcss',
  'autoprefixer',
  'cssnano',
  'gulp-copy',
  'through2',
  'gulp-plumber',
  'gulp-imagemin',
  'gulp-uglify',
  'gulp-concat',
  'browser-sync',
  'gulp-cache',
  'gulp-newer',
  'gulp-remember',
  'gulp-cached'
].map(require);

const sassCompiler = sass(require('sass'));
const paths = {
  css: 'src/styles/css/**',
  fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf,otf}',
  images: 'src/images/**/*.{png,jpg,jpeg,gif,svg}',
  scripts: 'src/scripts/**/*.js',
  styles: 'src/styles/scss/',
  tailwindStyles: 'src/styles/tailwind.scss',
  build: 'Curalife-Theme-Build',
  assets: 'Curalife-Theme-Build/assets',
  templates: 'src/liquid/**/*.liquid',
};

const processFiles = (source, destination, processors, cacheEnabled = false) => {
  let stream = gulp.src(source).pipe(newer(destination)).pipe(plumber({errorHandler: console.error}));

  if (cacheEnabled) {
    stream = stream.pipe(cached('files'));
  }

  processors.forEach(processor => stream = stream.pipe(processor));

  if (cacheEnabled) {
    stream = stream.pipe(remember('files'));
  }

  return stream.pipe(gulp.dest(destination));
};

const watchAndRun = (files, tasks) => gulp.watch(files, gulp.series(...tasks, 'reload'));

const tasks = {
  styles: () => processFiles(paths.tailwindStyles, paths.assets, [sassCompiler(), postcss([tailwind, autoprefixer, cssnano])], true),
  individualStyles: () => processFiles(`${paths.styles}**/*.scss`, paths.assets, [sassCompiler()], true),
  copy: () => processFiles([paths.css, paths.fonts], paths.assets, [copy(paths.assets, { flatten: true })]),
  templates: () => processFiles(paths.templates, paths.build, [
    through.obj(async (file, _, next) => {
      let content = file.contents.toString();
      const styleRegex = /<style>([\s\S]*?)<\/style>/g;
      let match;

      while ((match = styleRegex.exec(content))) {
        if (!match[1]) continue;
        const processedCss = await postcss([precss]).process(match[1]);
        content = content.replace(match[0], `<style>\n${processedCss.css}\n</style>`);
      }

      file.contents = Buffer.from(content);
      next(null, file);
    })
  ]),
  images: () => processFiles(paths.images, paths.assets, [cache(imagemin([
    imagemin.gifsicle({interlaced: true}),
    imagemin.mozjpeg({quality: 75, progressive: true}),
    imagemin.optipng({optimizationLevel: 5}),
    imagemin.svgo({plugins: [{removeViewBox: true}])
  ]))], true),
  scripts: () => processFiles(paths.scripts, paths.assets, [concat('main.js'), uglify()], true),
  sync: () => browserSync.init({server: {baseDir: paths.build}}),
  watch: () => {
    watchAndRun([paths.styles, paths.tailwindStyles], ['styles', 'individualStyles']);
    watchAndRun(paths.scripts, ['scripts']);
    watchAndRun(paths.images, ['images']);
    watchAndRun(paths.templates, ['templates']);
    watchAndRun([paths.css, paths.fonts], ['copy']);
  },
  reload: done => {browserSync.reload(); done();}
};

Object.entries(tasks).forEach(([name, task]) => gulp.task(name, task));
gulp.task('default', gulp.parallel(...Object.keys(tasks)));
