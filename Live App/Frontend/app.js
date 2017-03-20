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
	$scope.campaignData = {};
	$scope.plotDataAry = [];
	$scope.infoData = {};
	// Define page updater function
	function pageUpdater () {
		// Reset variables
		$scope.campaignData = {};
		$scope.plotDataAry = [];
		$scope.infoData = {};
		// Load campaigns data
		ref.child("campaigns").once("value").then(function (snapshot) {
			// Get campaigns Firebase node
			var obj = snapshot.val();
			for (var key in obj) {
				// Get campaign Firebase node instance
				var campaign = obj[key];
				// Add campaign Firebase node info to $scope.data
				$scope.campaignData[campaign.url] = {url: campaign.url, name: campaign.name, img: campaign.img, sales: [], timestamps: []};
			}
			// Load sales data
			ref.child("salesData").once("value").then(function (snapshot) {
				// Get salesData Firebase node
				var obj = snapshot.val();
				for (var key in obj) {
					// Get sales data Firebase node instance
					var salesData = obj[key];
					// Add the sales data to the position and time vector
					$scope.campaignData[salesData.campaignUrl].sales.push(salesData.sales);
					var date = new Date(salesData.timestamp*1000);
					var formatedPlotlyDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
					$scope.campaignData[salesData.campaignUrl].timestamps.push(formatedPlotlyDate);
				}
				// Process campaignsData into plotDataAry
				for (var key in $scope.campaignData) {
					var item = $scope.campaignData[key];
					item.maxSales = Math.max(item.sales);
					$scope.plotDataAry.push(item);				
				}
				// Sort plotDataAry by maxSales in descending order
				$scope.plotDataAry = $scope.plotDataAry.sort(function (a, b) {
					return b.maxSales - a.maxSales;
				});
				// Plot each campaign once the html has finished rendering
				$(function (arguments) {
					angular.forEach($scope.plotDataAry, function (item, index) {
						var data = [
							{
								x: item.timestamps,
								y: item.sales,
								type: 'scatter'
							}
						];
						var layout = {
						    title: item.name,
						    showlegend: false
						};
						Plotly.newPlot("plotly-"+item.url, data, layout);
					});
				});
				// Update $scope
				$scope.$apply();
			});
		});
		// Load config data
		ref.child("config").once("value").then(function (snapshot) {
			var configObj = snapshot.val();
			$scope.infoData = { latestCampaignLink: configObj.latestCampaignLink, lastQueryTimestamp: (new Date(configObj.lastQueryTimestamp*1000)).toString()};
		});
	}
	// Set up listener on config/timestamp Firebase node value change
	ref.child("config/lastQueryTimestamp").on("value", function (snapshot) {
		pageUpdater();
	});
}]);