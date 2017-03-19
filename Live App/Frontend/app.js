// Single page application
var app = angular.module('teeviewMovementSensorApp', ["firebase"]);

// masterController
app.controller('appController', ["$scope", function($scope) {
	// Initialize the Firebase SDK
	var config = { databaseURL: 'https://teeview-scraper-db.firebaseio.com' };
	firebase.initializeApp(config);
	// Firebase ref. Root node of Firebase Database
	var ref = firebase.database().ref();
	// Define variables
	$scope.data = {};
	// Load campaigns data
	ref.child("campaigns").once("value").then(function (snapshot) {
		// Get campaigns Firebase node
		var obj = snapshot.val();
		for (var key in obj) {
			// Get campaign Firebase node instance
			var campaign = obj[key];
			console.log("campaign.url", campaign.url);
			// Add campaign Firebase node info to $scope.data
			$scope.data[campaign.url] = {name: campaign.name, img: campaign.img, sales: [], timestamps: []};
		}
		// Load sales data
		ref.child("salesData").once("value").then(function (snapshot) {
			// Get salesData Firebase node
			var obj = snapshot.val();
			for (var key in obj) {
				// Get sales data Firebase node instance
				var salesData = obj[key];
				// Add the sales data to the position and time vector
				$scope.data[salesData.campaignUrl].sales.push(salesData.sales);
				$scope.data[salesData.campaignUrl].timestamps.push((new Date(salesData.timestamp*1000)).toString());
			}
			// Update $scope
			$scope.$apply();
		});
	});
}]);