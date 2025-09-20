const userModel = require ('../models/user.model'); //import the User model

class UserServices {
    // Define user-related service methods here
    static async registerUser(username, roles = [], department = '', hashed_password) {
        // Logic to register a new user
            try {
            // Type validation
            if (typeof username !== 'string') {
                throw new Error('Username must be a string');
            }
            if (typeof hashed_password !== 'string') {
                throw new Error('Password must be a string');
            }
            if (!Array.isArray(roles)) {
                throw new Error('Roles must be an array');
            }
            if (typeof department !== 'string') {
                throw new Error('Department must be a string');
            }
            
            // Business logic validation
            if (roles.length === 0) {
                throw new Error('At least one role is required');
            }
            
            const validRoles = ['staff', 'manager', 'admin'];
            const invalidRoles = roles.filter(role => !validRoles.includes(role));
            if (invalidRoles.length > 0) {
                throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
            }
            
            const validDepartments = ['hr', 'it', 'sales', 'consultancy', 'systems', 'engineering', 'finance', 'managing director'];
            if (!validDepartments.includes(department)) {
                throw new Error(`Invalid department: ${department}`);
            }
            
            const newUser = new userModel({username, roles, department, hashed_password});
            return await newUser.save();
        }catch(err){
            throw new Error(`Failed to register user: ${err.message}`);
        }
    } 
}

module.exports = UserServices;