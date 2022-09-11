const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const changed = require(`gulp-changed`);
const minify = require(`gulp-minify`);
const flatten = require('gulp-flatten');
const rename = require('gulp-rename');
const cleanCss = require('gulp-clean-css');
const del = require('del');
const themeKit = require('@shopify/themekit');

var paths = {
    assets: 'assets/',
    styles: 'src/styles/',
    css: 'src/styles/**/*.css',
    scss: 'src/styles/scss/**/*.scss',
    js: 'src/scripts/**/*.js',
    fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
    images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}'
}

gulp.task('scss', () => {
    return gulp.src(paths.scss)
        .pipe(flatten())
        .pipe(changed(paths.styles))
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest(paths.assets));
});

gulp.task('css', () => {
    return gulp.src(paths.css)
        .pipe(flatten())
        .pipe(changed(paths.assets))
        .pipe(cleanCss())
        .pipe(gulp.dest(paths.assets));
});

gulp.task('styles', gulp.series('scss', 'css'));

/**
 * JS task
 * Note: use npm to install libraries and add them below, like the babel-polyfill example
 */
const jsFiles = [
    //`./node_modules/babel-polyfill/dist/polyfill.js`,
    paths.js
];

gulp.task(`js`, () => {
    return gulp.src(jsFiles)
        .pipe(flatten())
        .pipe(changed(paths.assets))
        .pipe(minify({noSource: true}))
        .pipe(gulp.dest(paths.assets));
});

gulp.task('fonts', () => {
    return gulp.src(paths.fonts)
        .pipe(rename(function (path) {
            path.basename = 'fonts-' + path.basename;
        }))
        .pipe(changed(paths.assets))
        .pipe(flatten())
        .pipe(gulp.dest(paths.assets))
});

gulp.task('images', () => {
    return gulp.src(paths.images)
        .pipe(rename(function (path) {
            path.basename = path.dirname.replace('/', '-') + '-' + path.basename;
        }))
        .pipe(changed(paths.assets))
        .pipe(flatten())
        .pipe(gulp.dest(paths.assets))
});

gulp.task('clean', () => { return del.sync(paths.assets); });

gulp.task('default', gulp.series('styles', 'js', 'fonts', 'images'));

gulp.task('watch', () => {
    gulp.watch([paths.scss, paths.js, paths.fonts, paths.images], gulp.series('scss', 'js', 'fonts', 'images'));
    themeKit.command('watch', {
        allowLive: true,
        env: 'development'
    });
});

