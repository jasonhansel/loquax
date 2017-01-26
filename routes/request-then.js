// Based on https://raw.githubusercontent.com/krusty-krab/request-then/master/lib/request-then.js


'use strict';

var request = require('request');
var Promise = require('bluebird');

module.exports = function makeRequest (options) {
	if (typeof options === 'string') {
		options = {
			uri: options,
			method: 'GET'
		};
	}

	if(!options.headers) {
		options.headers = {};
	}
	options.gzip = true;
	options.headers['User-Agent'] = 'I am an iPhone OS - trust me';


	return new Promise(function resolver (resolve, reject) {
		request(options, function (error, response) {
			if (error || response.statusCode < 200 || response.statusCode >= 300) {

				// console.log([error, response]);
				var err = new Error('Request Error');
				err.status = 500;
				err.data = [error, response];
				reject(err);
			} else {
				response.body = response.body ? JSON.parse(response.body) : null;
				resolve(response);
			}
		});
	});
};