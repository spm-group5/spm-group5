const router = require('express').Router(); //create a new router object
const userController = require('../controllers/user.controller'); //import the user controller
const { requireAuth } = require('../middleware/auth.middleware'); //import authentication middleware

// Public routes (no authentication required)
router.post('/register', userController.register); //route for user registration
router.post('/login', userController.login); //route for user login
router.post('/logout', userController.logout); //route for user logout

// Protected routes (authentication required)
router.get('/profile', requireAuth, userController.getProfile); //route for getting user profile

module.exports = router; //export the router for use in other modules
