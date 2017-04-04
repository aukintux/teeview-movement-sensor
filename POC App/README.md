# Teeview Movement Sensor - Proof Of Concept Application

This is the Proof Of Concept Application of the project. This was also the first step developed in order to asess the feasibility of the idea. A Jupyter notebook was written to perform all the tasks to scrape, store and plot the desired information. Additionally to the sales evolution of the campaigns, the plots of velocity and acceleration was also included in order to explore if it would provide better or additional information. The conclusion reached was that due to the non-continuous nature of the sales plot velocity and acceleration add additional noise to the graph with very little extra information. 

## Folder Structure

* __config.json:__ It stores the interval the query is runned, the last campaign queried and the last run time.
* _teeview_analytics.ipynb:__ It contains the Jupyter notebook used to explore the idea.

## Getting Started

Clone the project and run the Jupyter notebook in your local machine.

## Prerequisites for Local Deployment

* Jupyter Notebook

## Built With

* [Jupyter](http://jupyter.org/) - Open source, interactive data science and scientific computing across over 40 programming languages.
* [Python](https://www.python.org/) - Python is a programming language that lets you work quickly
and integrate systems more effectively

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details