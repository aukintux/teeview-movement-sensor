// Single page application
var app = angular.module('teeviewMovementSensorApp', ["firebase", "ngMaterial"]);

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
	$scope.isLoading = true;
	// Check if every element in array is equal i.e. there is no movement in the campaign
	function identical(array) {
	    for(var i = 0; i < array.length - 1; i++) {
	        if(array[i] !== array[i+1]) {
	            return false;
	        }
	    }
	    return true;
	}
	// Define page updater function
	function pageUpdater () {
		$scope.isLoading = true; 
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
				// Filter campaignsData into plotDataAry. Select only those which show movement
				for (var key in $scope.campaignData) {
					var item = $scope.campaignData[key];
					// Add campaign if there is movement i.e. if all sale data points are not equal
					if (identical(item.sales)===false) {
						console.log(item.sales);
						item["lastSaleCount"] = item.sales[item.sales.length - 1];
						$scope.plotDataAry.push(item);				
					}
				}
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
							yaxis: {title: 'Sales'},
							margin: {t: 20},
							hovermode: 'closest'
						};
						Plotly.newPlot("plotly-"+item.url, data, layout);
					});
				});
				// Update $scope
				$scope.$apply();
				// Finished loading
				$scope.isLoading = false;
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