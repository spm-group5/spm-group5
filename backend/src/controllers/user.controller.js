const UserService = require('../services/user.services'); //import the user service for business logic

//Controller for user-related operations


exports.register = async(req, res, next) => {
    try{
        //extract user details from request body
        const {username, roles,department,hashed_password} = req.body

        //call the user service to register the user
        const successRes = await UserService.registerUser(username, roles, department, hashed_password);

        //send success response
        res.status(201).json({message: "User registered successfully", data: successRes});
        }
    catch(err){
        //handle errors and send error response
        res.status(500).json({message: "Error registering user", error: err.message});
    }
}

exports.login = async(req, res, next) => {
    try {
        // Extract login credentials from request body
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        // Call the user service to authenticate the user
        const user = await UserService.loginUser(username, password);

        // Set session data
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRoles = user.roles;
        req.session.userDepartment = user.department;
        req.session.authenticated = true;

        // Send success response (exclude sensitive data)
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                roles: user.roles,
                department: user.department
            }
        });
    } catch (err) {
        // Handle authentication errors
        res.status(401).json({
            message: "Login failed",
            error: err.message
        });
    }
}

exports.logout = async(req, res, next) => {
    try {
        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    message: "Error during logout",
                    error: err.message
                });
            }
            
            // Clear the session cookie
            res.clearCookie('connect.sid'); // Default session cookie name
            
            res.status(200).json({
                message: "Logout successful"
            });
        });
    } catch (err) {
        res.status(500).json({
            message: "Error during logout",
            error: err.message
        });
    }
}

exports.getProfile = async(req, res, next) => {
    try {
        // Get user profile from session
        if (!req.session || !req.session.authenticated) {
            return res.status(401).json({
                message: "Not authenticated"
            });
        }

        res.status(200).json({
            user: {
                id: req.session.userId,
                username: req.session.username,
                roles: req.session.userRoles,
                department: req.session.userDepartment
            }
        });
    } catch (err) {
        res.status(500).json({
            message: "Error getting profile",
            error: err.message
        });
    }
}