const mongoose = require('mongoose'); //for MongoDB connection

//connect with MongoDB database
const connection = mongoose.connect(process.env.MONGO_URI) //input DB connection string from .env
    .then(() => console.log("Connected to MongoDB!"))
    .catch((err) => console.log("Error connecting to MongoDB: ",err));

module.exports = connection; //export the connection for use in other modules