# Teeview Movement Sensor - Live Application

This corresponds to the Live Application. Once the Proof Of Concept was developed the conclusion was reached that there were indeed moving campaigns. After having decided to go forward with the project the decision was made about the techonologies that would be used in the development of the live application. Firebase was chosen as a database due to its real-time capabilities as well as automatic push to all connected devices through its AngularFire library. This in turn led to the almost parallel decision to use AngularJS to create the FrontEnd of the application. Lastly, because of having chosen Firebase to store the data it was imposed the use of Node to create the scraper in order to interact with Firebase since the Firebase Admin SDK not compatible with Python. A live version of the app is available at [Teeview.pro](https://teeview.pro/)

## Folder Structure

* __Backend:__ It contains the scraper implemented in Node.js along with the storing of data on Firebase and set up for Google Cloud deployment.
* __Frontend:__ It contains the single page only FrontEnd application.

## Getting Started

Clone the project in your local machine and explore the project. Open the Frontend folder and double click on index.html to open the file on your explorer of choice.

## Prerequisites for Local Deployment

There are no prerequisites for the local deployment of the Frontend. In order to run the backend locally Node.js must be installed, node modules are already included.

## Built With

* [Firebase](https://firebase.google.com/) - In particular their database service.
* [Google Cloud](https://cloud.google.com/) - In particular their app engine service.
* [Node.js](https://nodejs.org/en/) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine. 

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details