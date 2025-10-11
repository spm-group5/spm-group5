import express from 'express';
const router = express.Router(); //create a new router object
import userController from '../controllers/user.controller.js'; //import the user controller
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'; //import authentication middleware

// Public routes (no authentication required)
router.post('/register', userController.register); //route for user registration
router.post('/login', userController.login); //route for user login
router.post('/logout', userController.logout); //route for user logout

// Protected routes (authentication required)
router.get('/profile', requireAuth, userController.getProfile); //route for getting user profile

// Admin-only routes
router.get('/users', requireAuth, requireRole(['admin']), userController.getAllUsers); //route for getting all users (admin only)

export default router; //export the router for use in other modules
