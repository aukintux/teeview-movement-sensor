# Teeview Movement Sensor

The purpose of this project is to create an application which continuously scrapes the data on [Teeview.org](http://www.teeview.org/) in order to find out which campaigns are reporting sales data and keeps an eye on them. It then uses this information to track this campaigns and the ones that are newly added in order to generate sales, sales velocity and sales acceleration plots for the most promising campaigns and this way help spot market opportunities through the identification of potentially successful campaigns before they become a real success and the market becomes saturated.

## Folder Structure

* **POC App:** It contains the initial experimentation work made in order to build the scraper and all functions associated to storing and retrieving data. The POC application to validate the viability of the idea consists of a single Jupyter Notebook.
* **Live App:** It contains the real application consisting of a Backend and a FrontEnd.
⋅⋅* **Backend:** It contains the Node.js application which does the heavy lifting. It scrapes the data from [Teeview.org](http://www.teeview.org). Filters the relevant campaigns (those which report sales data). Stores them on Firebase and performs the updating of sales data on Firebase as well. This Backend runs on Google Cloud Platform App Engine every 3 hours in order to continuosly scrape and gather data of relevant campaigns.
⋅⋅* **FrontEnd:** It contains the Angular.js application which retrieves the Firebase stored data and shows the plots of the top performing campaigns in order to spot market oportunities.

## Getting Started

Clone the project in your local machine and explore the project.

* For POC App: Run the Jupyter Notebook on your local machine.
* For Live App: Explore Backend or FrontEnd

## Prerequisites for Local Deployment

* Jupyter Notebook
* Node.js

## Built With

* [Jupyter](http://jupyter.org/) - Open source, interactive data science and scientific computing across over 40 programming languages.
* [Python](https://www.python.org/) - Python is a programming language that lets you work quickly
and integrate systems more effectively
* [Node.js](https://nodejs.org/en/) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine. 

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details