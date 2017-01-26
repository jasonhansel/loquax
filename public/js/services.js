/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
	jquery: true, devel: true, unused: vars */
/* global app */
app.factory('$exceptionHandler', ['$window', '$log',
	function($window, $log) {
		return function(exception, cause) {
			$log.error.apply($log, arguments);
			// Based on https://github.com/angular/angular.js/blob/master/src/ng/exceptionHandler.js#L3
			if ($window.ga) {
				$window.ga('send', 'exception', {
					'exDescription': '[ANGULAR] ' + exception
				});
			}
		};
	}
]);
app.factory('detect', ['$window',
	function detectFactory($window) {
		return {
			touch: 'ontouchstart' in $window.document.documentElement,
			ios: /\b(?:iPhone|iPod|iPad).*?\bOS /.test($window.navigator.userAgent),
			standalone: $window.navigator.standalone,
			webkit: ('WebkitAppearance' in $window.document.documentElement.style)
			// http://stackoverflow.com/questions/12625876/how-to-detect-chrome-and-safari-browser-webkit
		};
	}
]);
app.factory('selection', ['$window',
	function selectionFactory($window) {
		return {
			get: function getHTMLOfSelection(cont) {
				// http://stackoverflow.com/questions/5083682/get-selected-html-in-browser-via-javascript
				if (!$window.getSelection) {
					return null;
				}
				var selection = $window.getSelection();
				if (selection.rangeCount > 0 && cont.find(selection.anchorNode).size() && !selection.isCollapsed) {
					var div = $window.document.createElement('div');
					[].slice.call(selection.getRangeAt(0).cloneContents().childNodes).forEach(function(node) {
						if (node.nodeName === 'LI') {
							node.appendChild($window.document.createTextNode('; '));
						}
						div.appendChild(node);
					});
					return $(div).text().replace(/; $/g, '');
				}
			},
			$sel: ''
		};
	}
]);
app.factory('demacrize', [

	function demacrizeFactory() {
		return function demacrize(str) {
			return str.split('').map(function(char) {
				var map = {
					'ā': 'a',
					'ē': 'e',
					'ī': 'i',
					'ō': 'o',
					'ū': 'u',
					'Ā': 'A',
					'Ē': 'E',
					'Ī': 'I',
					'Ō': 'O',
					'Ū': 'U',
					'ȳ': 'y'
				};
				return map[char] || char;
			}).join('');
		};
	}
]);