/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
	jquery: true, devel: true, unused: strict */
/* global app */
app.run(['$window', 'detect', '$timeout',
   function($window, detect, $timeout) {

		// OWASP break out of frames
		if ($window.self === $window.top) {
			$('#acj').remove();
		} else {
			$window.top.location = $window.self.location;
		}
		if (detect.standalone) {
			// http://blog.flinto.com/how-to-get-black-status-bars.html
			$('meta[name="apple-mobile-web-app-status-bar-style"]').remove();
		}

		function process(sheet) {
			[].forEach.call(sheet.cssRules, function(rule, j) {
				if (rule.cssRules) {
					process(rule);
				} else if (rule.type === $window.CSSRule.STYLE_RULE && /:hover/.test(rule.selectorText)) {
					var txt = rule.cssText.split('{');
					txt[0] = txt[0].split(',').filter(function(sel) {
						return !(/:hover/.test(sel));
					}).join(',').trim();
					sheet.deleteRule(j);
					if (txt[0]) {
						sheet.insertRule(txt.join('{'), j);
					}
				}
			});
		}
		if (detect.ios) {
			// Fix https://github.com/twbs/bootstrap/pull/13049
			// Based on http://retrogamecrunch.com/tmp/hover-fix
			[].forEach.call($window.document.styleSheets, function(sheet) {
				try {
					if (sheet.cssRules != null) {
						process(sheet);
					}
				} catch (e) {
					// In case the CSS file was on another domain and we can't get to it.
				}
			});
			// Fix a slight scrolling-related bug
			$window.scrollTo(0, 1);
			$timeout(function() {
				$window.scrollTo(0, 0);
			});
		}
	}
]);