/* jshint undef:true, node: true, loopfunc: true, maxlen: 160, camelcase: false */

///<reference path='./node_modules/DefinitelyTyped/node/node.d.ts'/>
///<reference path='./node_modules/DefinitelyTyped/express/express.d.ts'/>

var express = require('express'),
	apiRoutes = require('./routes/api'),
	async = require('asyncawait/async'),
	bodyParser = require('body-parser'),
	compression = require('compression'),
	config = require('config'),
	cookieParser = require('cookie-parser'),
	crypto = require('crypto'),
	favicon = require('serve-favicon'),
	morgan = require('morgan'),
	path = require('path'),
	routes = require('./routes/index'),
	scmp = require('scmp'),
	session = require('express-session'),
	legEx = require('express-legacy-expires'),
	assets = require('connect-assets'),
	// ^ monkey-patched for autoprefixing. a bug has been filed on the connect-assets github page.
	// See https://github.com/adunkman/connect-assets/issues/265
	minify = require('html-minifier').minify,
	fs = require('fs'),
	helmet = require('helmet'),
	httpStatus = require('http').STATUS_CODES,
	sqliteStore = require('connect-sqlite3')({
		session: session
	});

require('sugar');

function fixEndings(str) {
	// This might not really be necessary...
	return config.unix ? str.replace(/\r\n/g, '\n') : str;
}

if (config.refreshWhit) {
	// Speed up restarts locally
	fs.writeFileSync(
		config.whDir + '/WORD.MOD',
		fixEndings(fs.readFileSync('words-config/WORD.MOD', {
			encoding: 'utf8'
		}))
	);
	fs.writeFileSync(
		config.whDir + '/WORD.MDV',
		fixEndings(fs.readFileSync('words-config/WORD.MDV', {
			encoding: 'utf8'
		}))
	);
}

var app = express();
app.disable('x-powered-by');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet.crossdomain());
app.use(helmet.xframe('DENY'));
app.use(helmet.nosniff());
app.use(helmet.ienoopen());
app.use(helmet.xssFilter());
if (config.https) {
	app.use(helmet.hsts({
		maxAge: 31536000000,
		force: true
	}));
}
app.use(helmet.csp({
	defaultSrc: [
		'\'self\'',
		'www.google-analytics.com',
		'https://stats.g.doubleclick.net',
		'http://stats.g.doubleclick.net'
	],
	scriptSrc: [
		'\'self\'',
		'ajax.googleapis.com',
		'cdnjs.cloudflare.com',
		'www.google-analytics.com',
		'cdn.jsdelivr.net',
		'\'unsafe-inline\'',
		'\'unsafe-eval\''
	],
	fontSrc: [
		'fonts.gstatic.com',
		'netdna.bootstrapcdn.com'
	],
	styleSrc: [
		'\'self\'',
		'fonts.googleapis.com',
		'netdna.bootstrapcdn.com',
		'\'unsafe-inline\''
	]
}));

app.use(legEx());
app.use(compression());

app.use(cookieParser(config.sessionSecret));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(morgan(config.prodLogFormat ? 'combined' : 'dev'));
app.use(bodyParser.json());

app.use(session({
	store: new sqliteStore(),
	secret: config.sessionSecret,
	saveUninitialized: false,
	resave: false,
	cookie: {
		maxAge: 86400000 // To fix a bug in the old version of connect-sqlite3 I need to use (see the.todo)
	}
}));

app.use(function(req, res, next) {
	if (req.hostname != config.reqHost) {
		res.redirect(config.mainURL);
	} else {
		next();
	}
});

app.use(function(req, res, next) {
	// Based on https://github.com/veeti/simple-csrf/blob/master/index.js
	// Get/generate token

	var token = req.cookies['XSRF-TOKEN'];
	if (
		req.method != 'GET' &&
		req.method != 'HEAD' &&
		req.method != 'OPTIONS' &&
		!scmp(req.headers['x-xsrf-token'], token)
	) {
		var err = new Error('Invalid CSRF token.');
		err.status = 403;
		next(err);
	} else {
		if (!token) {
			res.cookie('XSRF-TOKEN', crypto.randomBytes(32).toString('hex'));
		}
		next();
	}
});

app.use(function(req, res, next) {
	// Based on koa-html-minifier + modified from expressjs source
	// For now, I've disabled this...not sure whether it would speed up anything
	// b/c it takes time to minify things. Can't cache well b/c vars. in
	// embedded JS are changing.
	return next();
	res.render = function(view, options, fn) {
		options = options || {};
		var self = this;
		var req = this.req;
		var app = req.app;
		// support callback function as second arg
		if ('function' == typeof options) {
			fn = options;
			options = {};
		}
		// merge res.locals
		options._locals = self.locals;
		// default callback to respond
		fn = fn || function(err, str) {
			if (err) {
				return req.next(err);
			}
			str = minify(str, { // No caching?
				removeComments: true,
				collapseWhitespace: true,
				conservativeCollapse: true,
				collapseBooleanAttributes: true,
				removeAttributeQuotes: true,
				removeOptionalTags: true,
				processScripts: ['text/ng-template']
			});
			self.send(str);
		};
		// render
		app.render(view, options, fn);
	};
	next();
});

app.use(assets({
	paths: [
		'public',
		'node_modules/inobounce',
		'node_modules/angularLocalStorage/src',
		'node_modules/angulartics/src',
		'node_modules/bootstrap_dropdowns_enhancement/dist/css',
		'node_modules/angular-bootstrap-switch/dist',
		'node_modules/bootstrap-switch/dist/js',
		'node_modules/bootstrap-switch/dist/css/bootstrap3',
		'node_modules/bootstrap/js',
		'node_modules/jquery-scrollparent'
	],
	build: config.minify,
	buildDir: 'build_cache',
	compress: config.minify,
	servePath: config.minify ? 'loquax/assets' : 'assets',
	precompile: ['*.js', '*.less', '*.css', '*.png'],
	compile: true,
	gzip: false,
	prefixCss: true
}));

app.use('/static', express.static(__dirname + '/static'));

// For all non-static stuff, don't cache at all.
app.use(helmet.nocache());

app.use(function(req, res, next) {
	async(next)();
});
app.use(config.prefix + '/', routes);
app.use(config.prefix + '/', apiRoutes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
/// error handlers
app.use(function(err, req, res, next) {
	if (config.stackTrace) {
		console.log('Error:', err.message, err.stack);
	}

	if (typeof err == 'string') {
		err = {
			stack: 'String message...',
			message: err
		};
	}
	err.status = err.status || 500;

	res.status(err.status);
	res.render('error', config.stackTrace ? {
		message: err.message,
		error: err
	} : {
		message: httpStatus[err.status], // Be more generic
		error: {
			status: err.status,
			stack: ''
		}
	});
});
app.listen(3000);
module.exports = app;
