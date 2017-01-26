/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
	jquery: true, devel: false, unused: vars */
/* global app, angular */
app.directive('swipeableCard', ['$swipe', '$document', '$timeout',
	function($swipe, $document, $timeout) {
		return {
			restrict: 'A',
			scope: {
				'state': '='
			},
			transclude: true,
			template: '<div ng-transclude class="flipper"></div>',
			link: function($scope, $el) {
				var startLeft, oldX, isSwiping = false,
					justSwiped = false,
					leftVal = 0;
				var swipeEvents = {
					start: function(coords, e) {
						if ($scope.state == 'unexposed') {
							isSwiping = true;
							oldX = leftVal;
							startLeft = coords.x - leftVal;
						}
					},
					move: function(coords, e) {
						if (isSwiping) {
							if (coords.x - startLeft < 0) {
								leftVal = coords.x - startLeft;
								$el.css({
									x: leftVal
								});
							} else {
								swipeEvents.start(coords, e);
							}
						}
					},
					end: function(coords, e) {
						if (Math.abs(leftVal - oldX) > 25) {
							justSwiped = true;
						}
						swipeEvents.doEnd();
					},
					doEnd: function(coords, e) {
						if (isSwiping) {
							isSwiping = false;
							leftVal = (leftVal <= -100) ? -100 : 0;
							$el.transition({
								x: leftVal
							}, 400, 'easeOutCubic');
						}
					},
					cancel: function(e) {
						if (isSwiping) {
							isSwiping = false;
							leftVal = oldX;
							$el.transition({
								x: leftVal
							}, 400, 'easeOutCubic');
						}
					}
				};
				// Based on https://github.com/TheSharpieOne/angular-off-click/blob/master/offClick.js
				$document.on('click touchstart', function(e) {
					var target = e.target || e.srcElement;
					if (!($el.parent()[0].contains(target))) {
						leftVal = 0;
						$el.transition({
							x: leftVal
						}, 400, 'easeOutCubic');
					}
				});
				$el.parent().find('.exposed-buttons').click(function() {
					$timeout(function() {
						leftVal = 0;
						$el.css({
							x: leftVal
						});
					});
				});
				$el.click(function() {
					if (justSwiped) {
						justSwiped = false;
					} else {
						$el.toggleClass('flipped');
					}
				});
				$el.mouseleave(swipeEvents.doEnd);
				$swipe.bind($el, swipeEvents);
			}
		};
	}
]);
app.directive('fastClick', ['$window',
	function($window) {
		return {
			restrict: 'A',
			link: function(scope, el) {
				$window.FastClick.attach(el[0]);
			}
		};
	}
]);
app.directive('selectOnFocus', [

	function() {
		return {
			restrict: 'A',
			link: function($scope, el) {
				el.focus(function() {
					this.setSelectionRange(0, 9999); // For iOS, use this instead of select()
					$(this).one('mouseup', false); // For Chrome, don't deselect on mouseup
				});
			}
		};
	}
]);
app.directive('touchFix', ['selection',
	// Needed for when tap-to-choose disabled
	function(selection) {
		return {
			restrict: 'A',
			scope: false,
			link: function($scope, el) {
				el.on('touchstart', function() {
					selection.$sel = selection.get(el.closest('section').find('ul'));
					$('.search').focus().blur(); // Prevent "ghost" selections on iOS
					el.click();
					return false;
				});
			}
		};
	}
]);
app.directive('linkfix', ['$window',
	// modified from https://gist.github.com/irae/1042167
	function($window) {
		return {
			link: function($scope, el, a) {
				/*jshint unused: false */
				if ($window.navigator.standalone) {
					el.click(function(e) {
						e.preventDefault();
						$window.location.href = a.href;
					});
				}
			}
		};
	}
]);
app.directive('ngEnter', [

	function() {
		// Based on https://gist.github.com/EpokK/5884263
		return {
			restrict: 'A',
			scope: {
				'ngEnter': '&'
			},
			link: function($scope, el) {
				el.keypress(function(e) {
					if (e.keyCode === 13) {
						$scope.ngEnter();
					}
				});
			}
		};
}]);
app.directive('ngHtmlCompile', ['$compile', 'initialData',
	// Based on http://ngmodules.org/modules/ng-html-compile
	function($compile, initialData) {
		return {
			restrict: 'A',
			scope: {
				chooseVal: '=?',
				ngHtmlCompile: '='
			},
			link: function($scope, el, attrs) {

				$scope.$watch('ngHtmlCompile', function(newValue) {
					el.html(newValue);

					el.find('.foreign').addClass('text-muted');
					el.find('abbr, .foreign').addClass('small');
					el.find('strong').attr('chooseable', 'true');
					el.find('.can-choose').attr('chooseable', 'true');

					el.find('[chooseable]').wrapInner('<inner>').attr('ng-click', 'clickChoose($event)');

					$compile(el.contents())($scope);

					// Not sure why I need this, but I do. Otherwise, the first click gets ignored.
					$scope.chooseVal = null;

					$scope.clickChoose = function(e) {
						if (initialData.isLoggedIn) {
							var $el = $(e.target);
							el.find('.chosen').not($el).removeClass('chosen');
							if (!$el.hasClass('chosen')) {
								$el.addClass('chosen');
								$scope.chooseVal = $el.text();
							} else {
								$el.removeClass('chosen');
								$scope.chooseVal = null;
							}
						}
					};
				});
			}
		};
	}
]);
app.directive('labelFix', ['detect',
	function(detect) {
		return {
			restrict: 'A',
			link: function($scope, el) {
				if (detect.ios) {
					el.find('span, i').click(function() {
						el.click();
					});
				}
			}
		};
	}
]);
app.directive('clickBlock', [

	function() {
		return {
			restrict: 'A',
			link: function($scope, el) {
				el.click(function(e) {
					e.stopPropagation();
				});
			}
		};
	}
]);
app.directive('loadingButton', [

	function() {
		return {
			restrict: 'E',
			transclude: true,
			scope: false,
			templateUrl: '/tpl.html',
			link: function($scope, el, attrs) {
				$scope.btnClass = attrs.btnClass;
				$scope.loading = false;
				$scope.load = function() {
					$scope.loading = true;
					var prom = $scope.$eval(attrs.start);
					if (prom && prom.then) {
						prom.then(function() {
							$scope.loading = false;
						}, function(obj) {
							$scope.loading = false;
							$scope.$emit('addalert', {
								type: 'danger',
								text: ('Error: ' + obj.status + ' ' + obj.statusText)
							});
						});
					} else {
						$scope.loading = false;
					}
				};
			}
		};
}]);
app.directive('detectClasses', ['detect',
	function(detect) {
		return {
			restrict: 'A',
			scope: false,
			link: function($scope, el, attrs) {
				for (var i in detect) {
					if (detect[i]) {
						el.addClass(i);
					}
				}
			}
		};
	}
]);
app.directive('searchBlur', [

	function() {
		return {
			restrict: 'A',
			scope: false,
			link: function($scope, el) {
				// For iOS
				el.scroll(function() {
					$('input:text').blur();
				});
			}
		};
	}
]);

app.directive('scrollIf', ['$window',
	function($window) {

		function scroll(elem) {
			if (elem.size() && elem.parent().size()) {
				// This solution works better than scrollIntoView, trust me
				var $parent = elem.scrollParent();
				if ($parent.is('html')) {
					$window.scrollTo($window.scrollX, elem.offset().top - $('.below-header').offset().top + 2);
				} else {
					$parent[0].scrollTop += elem.offset().top - $parent.offset().top;
				}
			}
		}

		return {
			restrict: 'A',
			scope: {
				'scrollIf': '=',
				'scrollIndex': '='
			},
			link: function($scope, el) {

				$scope.$watch('scrollIf', function(nu, old) {
					if (nu) {
						scroll(el);
					}
				});
				$scope.$watch('scrollIndex', function() {
					if ($scope.scrollIf) {
						scroll(el);
					}
				});
			}
		};
	}
]);