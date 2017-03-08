// Import modules
var request = require('tinyreq');
var cheerio = require("cheerio");
var admin = require("firebase-admin");

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
var config_data = require("./config.json");

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
    		if (campaign_time_ago.indexOf("day") !== -1 || config_data["LATEST_CAMPAIGN_LINK"] === campaign_url) {
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
    		// It ended scraping. Go on to the next phase i.e. campaignsUpdater.
    	}
	});
}

// Activate teeviewScraper
teeviewScraper();

// This function will go through the new campaigns returned by the "teeview_scraper" function
// and for each of them request the Teespring campaign in order to find out if it is relevant
// or not based on the fact if the campaign reports sales data or not. If it does it adds the
// new campaign to the respective database table.
function campaignsUpdater (teeviewData) {
	// >> Code goes here
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