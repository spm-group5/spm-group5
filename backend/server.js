const dotenv = require('dotenv'); //for loading environment variables
dotenv.config({path: './environments/.env.test'}); //define path to .env file

const app = require("./src/app"); //import the Express application from src/app.js
const db = require('./src/config/db'); //import the database connection, automatically starting the connection
const userModel = require('./src/models/user.model'); //import the User model to ensure it's registered



const port = process.env.PORT || 3000; //set the port from environment variable or default to 3000

//start the server and listen on the defined port
app.listen(port, () => {
    console.log("Server is running on port " + port);
});

