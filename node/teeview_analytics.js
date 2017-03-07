// Import modules
const request = require('tinyreq');
const cheerio = require("cheerio");

// This function will make successive get requests to teeview and return the new campaigns that were added
// within the last day or sooner than the latest campaign saved on the last query latest_campaign_link
function teeviewScraper () {
	// >> Code goes here
}

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