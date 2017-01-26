/* jshint undef: true, loopfunc: true, maxlen: 160, camelcase: false,
		jquery: false, devel: true, unused: vars */
/* global app, angular */
///// Controllers: main app
app.controller('CombineCtrl', ['$scope', '$http',
	function($scope, $http) {
		$scope.$on('addalert', function(e, alert) {
			$scope.alert = alert;
		});
		$scope.doCombine = function() {
			return $http.post('combine', {
				sets: $scope.setList.filter(function(set) {

					return set.chosen;
				}).map(function(set) {
					return set.id;
				}),
				removeGrammar: $scope.removeGrammar,
				setName: $scope.setName
			}).success(function(dat) {
				$scope.setList.splice(1, 0, dat);
				$scope.$emit('addalert', {
					type: 'success',
					text: 'Created set!'
				});
			});
		};
	}
]);
app.controller('MainCtrl', [
	'$scope', 'storage', '$modal', 'initialData', '$route', '$window',
	function($scope, $als, $modal, initialData, $route, $window) {
		// console.log("hey");
		// console.log(initialData);
		$scope.$route = $route; // http://zachwills.net/current-page-highlighting-angularjs-application/

		if (!initialData.isLoggedIn && $window.location.search != '?loggedOut=true') {
			$modal.open({
				templateUrl: '/logIn.htm',
				keyboard: false,
				scope: $scope,
				backdrop: 'static'
			});
		}
		$scope.openSettings = function() {
			$modal.open({
				templateUrl: '/settingsPage.htm',
				keyboard: false,
				scope: $scope,
				backdrop: 'static'
			});
		};
		$als.bind($scope, 'settings', {
			defaultValue: {
				parseMode: false,
				hideDefs: false
			}
		});
		$scope.loginURI = initialData.loginURI;
		$scope.username = initialData.username;
		$scope.isLoggedIn = initialData.isLoggedIn;
		$scope.setList = [{
			id: 'create',
			title: 'Create set:'
		}].concat(initialData.dataCache || []);
		$scope.o = {};
	}
]);
app.controller('SearchCtrl', ['$scope', '$http', 'initialData', '$q', '$routeParams',
	function($scope, $http, initialData, $q, $routeParams) {

		$scope.searchBox = '';
		if ($routeParams.word) {
			$scope.searchBox = $routeParams.word;
		}
		$scope.clearSearch = function() {
			$scope.searchBox = '';
		};
		var canceller = {
			resolve: function() {}
		};

		$scope.$watchGroup(['searchBox', 'settings.parseMode'], function() {
			if ($scope.searchBox.trim()) {
				canceller.resolve();
				canceller = $q.defer();
				$http.get('lookup', {
					params: {
						search: $scope.searchBox,
						parse: $scope.settings.parseMode ? true : false
					},
					timeout: canceller.promise
				}).success(function(data) {
					$scope.searchResults = data;
				});
			} else {
				$scope.searchResults = [];
			}
		});
	}
]);

///// Controllers: search pane
app.controller('EntryCtrl', ['$scope', '$modal', 'selection', 'detect', 'demacrize',
	function($scope, $modal, selection, detect, demacrize) {

		$scope.choices = {};

		function shorten(x) {
			return x.trim().replace(/\s+/g, ' ');
		}

		function stripTags(x) {
			return $('<div>').html(x).text();
		}

		function fixDef(x) {
			return $('<div>').html(x).find('li').get().map(function(y) {
				return shorten($(y).text());
			}).join('; ');
		}

		$scope.doShowCard = function($event) {
			var $section = $($event.target).closest('section');
			// Get term
			var chosenTerm = demacrize($scope.choices.header || '');
			var term = $scope.result.cardtitle + (chosenTerm ? ' + ' + chosenTerm : '');
			// Get definition

			var selHTML = (
				$scope.choices.def
			) || shorten(fixDef($scope.result.text.defs));
			// Get grammar

			var gramm = shorten($scope.result.text.heading + stripTags($scope.result.text.grammar || ''));
			// Go!
			var toCast = {
				term: shorten(term),
				def: 'from ' + gramm + ' :: ' + shorten(selHTML)
			};
			$modal.open({
				templateUrl: '/addCard.htm',
				keyboard: false,
				controller: 'AddCardCtrl',
				backdrop: 'static',
				resolve: {
					cardData: function() {
						return toCast;
					}
				},
				scope: $scope.$parent.$parent
				// ^ Using this instead of just $scope reduces flickering bugs on Chrome (for iOS? what did I mean?),
				// since clearSearch destroys $scope (I think.)
			});
		};
}
]);
app.controller('AddCardCtrl', ['$scope', '$http', 'cardData',
	function($scope, $http, cardData) {
		$scope.alert = null;
		$scope.markers = {};
		$scope.$on('addalert', function(e, alert) {
			$scope.alert = alert;
		});
		$scope.card = {
			term: cardData.term,
			def: cardData.def,
			setName: '',
			set: $scope.setList[1] ? $scope.setList[1].id : 'create'
		};
		$scope.addCard = function() {
			var data = {
				term: $scope.card.term,
				def: $scope.card.def,
				create: $scope.card.set == 'create'
			};
			var markers = '';
			for (var i in $scope.markers) {
				if ($scope.markers[i]) {
					markers += ' (' + i + ')';
				}
			}
			data.def += markers;
			if (data.create) {
				if (!$scope.card.setName) {
					$scope.$emit('addalert', {
						type: 'danger',
						text: 'Error: Please enter a set name.'
					});
					return;
				}
				data.setName = $scope.card.setName;
			} else {
				data.setName = $scope.card.set;
			}
			return $http.post('addcard', data).success(function(dat) {
				if (data.create) {
					$scope.setList.splice(1, 0, dat);
					$scope.card.set = dat.id;
				}
				$scope.setList.forEach(function(set) {
					if (set.id == $scope.card.set) {
						set.term_count++;
					}
				});
				$scope.$emit('addalert', {
					type: 'success',
					text: 'Added card!'
				});
			});
		};
		$scope.closeCard = function() {
			$scope.$close();
			$scope.clearSearch(); // Don't do this after $close because of iOS
		};
	}
]);
///// Controllers: cards pane
app.controller('CardListCtrl', [
	'$scope', '$http', '$filter', '$routeParams', '$location',
	function($scope, $http, $filter, $routeParams, $location) {
		// Changing sets
		if ($routeParams.set) {
			$scope.o.showSet = parseInt($routeParams.set);
		} else if ($scope.setList[1]) {
			$location.path('/cards/' + $scope.setList[1].id);
		}
		$scope.cards = [];
		$scope.$watch('o.showSet', function(x, old) {
			if (x != old) {
				$location.path('/cards/' + x);
			}
		});
		if (!$routeParams.set) {
			$scope.cards = [];
			$scope.atCard = undefined;
		} else {
			$http.get('getfullset', {
				params: {
					id: $scope.o.showSet
				}
			}).success(function(dat) {
				$scope.cards = dat.filter(function(card) {
					return card[0] != 'Ignore me!';
				}).map(function(card, index) {
					return {
						term: card[0],
						sortTerm: card[0].toLowerCase().replace(/[-()]/g, ''),
						definition: card[1],
						id: card[2],
						setId: $scope.o.showSet,
						number: index // If alphabetical, keep track of original index
					};
				});
				$scope.atCard = $scope.getFirst();
			});
		}
		// Sorting
		$scope.sortAlpha = false;

		$scope.sortedCards = function() {
			return $filter('orderBy')($scope.cards, $scope.sortAlpha ? 'sortTerm' : 'number');
		};

		// Searching and movement
		$scope.moveCurrent = function() {
			$scope.atCard = $scope.getNext() || $scope.getPrev();
		};
		$scope.matches = function(card) {
			return $scope.setSearch && (
				card.term.toLowerCase().indexOf($scope.setSearch.toLowerCase()) > -1 ||
				card.definition.toLowerCase().replace(/^from/g, '').indexOf($scope.setSearch.toLowerCase()) > -1
			);
		};

		function getIndex() {
			return $scope.sortedCards().indexOf($scope.atCard);
		}
		$scope.getFirst = function getFirst() {
			return $scope.sortedCards().filter($scope.matches)[0];
		};
		$scope.getPrev = function() {
			return $scope.sortedCards().slice(0, getIndex()).reverse().filter($scope.matches)[0];
		};
		$scope.getNext = function() {
			return $scope.sortedCards().slice(getIndex() + 1).filter($scope.matches)[0];
		};
		$scope.indexInfo = function() {
			var matches = $scope.sortedCards().filter($scope.matches);
			return (matches.indexOf($scope.atCard) + 1) + '/' + matches.length;
		};
	}
]);
app.controller('EditCardCtrl', ['$scope', '$http', '_cardToEdit', 'cardToEdit',
	function($scope, $http, originalCard, cardToEdit) {
		$scope.alert = null;
		$scope.$on('addalert', function(e, alert) {
			$scope.alert = alert;
		});
		$scope.cardToEdit = cardToEdit;
		$scope.saveCard = function() {
			return $http.post('savecard', {
				term_id: $scope.cardToEdit.id,
				set_id: $scope.cardToEdit.setId,
				term: $scope.cardToEdit.term,
				definition: $scope.cardToEdit.definition,
			}).success(function() {
				angular.extend(originalCard, $scope.cardToEdit);
				originalCard.sortTerm = originalCard.term.toLowerCase().replace(/[-()]/g, '');
				$scope.$emit('addalert', {
					type: 'success',
					text: ('Saved card!')
				});
			});
		};
	}
]);
app.controller('RowCardCtrl', ['$scope', '$modal', '$http', '$timeout',
	function($scope, $modal, $http, $timeout) {
		$scope.leftVal = 0;
		$scope.delta = 0;
		$scope.deleteCard = function(card) {
			$scope.state = 'unexposed';
			$scope.delCard = card;
			var delModal = $modal.open({
				templateUrl: '/deleteCard.htm',
				keyboard: false,
				backdrop: 'static',
				scope: $scope,
				windowClass: 'delete-modal',
				backdropClass: 'delete-backdrop'
			});
			delModal.result.then(function(doDel) {
				if (doDel) {
					$http.post('deletecard', {
						card_id: card.id,
						set_id: $scope.o.showSet
					}).success(function() {
						if ($scope.atCard == card) {
							$scope.moveCurrent();
						}
						$scope.setList.forEach(function(set) {
							if (set.id == $scope.o.showSet) {
								set.term_count--;
							}
						});
						$scope.cards.forEach(function(thisCard) {
							if (thisCard.number > card.number) {
								thisCard.number--;
							}
						});
						$scope.cards.splice($scope.cards.indexOf(card), 1);
					});
				}
			});
		};
		$scope.state = 'unexposed';
		$scope.editing = {};
		$scope.editCardInline = function(card) {
			$scope.state = 'inline-edit';
			$scope.editing = angular.extend({}, card);
		};
		$scope.cancelEdit = function() {
			$scope.state = 'unexposed';
		};
		$scope.saveEdit = function() {
			$scope.state = 'saving';
			$timeout(function() {
				$http.post('savecard', {
					term_id: $scope.editing.id,
					set_id: $scope.editing.setId,
					term: $scope.editing.term,
					definition: $scope.editing.definition,
				}).success(function() {
					$scope.state = 'unexposed';
					angular.extend($scope.card, $scope.editing);
					$scope.card.sortTerm = $scope.card.term.toLowerCase().replace(/[-()]/g, '');
					if ($scope.card == $scope.atCard && !$scope.matches($scope.card)) {
						$scope.moveCurrent();
					}
				});
			});
		};
	}
]);