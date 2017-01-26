/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
		jquery: false, devel: true, unused: strict */
app.config(['$animateProvider',
	function($animateProvider) {
		$animateProvider.classNameFilter(/do-anim|modal|alert/);
	}
]);
app.config(['$routeProvider',
	function($routeProvider) {
		$routeProvider
			.when('/cards/:set?', {
				controller: 'CardListCtrl',
				templateUrl: '/cardlist.htm',
				activePage: 'cards'
			})
			.when('/combine', {
				controller: 'CombineCtrl',
				templateUrl: '/combine.htm',
				activePage: 'combine'
			})
			.when('/search', {
				controller: 'SearchCtrl',
				templateUrl: '/search.htm',
				activePage: 'search'
			})
			.otherwise({
				redirectTo: '/search'
			});
	}
]);