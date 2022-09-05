const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const changed = require(`gulp-changed`);
const minify = require(`gulp-minify`);
const themeKit = require('@shopify/themekit');

// Asset paths
const srcSCSS = `styles/**/*.scss`;
const srcJS = `scripts/*.js`;
const assetsDir = `../assets/`;

gulp.task('scss', () => {
    return gulp.src(srcSCSS).pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError)).pipe(gulp.dest(assetsDir));
});

/**
 * JS task
 * Note: use npm to install libraries and add them below, like the babel-polyfill example
 */
 const jsFiles = [
    //`./node_modules/babel-polyfill/dist/polyfill.js`,
    srcJS
];

gulp.task(`js`, () => {
    return gulp.src(jsFiles)
        .pipe(minify({noSource: true}))
        .pipe(gulp.dest(assetsDir));
});

gulp.task('fonts', () => {
    return gulp.src('fonts/**')
        .pipe(changed(assetsDir)) // ignore unchanged files
        .pipe(gulp.dest(assetsDir))
});

gulp.task('default', gulp.series('scss', 'js', 'fonts'));

gulp.task('watch', () => {
    gulp.watch(srcSCSS, gulp.series('scss', 'js', 'fonts'));
    themeKit.command('watch', {
        allowLive: true,
        env: 'development'
    });
});