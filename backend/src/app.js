const express = require('express'); //for Express.js framework
const session = require('express-session'); //for session management

const app = express(); //create the Express application

app.use(express.json()); //middleware to parse JSON request bodies
app.use(express.urlencoded({extended: true})) //middleware to parse URL-encoded request bodies

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }
}));

const userRouter = require('./routes/user.router'); //import user router for user-related routes

//Test route to verify server is running
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use('/users', userRouter); //use the user router for routes starting with '/users'

module.exports = app; //export the Express application for use in server.js