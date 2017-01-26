/* jshint undef:true, node: true, loopfunc: true, maxlen: 160, camelcase: false */

var express = require('express'),
	Promise = require('bluebird'),
	await = require('asyncawait/await'),
	config = require('config'),
	uidSafe = require('uid-safe'),
	logger = require('tracer').console({
		format: '{{file}}:{{line}} {{message}}'
	}),
	requestThen = require('./request-then.js'),
	ExpressBrute = require('express-brute'),
	whittaker = require('./whittaker.js'),
	lewis = require('./lewis.js');
require('sugar');

var router = express.Router();

function getSets(req) {
	var sets = !req.session.token ? null : await(requestThen({
		uri: 'https://api.quizlet.com/2.0/users/' + encodeURIComponent(req.session.token.user_id),
		auth: {
			bearer: req.session.token.access_token
		},
		gzip: true
	})).body.sets;
	sets = sets.sortBy('modified_date', true);
	return sets.slice(0, 60).map(function(x) {
		return {
			'id': x.id,
			'title': x.title,
			'term_count': x.term_count
		};
	});
}

router.get('/dictionary.sqlite', function(req, res) {
	res.download('dictionary.sqlite');
});

router.get('/', function(req, res) {

	req.session.loginState = await(Promise.promisify(uidSafe)(15));

	res.render('index', {
		init: JSON.stringify({
			loginURI: 'https://quizlet.com/authorize/?client_id=' +
				config.clientID +
				'&response_type=code&scope=read%20write_set&state=' +
				req.session.loginState +
				'&redirect_uri=' +
				encodeURIComponent(config.redirectURL),
			username: req.session.token ? req.session.token.user_id : null,
			isLoggedIn: !!req.session.token,
			dataCache: req.session.token ? getSets(req) : [],
			analytics: config.analytics,
			localhost: config.localhost
		})
	});

});

router.get('/login', function(req, res) {
	if (req.query.logout === 'true') {
		if (config.cookieSession) {
			req.session = null;
		} else {
			req.session.destroy();
		}

		res.redirect(config.prefix + '/?loggedOut=true');
	} else if (req.query.error) {

		throw new Error('Login error');
	} else if (req.query.code) {
		if (config.constantToken || req.query.state === req.session.loginState) {
			var token = await(requestThen({
				uri: 'https://api.quizlet.com/oauth/token',
				method: 'POST',
				form: {
					'code': req.query.code,
					'redirect_uri': config.redirectURL,
					'grant_type': 'authorization_code'
				},
				auth: {
					user: config.clientID,
					pass: config.secret
				}
			})).body;
			req.session.token = token;
			res.redirect(config.prefix + '/');
		} else {
			res.send(500);
		}
	}
});

var limit = new ExpressBrute(
	// Should be sufficient to prevent
	// people trying to DDOS the server
	// by running shell commands too quickly.
	new ExpressBrute.MemoryStore(), {
		failCallback: ExpressBrute.FailTooManyRequests,
		freeRetries: 200,
		minWait: 1
	}
);

// Lookup
router.get('/lookup', /* limit.prevent, */ function(req, res) {
	var search = req.query.search;
	if (req.query.parse == 'true') {
		res.send(whittaker(search, config.whDir, config.whExec));
	} else {
		res.send(lewis(search));
	}
});
module.exports = router;