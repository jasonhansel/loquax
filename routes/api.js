/* jshint undef:true, node: true, loopfunc: true, maxlen: 160, camelcase: false */

var express = require('express'),
	Promise = require('bluebird'),
	await = require('asyncawait/await'),
	requestThen = require('./request-then'),
	logger = require('tracer').console({
		format: "{{file}}:{{line}} {{message}}"
	});
require('sugar');

var router = express.Router();

router.post('/combine', function(req, res) {
	var post = req.body;

	if (!post.setName.trim() || !post.sets.length) {
		res.send(500);
		return;
	}

	var setData = Object.values(
		await(Promise.map(post.sets, function(setID) {
			return requestThen({
				uri: 'https://api.quizlet.com/2.0/sets/' + encodeURIComponent(setID) + '/terms',
				auth: {
					bearer: req.session.token.access_token
				}
			});
		})).map('body').flatten().filter(function(card) {
			return card.term != 'Ignore me!';
		}).groupBy(function(card) {
			return card.term.replace(/[.\-]/g, '');
		})
	).map(function(group) {
		return {
			term: group[0].term,
			definition: group.map('definition').map(function(def) {
				if (post.removeGrammar) {
					return def.remove(/^.*? :: /);
				} else {
					return def;
				}
			}).unique().join('; ')
		};
	});

	var newSet = await(requestThen({
		uri: 'https://api.quizlet.com/2.0/sets',
		method: 'POST',
		form: {
			title: post.setName,
			'terms': setData.map('term'),
			'definitions': setData.map('definition'),
			lang_terms: 'la',
			lang_definitions: 'en',
			visibility: 'only_me'
		},
		auth: {
			bearer: req.session.token.access_token
		}
	})).body;
	res.send(200, {
		id: newSet.set_id,
		term_count: newSet.term_count,
		title: post.setName
	});
});

router.post('/deletecard', function(req, res) {
	var post = req.body;
	console.log('https://api.quizlet.com/2.0/sets/' + post.set_id + '/terms/' + post.card_id);
	await(requestThen({
		uri: 'https://api.quizlet.com/2.0/sets/' + post.set_id + '/terms/' + post.card_id,
		method: 'DELETE',
		auth: {
			bearer: req.session.token.access_token
		}
	}));
	res.send(200);
});

router.post('/savecard', function(req, res) {
	var post = req.body;
	await(requestThen({
		uri: 'https://api.quizlet.com/2.0/sets/' + encodeURIComponent(post.set_id) + '/terms/' + encodeURIComponent(post.term_id),
		method: 'PUT',
		auth: {
			bearer: req.session.token.access_token
		},
		form: {
			'term': post.term,
			'definition': post.definition
		}
	}));
	res.send(200);
});

router.get('/getfullset', function(req, res) {
	var get = req.query;
	var setData = await(requestThen({
		uri: 'https://api.quizlet.com/2.0/sets/' + encodeURIComponent(get.id) + '/terms',
		auth: {
			bearer: req.session.token.access_token
		}
	})).body.map(function(card) {
		return [card.term, card.definition, card.id];
	});
	res.send(setData);
});

router.post('/addcard', function(req, res) {

	var post = req.body;

	if (post.create) {
		var newSet = await(requestThen({
			uri: 'https://api.quizlet.com/2.0/sets',
			method: 'POST',
			form: {
				title: post.setName,
				'terms': ['Ignore me!', post.term],
				'definitions': ['Ignore me!', post.def],
				lang_terms: 'la',
				lang_definitions: 'en',
				visibility: 'only_me'
			},
			auth: {
				bearer: req.session.token.access_token
			}
		})).body;
		res.send(200, {
			id: newSet.set_id,
			term_count: 1, // will be incremented by client
			title: post.setName
		});
	} else {
		await(requestThen({
			uri: 'https://api.quizlet.com/2.0/sets/' + encodeURIComponent(post.setName) + '/terms',
			method: 'POST',
			form: {
				term: post.term,
				definition: post.def
			},
			auth: {
				bearer: req.session.token.access_token
			}
		}));
		res.send(200); // 204s are bad: https://bugzilla.mozilla.org/show_bug.cgi?id=521301
	}
});

module.exports = router;