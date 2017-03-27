// // Import modules
const express = require("express");
const request = require("tinyreq");
const cheerio = require("cheerio");
const admin = require("firebase-admin");
const fs = require("fs");

// Create app with Express
const app = express();

// Authenticate Server to Firebase
const serviceAccount = require("./config/teeview-scraper-db-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://teeview-scraper-db.firebaseio.com"
});

// Get Firebase db and its main nodes
const db = admin.database();
const campaignsRef = db.ref("campaigns");
const salesDataRef = db.ref("salesData");
const configRef = db.ref("config");

// Define routes
app.get('/', (req, res) => {
    // If the request came from the cron task specified in cron.yaml go on
    if (req.headers["x-appengine-cron"] === "true") {
        // Updates config node in Firebase
        function updateConfig (newConfigObject) {
            for (var key in newConfigObject) {
                // Update config object
                config[key] = newConfigObject[key];
                // Update config Firebase node
                configRef.child(key).set(newConfigObject[key]);
            }
            console.log("Updated config Firebase node");
        }

        // ####---- First Function: Loads Config Firebase Node ----####

        // Define variables
        var config = {};
        // Loads the config Firebase node into the config object
        function loadConfig () {
            configRef.once("value").then(function (snapshot) {
                // Load the config node into the config object
                config = snapshot.val();
                console.log("Loaded config object");
                // Start the loop by cleaning the database
                cleanDatabaseOnFirebase();
            });
        }

        // ####---- Second Function: Cleans the Firebase Database ----####

        // Define variables
        var cleanCampaignUrls = [];
        // Cleans up the Firebase database where necessary
        function cleanDatabaseOnFirebase () {
            console.log("Started cleaning Firebase database");
            // Make asynchronous call to fetch all campaigns
            campaignsRef.once("value").then(function(snapshot) {
                var obj = snapshot.val();
                // Update cleanCampaignUrls
                for (var key in obj) {
                    cleanCampaignUrls.push(obj[key].url);
                }
                // Loop through each campaign and clean Firebase it appropriate
                cleanCampaignFromFirebase(0);
            });
        }
        // Cleans everything associated to the i-th campaign on Firebase if necessary
        function cleanCampaignFromFirebase (i) {
            if (i < cleanCampaignUrls.length) {
                // Log progress of function
                var progressPercentage = 100*i/cleanCampaignUrls.length;
                console.log(progressPercentage.toFixed(2) + "%");
                // Get campaign on Teespring
                var campaignUrl = cleanCampaignUrls[i];
                request(campaignUrl, function (err, body) {
                    // If error return
                    if (err) { return console.log("Error in request @ addCampaignToFirebase: ", err); }
                    // Parse body into "$" variable
                    var $ = cheerio.load(body); 
                    // Sales data text on campaign
                    var salesDataText = $(".persistent_timer__order_count").text().toLowerCase();
                    // Message on html element if campaign ended
                    var campaignEnded = $(".persistent_timer__stats--relaunchable").length > 0;
                    // Delete associated rows in "campaigns" and "sales_data" tables if: campaign has ended, not reporting sales data element, or not reporting sales data
                    if (campaignEnded || salesDataText.length===0 || (salesDataText.indexOf("only") === -1 && salesDataText.indexOf("sold") === -1)) {
                        console.log("Delete " + campaignUrl + " from Firebase");
                        // Delete all sales data related to campaign. Asynchronous.
                        salesDataRef.orderByChild("campaignUrl").equalTo(campaignUrl).on("child_added", function (snapshot) {
                            snapshot.ref.remove();
                        }, function (err) {
                            console.log("The read failed: " + err.code);
                        });
                        // Delete actual campaign (there should be only one campaign)
                        campaignsRef.orderByChild("url").equalTo(campaignUrl).limitToFirst(1).on("child_added", function (snapshot) {
                            snapshot.ref.remove();
                            // Go on to check and delete next campaign if necessary
                            cleanCampaignFromFirebase(i+1);
                        }, function (err) {
                            console.log("The read failed: " + err.code);
                        });
                    } else {
                        // Go on to check and delete next campaign if necessary
                        cleanCampaignFromFirebase(i+1);
                    }
                });
            } else {
                console.log("Finished cleaning Firebase database");
                // Go on to the next step
                scrapeTeeview();
            }
        }

        // ####---- Third Function: Scrapes Teeview.org ----####

        // Define variables
        var continueScraping = true;
        var teeviewData = [];
        // Scrapes Teeview.org
        function scrapeTeeview () {
            console.log("Started scraping teeview.org");
            scrapeTeeviewPage(1);
        }
        // Scrapes teeview page
        function scrapeTeeviewPage (page) {
            // Log progress of function
            console.log("Scraping page " + page + " of teeview.org");
            // Make request to teeview and scrape campaigns
            request("https://www.teeview.org/site/index?active=true&sunfrog=false&page=" + page + "&per-page=12", function (err, body) {
                // If error return
                if (err) { return console.log("Error in request @ scrapeTeeviewPage: ", err); }
                // Parse body into "$" variable
                var $ = cheerio.load(body); 
                // Get links of teespring campaigns of the page queried
                $(".thumbnail").each(function (i, el) {
                    var campaignUrl = $(this).find("h3 a").attr("href");
                    var campaignTimeAgo = $(this).find("p.text-muted small").text();
                    // If reached campaigns added within the last day or latest campaign queried break each loop
                    if (campaignTimeAgo.indexOf("day") !== -1 || config.latestCampaignLink === campaignUrl) {
                        continueScraping = false;
                        return false;
                    }
                    // Add the campaign data to teeviewData
                    teeviewData.push(campaignUrl);
                });
                // Continue scraping if it should
                if (continueScraping) {
                    scrapeTeeviewPage(page+1);
                } else {
                    console.log("Finished scraping teeview.org");
                    // It ended scraping. Go on to the next phase i.e. updateCampaignsOnFirebase.
                    updateCampaignsOnFirebase();
                }
            });
        }

        // ####---- Fourth Function: Updates "campaigns" Firebase node ----####

        // Updates "campaigns" node on Firebase
        function updateCampaignsOnFirebase () {
            console.log("Started adding campaigns to Firebase");
            // Update the JSON config file if there is new data on teeview
            if (teeviewData.length > 0) {
                updateConfig({latestCampaignLink: teeviewData[0]});
            }
            // Loop through each campaign url and add if it reporting sales on Teespring
            addCampaignToFirebase(0);
        }
        // Adds campaign to Firebase "campaigns" node 
        function addCampaignToFirebase (i) {
            if (i < teeviewData.length) {
                // Log progress of function
                var progressPercentage = 100*i/teeviewData.length;
                console.log(progressPercentage.toFixed(2) + "%");
                // Get campaign from Teespring
                var campaignUrl = teeviewData[i];
                request(campaignUrl, function (err, body) {
                    // If error return
                    if (err) { return console.log("Error in request @ addCampaignToFirebase: ", err); }
                    // Parse body into "$" variable
                    var $ = cheerio.load(body); 
                    // Get sales data
                    var salesDataText = $(".persistent_timer__order_count").text().toLowerCase();
                    // If reporting sales data add it to Firebase else continue
                    if (salesDataText.indexOf("only") !== -1 || salesDataText.indexOf("sold") !== -1) {
                        campaignsRef.push({
                            url: campaignUrl,
                            name: $(".campaign__name").text(),
                            img: $(".image_stack__image").attr("src")
                        }, function (err) {
                            if (err) { return console.log("Error in request @ addCampaignToFirebase: ", err); }
                            // Write campaign to firebase
                            console.log("Added " + campaignUrl + " into Firebase campaigns node");
                            addCampaignToFirebase(i+1);
                        });
                    } else {
                        // Make next request
                        addCampaignToFirebase(i+1);
                    }
                });
            } else {
                console.log("Finished adding campaigns to Firebase");
                // Ended campaigns updater. Go on to the next step. Update sales data on Firebase.
                updateSalesDataOnFirebase();
            }
        }

        // ####---- Fifth Function: Updates Sales Data of Campaigns Stored on Firebase ----####

        // Define variables
        var salesDataCampaignsUrls = [];
        // Updates "salesData" node on Firebase
        function updateSalesDataOnFirebase () {
            console.log("Started updating salesData node on Firebase");
            // Make asynchronous call to fetch all campaigns
            campaignsRef.once("value").then(function(snapshot) {
                var obj = snapshot.val();
                // Update salesDataCampaignsUrls
                for (var key in obj) {
                    salesDataCampaignsUrls.push(obj[key].url);
                }
                // Loop through each campaign and get the sales data
                addSalesDataToFirebase(0);
            });
        }
        // Adds campaign sales of i-th campaign to Firebase
        function addSalesDataToFirebase (i) {
            if (i < salesDataCampaignsUrls.length) {
                // Log progress of function
                var progressPercentage = 100*i/salesDataCampaignsUrls.length;
                console.log(progressPercentage.toFixed(2) + "%");
                // Get campaign on Teespring
                var campaignUrl = salesDataCampaignsUrls[i];
                request(campaignUrl, function (err, body) {
                    // If error return
                    if (err) { return console.log("Error in request @ addSalesDataToFirebase: ", err); }
                    // Parse body into "$" variable
                    var $ = cheerio.load(body); 
                    // Variables
                    var sales = undefined;
                    var timestamp = Math.floor(Date.now() / 1000);
                    // Get sales data
                    var salesDataText = $(".persistent_timer__order_count").text().toLowerCase();
                    // Get reported sales data depending on wether goal has been achieved or not yet
                    if (salesDataText.indexOf("only") !== -1) {
                        sales = -parseInt(salesDataText.split(" ")[1]);
                    }
                    if (salesDataText.indexOf("sold") !== -1) {
                        sales = parseInt(salesDataText.split(" ")[0]);
                    }
                    // Make entry in "sales_data" table if campaign is reporting sales otherwise append to "campaignUrls_to_delete"
                    if (typeof(sales) === 'number') {
                        salesDataRef.push({campaignUrl: campaignUrl, sales: sales, timestamp: timestamp}, function (err) {
                            if (err) { return console.log("Error in request @ addSalesDataToFirebase: ", err); }
                            // Write sales data to firebase
                            console.log("Added " + sales + " sales to " + campaignUrl + " on Firebase");
                            // Make next request
                            addSalesDataToFirebase(i+1);
                        });
                    } else {
                        return console.log("Error in request @ addSalesDataToFirebase. Sales data is not of type int");
                    }
                });
            } else {
                console.log("Finished updating salesData node on Firebase");
                // Finished the loop
                console.log(">>Finished the loop. I'll go to sleep now. C'ya!");
                updateConfig({lastQueryTimestamp: Math.floor(Date.now()/1000)});
                // Send 200 OK Status code
                res.status(200).send("Status 200 OK");
                // process.exit(); // uncomment this line if running locally
            }
        }

        // Run loop. It starts by cleaning the database. Checking that every campaign added has not ended or
        // is still reporting data, if it is not it deletes it and all sales data associated to it. 
        // Afterwards it scrapes all campaigns on teeview.org which have been added within the last day
        // or up until the latest campaign queried. Whatever happens first. Then it goes on to add this
        // newly added campaigns onto the Firebase database after which it queries each campaign on the
        // database. Both old and new and gets the latest sales reported data from Teespring itself. 
        (function runLoop () { loadConfig(); })();
    } else {
        res.status(200).send("Status 200 OK");
    }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("App listening on port " + PORT);
    console.log("Press Ctrl+C to quit.");
});