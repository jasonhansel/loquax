var gulp = require('gulp'),
	nodemon = require('gulp-nodemon'),
	jshint = require('gulp-jshint'),
	imagemin = require('gulp-imagemin'),
	concat = require('gulp-concat'),
	sourcemaps = require('gulp-sourcemaps'),
	uglify = require('gulp-uglify'),
	less = require('gulp-less'),
	minifyCSS = require('gulp-minify-css'),
	autoprefixer = require('gulp-autoprefixer');

gulp.task('lint', function() {
	gulp.src(['./**/*.js', '!node_modules/**', '!build_cache/**'])
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('nodemon', function() {
	nodemon({
		script: 'app.js',
		ignore: [
			'.git',
			'node_modules',
			'words',
			'public',
			'gulpfile.js'
		],
		env: {
			'NODE_ENV': 'development'
		}
	});
});

gulp.task('icon', function() {
	gulp.src('./icon/Icon.svg')
		.pipe(require('gulp-svg2png')())
		.pipe(require('gulp-gm')(function(gmfile) {
			return gmfile.resize(120, 120);
		}))
		.pipe(require('gulp-rename')('test.png'))
		.pipe(imagemin())
		.pipe(gulp.dest('./icon'));
});

gulp.task('js', function() {

	gulp.src([
		'public/modified-ui-bootstrap-custom-tpls-0.10.0.js',
		'node_modules/angularLocalStorage/src/angularLocalStorage.js',
		'node_modules/inobounce/inobounce.js',
		'node_modules/angulartics/src/angulartics.js',
		'node_modules/angulartics/src/angulartics-ga.js',
		'node_modules/bootstrap/js/transition.js',
		'node_modules/bootstrap-switch/dist/js/bootstrap-switch.js',
		'node_modules/angular-bootstrap-switch/dist/angular-bootstrap-switch.js',
		'node_modules/jquery-scrollparent/jquery.scrollparent.js',
		'public/main.js',
		'public/js/*.js'
	]).pipe(sourcemaps.init())
		.pipe(concat('all.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('static'));
});

gulp.task('css', function() {
	gulp.src([
		'public/bootstrap.less',
		'node_modules/bootstrap_dropdowns_enhancement/dist/css/dropdowns-enhancement.css',
		'node_modules/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.css',
		'public/styles.less'
	]).pipe(sourcemaps.init())
		.pipe(less())
		.pipe(autoprefixer()) // Order is important!
	.pipe(concat('all.css'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('static'))
});