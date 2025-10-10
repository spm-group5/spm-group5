import userModel from '../models/user.model.js'; //import the User model
import bcrypt from 'bcrypt'; //import bcrypt for password comparison
import validator from 'validator'; //import validator for input validation

class UserServices {
    // Define user-related service methods here
    static async registerUser(username, roles = [], department = '', hashed_password) {
        // Logic to register a new user
            try {
            // Type validation
            if (typeof username !== 'string') {
                throw new Error('Username must be a string');
            }
            if (!validator.isEmail(username)) {
                throw new Error('Username must be a valid email address');
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

    /**
     * Authenticate user login
     * @param {string} username - Username to authenticate
     * @param {string} password - Plain text password to verify
     * @returns {Object} User object without password if authentication successful
     * @throws {Error} If authentication fails
     */
    static async loginUser(username, password) {
        try {
            // Type validation
            if (typeof username !== 'string') {
                throw new Error('Username must be a string');
            }
            if (typeof password !== 'string') {
                throw new Error('Password must be a string');
            }

            // Check for empty strings after type validation
            if (username.trim() === '') {
                throw new Error('Username must be a string');
            }
            if (password.trim() === '') {
                throw new Error('Password must be a string');
            }

            // Find user by username (exact match, no trimming)
            const user = await userModel.findOne({ username: username });
            if (!user) {
                throw new Error('Invalid username or password');
            }

            // Compare password with hashed password
            const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
            if (!isPasswordValid) {
                throw new Error('Invalid username or password');
            }

            // Return user data without password
            return {
                id: user._id,
                username: user.username,
                roles: user.roles,
                department: user.department
            };
        } catch (err) {
            throw new Error(`Login failed: ${err.message}`);
        }
    }

    /**
     * Get user by ID (for session validation)
     * @param {string} userId - User ID to find
     * @returns {Object} User object without password
     * @throws {Error} If user not found
     */
    static async getUserById(userId) {
        try {
            const user = await userModel.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return {
                id: user._id,
                username: user.username,
                roles: user.roles,
                department: user.department
            };
        } catch (err) {
            throw new Error(`Failed to get user: ${err.message}`);
        }
    }
}

export default UserServices;