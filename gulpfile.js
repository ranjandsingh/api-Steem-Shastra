const sourceMaps = require('gulp-sourcemaps');
const runSequence = require('run-sequence');
const nodemon = require('gulp-nodemon');
const ts = require('gulp-typescript');
const gulp = require('gulp');
const path = require('path');
const del = require('del');

gulp.task('clean', () =>
  del.sync(['dist/**', '!dist'])
);

gulp.task('ts', () => {
  const res = gulp.src(['src/**/*.ts'])
    .pipe(sourceMaps.init())
    .pipe(ts.createProject('tsconfig.json')());

  return res.js.pipe(sourceMaps.write('.', {
    includeContent: false,
    sourceRoot: ""
  })).pipe(gulp.dest('dist'));
});

gulp.task('nodemon', ['ts'], () =>
  nodemon({
    script: path.join('dist', 'server', 'index.js'),
    ext: 'ts',
    ignore: ['node_modules/**', 'dist/**'],
    tasks: ['ts']
  })
);

gulp.task('serve', ['clean'], () => runSequence('nodemon'));

gulp.task('default', ['clean'], () => {
  runSequence(
    ['ts']
  );
});
