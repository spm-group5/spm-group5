const express = require('express');
const dotenv = require('dotenv');
const app = express();
dotenv.config({path: './environments/.env'});


//connect with MongoDB database
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI) //input DB connection string from .env
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error("Error connecting to MongoDB:",err));

app.get('/', (req, res) => {
    res.send('<h1>Hello, Express.js Server!</h1>');
});

// Example specifying the port and starting the server
const port = process.env.PORT || 3000; // You can use environment variables for port configuration

app.listen(port, () => {
    console.log(`App listening at port ${process.env.PORT}`)
    console.log(`Server is running on port ${port}`);
});