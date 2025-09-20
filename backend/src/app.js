const express = require('express'); //for Express.js framework

const app = express(); //create the Express application

app.use(express.json()); //middleware to parse JSON request bodies
app.use(express.urlencoded({extended: true})) //middleware to parse URL-encoded request bodies

const userRouter = require('./routes/user.router'); //import user router for user-related routes

//Test route to verify server is running
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use('/users', userRouter); //use the user router for routes starting with '/users'

module.exports = app; //export the Express application for use in server.js