const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));

// Asset paths
const srcSCSS = `scss/**/*.scss`;
const srcJS = `js/*.js`;
const assetsDir = `../assets/`;

gulp.task('sass', () => {
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

gulp.task('fonts', () => {
    return gulp.src('fonts/**')
        .pipe(changed(assetsDir)) // ignore unchanged files
        .pipe(gulp.dest(assetsDir))
});

gulp.task('watch', () => {
    gulp.watch(srcSCSS, gulp.series('sass'));
});