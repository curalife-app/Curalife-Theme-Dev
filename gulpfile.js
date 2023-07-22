const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const postcss = require('gulp-postcss');
const precss = require('precss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const rename = require('gulp-rename');
const copy = require('gulp-copy');
const fs = require('fs');
const through = require('through2');
const tmp = require('tmp');
const Promise = require('bluebird');
const plumber = require('gulp-plumber');
const imagemin = require('gulp-imagemin');
const cache = require('gulp-cache');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const browsersync = require('browser-sync').create();
const changed = require('gulp-changed');

const paths = {
  css_folder_files: 'src/styles/css/**',
  font_files: 'src/fonts/**/*.{woff,woff2,eot,ttf,otf}',
  image_files: 'src/images/**/*.{png,jpg,jpeg,gif,svg}',
  script_files: 'src/scripts/**/*.js',
  scss_folder: 'src/styles/scss/',
  tailwindcss_file: 'src/styles/tailwind.scss',
  build_folder: 'Curalife-Theme-Build',
  build_assets_folder: 'Curalife-Theme-Build/assets',
  liquid_files: 'src/liquid/**/*.liquid',
};

const plumberErrorHandler = {
  errorHandler: function(err) {
    console.error(err);
    this.emit('end');
  },
};

gulp.task('styles', function() {
  return gulp.src(paths.tailwindcss_file)
    .pipe(changed(paths.build_assets_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(sass())
    .pipe(postcss([tailwindcss(), autoprefixer(), cssnano()]))
    .pipe(gulp.dest(paths.build_assets_folder));
});

gulp.task('individual-styles', function() {
  return gulp.src(paths.scss_folder + '**/*.scss')
    .pipe(changed(paths.build_assets_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(sass())
    .pipe(gulp.dest(paths.build_assets_folder));
});

gulp.task('copy', function() {
  return gulp.src([paths.css_folder_files, paths.font_files])
    .pipe(changed(paths.build_assets_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(copy(paths.build_assets_folder, { flatten: true }));
});

gulp.task('liquid-styles', function() {
  return gulp.src(paths.liquid_files)
    .pipe(changed(paths.build_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(
      through.obj(function(file, _, cb) {
        var contents = file.contents.toString();
        var matches = contents.matchAll(/<style>([\s\S]*?)<\/style>/g);
        var promises = [];

        for (let match of matches) {
          if (match[1]) {
            var scss = match[1];
            var tempFile = tmp.fileSync();
            fs.writeFileSync(tempFile.name, scss);

            promises.push(
              new Promise((resolve, reject) => {
                gulp.src(tempFile.name)
                  .pipe(plumber(plumberErrorHandler))
                  .pipe(postcss([precss]))
                  .on('data', function(cssFile) {
                    contents = contents.replace(match[0], '<style>\n' + cssFile.contents.toString() + '\n</style>');
                    tempFile.removeCallback();
                    resolve();
                  })
                  .on('error', function(err) {
                    console.log(err);
                    this.emit('end');
                    reject(err);
                  });
              })
            );
          }
        }

        Promise.all(promises).then(() => {
          file.contents = Buffer.from(contents);
          cb(null, file);
        });
      })
    )
    .pipe(gulp.dest(paths.build_folder));
});

gulp.task('image-min', function() {
  return gulp.src(paths.image_files)
    .pipe(changed(paths.build_assets_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(cache(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.mozjpeg({quality: 75, progressive: true}),
      imagemin.optipng({optimizationLevel: 5}),
      imagemin.svgo({plugins: [{removeViewBox: true}]}),
    ])))
    .pipe(gulp.dest(paths.build_assets_folder));
});

gulp.task('scripts', function() {
  return gulp.src(paths.script_files)
    .pipe(changed(paths.build_assets_folder))
    .pipe(plumber(plumberErrorHandler))
    .pipe(concat('main.js'))
    .pipe(uglify())
    .pipe(gulp.dest(paths.build_assets_folder));
});

gulp.task('browserSync', function() {
  browsersync.init({
    server: {
      baseDir: paths.build_folder,
    },
  });
});

gulp.task('watch', function() {
  gulp.watch(paths.scss_folder, gulp.series('styles', 'individual-styles', 'reload'));
  gulp.watch(paths.script_files, gulp.series('scripts', 'reload'));
  gulp.watch(paths.image_files, gulp.series('image-min', 'reload'));
  gulp.watch(paths.liquid_files, gulp.series('liquid-styles', 'reload'));
});

gulp.task('reload', function(done) {
  browsersync.reload();
  done();
});

gulp.task('default', gulp.parallel('styles', 'individual-styles', 'copy', 'liquid-styles', 'image-min', 'scripts', 'browserSync', 'watch'));
