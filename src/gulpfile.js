const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));

gulp.task('sass', () => {
    return gulp.src('styles/**/*.scss').pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError)).pipe(gulp.dest('assets'));
});

gulp.task('watch', () => {
    gulp.watch('styles/**/*.scss', gulp.series('sass'));
});