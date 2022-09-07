'use strict';

// const del = require('del');
const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const changed = require(`gulp-changed`);
const minify = require(`gulp-minify`);
const flatten = require('gulp-flatten');
const rename = require('gulp-rename');
const watch = require('gulp-watch');
const path = require('path');
const themeKit = require('@shopify/themekit');

var paths = {
    assets: 'assets/',
    scss: 'src/styles/**/*.scss',
    js: 'src/scripts/**/*.js',
    fonts: 'src/fonts/**/*.{woff,woff2,eot,ttf}',
    images: 'src/images/*/*.{png,jpg,jpeg,gif,svg}'
}

gulp.task('scss', () => {
    return gulp.src(paths.scss)
        .pipe(flatten())
        .pipe(changed(paths.assets)) // ignore unchanged files
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(gulp.dest(paths.assets));
});

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
        .pipe(changed(paths.assets)) // ignore unchanged files
        .pipe(minify({noSource: true}))
        .pipe(gulp.dest(paths.assets));
});

gulp.task('fonts', () => {
    return gulp.src(paths.fonts)
        .pipe(flatten())
        .pipe(changed(paths.assets)) // ignore unchanged files
        .pipe(gulp.dest(paths.assets))
});

gulp.task('images', () => {
    return gulp.src(paths.images)
        .pipe(rename(function (path) {
            path.basename = path.dirname.replace('/', '-') + '-' + path.basename;
        }))
        .pipe(changed(paths.assets)) // ignore unchanged files
        .pipe(flatten())
        .pipe(gulp.dest(paths.assets))
});

gulp.task('default', gulp.series('scss', 'js', 'fonts', 'images'));

gulp.task('watch', () => {
    gulp.watch([paths.scss, paths.js, paths.fonts, paths.images], gulp.series('scss', 'js', 'fonts', 'images'));
    themeKit.command('watch', {
        allowLive: true,
        env: 'development'
    });

    //TODO: Handle Deleted Files
    // fileWatcher.on('change', function (event) {
    //     if (event.type === 'deleted') {
    //         var filePathFromSrc = path.relative(path.resolve('/'), event.path);
    //         var destFilePath = path.resolve(paths.assets, filePathFromSrc);
    //         del.sync(destFilePath);
    //     }
    // });
});

