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
var refCampaigns = db.ref("draw_data");
    
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
    		if (campaign_time_ago.indexOf("day") !== -1 || config["LATEST_CAMPAIGN_LINK"] === campaign_url) {
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

// Activate teeviewScraper
teeviewScraper();

// This function will go through the new campaigns returned by the "teeview_scraper" function
// and for each of them request the Teespring campaign in order to find out if it is relevant
// or not based on the fact if the campaign reports sales data or not. If it does it adds the
// new campaign to the respective database table.

function writeCampaignToFirebase (i) {
    console.log("writeCampaignToFirebase::", i);
    if (i < teeview_data.length) {
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
                    // Write campaign to firebase
                    console.log("write into Firebase: ", campaign_url);
                    writeCampaignToFirebase(i+1);
                    // campaigns.append((campaign_url, html.select(".campaign__name")[0].getText(), "https:" + html.select(".image_stack__image")[0]["src"]))
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
    }
}


function campaignsUpdater () {
	console.log("starting capaigns_updater...");
    // Update the JSON config file if there is new data on teeview
    if (teeview_data) {
        update_config(teeview_data[0], Math.floor(Date.now() / 1000));
    }
    // Loop through each link and check if it reports sales data on Teespring campaign page
    writeCampaignToFirebase(0);
}

// This function will go through the database table that stores the Teespring campaigns that
// report sales data and query each of them on Teespring to get the latest info on sales which
// will be stored as a new entry on the database table that stores the sales or "position" data
// of each relevant campaign.
function salesDataUpdater () {
	// >> Code goes here
}

// This function is in charge of plotting all campaigns in the database for which there is a high
// achievement potential. In order to know this one needs to first select the ones that have enough
// data to make an assessment about it. Those campaigns with more than 10 entries on the "sales_data"
// database table will be selected. Among those only the ones with high achievement potential will
// be plotted in order of importance, starting by acceleration, velocity and finally position
function updateDrawingPlots () {
	// >> Code goes here
}