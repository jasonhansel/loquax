/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
	jquery: true, devel: true, unused: strict */
/* global angular, initialData */
/* exported app */

//= require modified-ui-bootstrap-custom-tpls-0.10.0
//= require angularLocalStorage
//= require inobounce.min
//= require angulartics
//= require angulartics-ga
//= require transition
//= require bootstrap-switch
//= require angular-bootstrap-switch
//= require jquery.scrollparent

//= require_self

//= require js/config
//= require js/run
//= require js/services
//= require js/controllers
//= require js/directives

// ui-boostrap needed to be modified so that the backdrop animation
// would run in parallel with, rather than after, the modal-dialog animation.

var app = angular.module('loquax', [
	'angularLocalStorage',
	'ngCookies',
	'ngAnimate',
	'ngTouch',
	'ngRoute',
	'ui.bootstrap',
	'angulartics',
	'angulartics.google.analytics',
	'frapontillo.bootstrap-switch'
]);

angular.module('loquax').value('initialData', initialData);

if (initialData.analytics) {
	// Based on Google Analytics snippet from
	// https://developers.google.com/analytics/devguides/collection/analyticsjs/advanced
	window.ga = window.ga || function() {
		(ga.q = ga.q || []).push(arguments)
	};
	ga.l = +new Date;
	var opts = {
		'siteSpeedSampleRate': 100
	};
	if (initialData.localhost) {
		opts.cookieDomain = 'none';
	}
	if (initialData.username) {
		opts.userId = initialData.username;
	}
	ga('create', initialData.analytics, opts);
	ga('require', 'displayfeatures');
}