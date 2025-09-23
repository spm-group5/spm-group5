const UserService = require('../services/user.services'); //import the user service for business logic

//Controller for user-related operations

//register a new user
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

//login a user
exports.login = async(req, res, next) => {
    try {

    }
    catch(err) {

    }
}