const router = require('express').Router(); //create a new router object
const userController = require('../controllers/user.controller'); //import the user controller

router.post('/register', userController.register); //route for user registration

module.exports = router; //export the router for use in other modules
