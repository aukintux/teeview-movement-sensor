// Import modules
var request = require('tinyreq');
var cheerio = require("cheerio");
var admin = require("firebase-admin");
var fs = require("fs");

// Authenticate Server to Firebase
var serviceAccount = require("./teeview-movement-sensor-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://teeview-movement-sensor.firebaseio.com"
});

// Get Firebase db and its main nodes
var db = admin.database();
var refCampaigns = db.ref("campaigns");
var refSalesData = db.ref("sales_data");
var refDrawData = db.ref("draw_data");
    
// This function will make successive get requests to teeview and return the new campaigns that were added
// within the last day or sooner than the latest campaign saved on the last query latest_campaign_link

// Set variables of: first "page" to query, query while data is "whithin_day" and array to store "teeview_data" 
var page = 1;
var continue_scraping = true;
var teeview_data = [];
var config = require("./config.json");

// Save config object into config file
function update_config (latest_campaign_link, last_query_timestamp) {
    config.latest_campaign_link = latest_campaign_link;
    config.last_query_timestamp = last_query_timestamp;
    fs.writeFile("./config.json", JSON.stringify(config), (err) => {
        if (err) throw err;
        console.log("Saved config.json");
    });
}

// Define recursive teeviewScraper
function teeviewScraper () {
	console.log("starting teeview_scraper...page: ", page);
    // Make request to teeview and scrape campaigns
    request("https://www.teeview.org/site/index?active=true&page=" + page + "&per-page=12", function (err, body) {
    	// If error return
    	if (err) { return console.log("Error in request @ teeviewScraper: ", err); }
    	// Parse body into "$" variable
    	var $ = cheerio.load(body); 
    	// Get links of teespring campaigns of the page queried
    	$(".thumbnail").each(function (i, el) {
    		var campaign_url = $(this).find("h3 a").attr("href");
    		var campaign_time_ago = $(this).find("p.text-muted small").text();
    		// If reached campaigns added within the last day or latest campaign queried break each loop
    		if (campaign_time_ago.indexOf("day") !== -1 || config.latest_campaign_link === campaign_url) {
    			continue_scraping = false;
    			return false;
    		}
    		// Add the campaign data to teeview_data
    		teeview_data.push(campaign_url);
    	});
    	// Continue scraping if it should
    	if (continue_scraping) {
    		page++;
    		teeviewScraper();
    	} else {
             console.log("ending teeview_scraper.");
    		// It ended scraping. Go on to the next phase i.e. campaignsUpdater.
            campaignsUpdater();
    	}
	});
}

// This function will go through the new campaigns returned by the "teeview_scraper" function
// and for each of them request the Teespring campaign in order to find out if it is relevant
// or not based on the fact if the campaign reports sales data or not. If it does it adds the
// new campaign to the respective database table.

function writeCampaignToFirebase (i) {
    if (i < teeview_data.length) {
        var percentage_checked = 100*i/teeview_data.length;
        console.log(percentage_checked.toFixed(2) + "%" + " of teeview_data checked");
        var campaign_url = teeview_data[i];
        request(campaign_url, function (err, body) {
            // If error return
            if (err) { return console.log("Error in request @ writeCampaignToFirebase: ", err); }
            // Parse body into "$" variable
            var $ = cheerio.load(body); 
            // If the html element where sales data is reported exit continue
            var sales_data_html_el = $(".persistent_timer__order_count");
            if (sales_data_html_el.length > 0) {
                var sales_data_text = sales_data_html_el.text().toLowerCase();
                if (sales_data_text.indexOf("only") !== -1 || sales_data_text.indexOf("sold") !== -1) {
                    refCampaigns.push(
                    {
                        url: campaign_url,
                        name: $(".campaign__name").text(),
                        img: "https:" + $(".image_stack__image").attr("src")
                    }, 
                    function (err) {
                        if (err) { return console.log("Error in request @ writeCampaignToFirebase: ", err); }
                        // Write campaign to firebase
                        console.log("wrote into Firebase: ", campaign_url);
                        writeCampaignToFirebase(i+1);
                    });
                } else {
                    // Make next request
                    writeCampaignToFirebase(i+1);
                }
            } else {
                // Make next request
                writeCampaignToFirebase(i+1);
            }
        });
    } else {
        console.log("ending campaigns_updater.")
        // Ended campaigns updater. Go on to the next step. Sales data updater.
        salesDataUpdater();
    }
}


function campaignsUpdater () {
	console.log("starting capaigns_updater...");
    // Update the JSON config file if there is new data on teeview
    if (teeview_data.length > 0) {
        update_config(teeview_data[0], Math.floor(Date.now() / 1000));
    }
    // Loop through each link and check if it reports sales data on Teespring campaign page
    writeCampaignToFirebase(0);
}

// This function will go through the database table that stores the Teespring campaigns that
// report sales data and query each of them on Teespring to get the latest info on sales which
// will be stored as a new entry on the database table that stores the sales or "position" data
// of each relevant campaign.
function writeCampaignSalesToFirebase (i) {
    if (i < data_updater_campaign_urls.length) {
        var campaign_url = data_updater_campaign_urls[i];
        request(campaign_url, function (err, body) {
            // If error return
            if (err) { return console.log("Error in request @ writeCampaignToFirebase: ", err); }
            // Parse body into "$" variable
            var $ = cheerio.load(body); 
            // Variables
            var sales = undefined;
            var timestamp = Math.floor(Date.now() / 1000);
            // Get sales data
            var sales_data_text = $(".persistent_timer__order_count").text().toLowerCase();
            // Get reported sales data depending on wether goal has been achieved or not yet
            if (sales_data_text.indexOf("only") !== -1) {
                sales = -parseInt(sales_data_text.split(" ")[1]);
            }
            if (sales_data_text.indexOf("sold") !== -1) {
                sales = parseInt(sales_data_text.split(" ")[0]);
            }
            // Make entry in "sales_data" table if campaign is reporting sales otherwise append to "campaign_urls_to_delete"
            if (typeof(sales) === 'number') {
                refSalesData.push({campaign_url: campaign_url, sales: sales, timestamp: timestamp}, function (err) {
                    if (err) { return console.log("Error in request @ writeCampaignToFirebase: ", err); }
                    // Write sales data to firebase
                    console.log("wrote into Firebase sales_data_of: ", campaign_url, " with sales: ", sales);
                    // Make next request
                    writeCampaignSalesToFirebase(i+1);
                });
            } else {
                return console.log("Error in request @ writeCampaignToFirebase. Sales data is not of type int");
            }
        });
    } else {
        console.log("finished sales_data_updater.");
        // Finished the loop
        console.log(">>Finished the loop. I'll go to sleep now. C'ya");
        process.exit();
    }
}

var data_updater_campaign_urls = [];

function salesDataUpdater () {
    console.log("starting sales_data_updater...");
    // Make asynchronous call to fetch all campaigns
    refCampaigns.once("value").then(function(snapshot) {
        var obj = snapshot.val();
        // Update data_updater_campaign_urls
        data_updater_campaign_urls = [];
        for (var key in obj) {
            data_updater_campaign_urls.push(obj[key].url);
        }
        // Loop through each campaign and get the sales data
        writeCampaignSalesToFirebase(0);
    });
}





// This function will clean the database removing the entries in both tables i.e. "campaigns" and
// "sales_data" which are associated to campaigns that have already ended
function cleanCampaignFromFirebase (i) {
    if (i < database_cleaner_campaign_urls.length) {
        var campaign_url = database_cleaner_campaign_urls[i];
        console.log("checking campaign for cleanup:", campaign_url);
        request(campaign_url, function (err, body) {
            // If error return
            if (err) { return console.log("Error in request @ writeCampaignToFirebase: ", err); }
            // Parse body into "$" variable
            var $ = cheerio.load(body); 
            // Sales data html element of campaign
            var sales_data_el = $(".persistent_timer__order_count");
            var sales_data_text = undefined;
            if (sales_data_el.length > 0) {
                sales_data_text = sales_data_el.text().toLowerCase();
            }
            // Message on html element if campaign ended
            var campaign_ended = $(".persistent_timer__stats--relaunchable").length > 0;
            // Delete associated rows in "campaigns" and "sales_data" tables if: campaign has ended, not reporting sales data element, or not reporting sales data
            if (campaign_ended || sales_data_text === undefined || (sales_data_text.indexOf("only") !== -1 && sales_data_text.indexOf("sold") !== -1)) {
                console.log("Delete campaign with url:", campaign_url);
                // Delete all sales data related to campaign. Asynchronous.
                refSalesData.orderByChild("campaign_url").equalTo(campaign_url).on("child_added", function (snapshot) {
                    snapshot.ref.remove();
                }, function (err) {
                    console.log("The read failed: " + err.code);
                });
                // Delete actual campaign (there should be only one campaign)
                refCampaigns.orderByChild("url").equalTo(campaign_url).limitToFirst(1).on("child_added", function (snapshot) {
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
        console.log("finished cleanDatabase.");
        // Go on to the next step
        teeviewScraper();
    }
}

var database_cleaner_campaign_urls = [];

function cleanDatabase () {
    console.log("-> cleanDatabase() start");
    // Make asynchronous call to fetch all campaigns
    refCampaigns.once("value").then(function(snapshot) {
        var obj = snapshot.val();
        // Update database_cleaner_campaign_urls
        database_cleaner_campaign_urls = [];
        for (var key in obj) {
            database_cleaner_campaign_urls.push(obj[key].url);
        }
        // Loop through each campaign and clean Firebase it appropriate
        cleanCampaignFromFirebase(0);
    });
}

// Run loop. It starts by cleaning the database. Checking that every campaign added has not ended or
// is still reporting data, if it is not it deletes it and all sales data associated to it. 
// Afterwards it scrapes all campaigns on teeview.org which have been added within the last day
// or up until the latest campaign queried. Whatever happens first. Then it goes on to add this
// newly added campaigns onto the Firebase database after which it queries each campaign on the
// database. Both old and new and gets the latest sales reported data from Teespring itself. 
function runLoop () {
    cleanDatabase();
}
runLoop();