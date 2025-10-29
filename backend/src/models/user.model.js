import mongoose from 'mongoose'; //import mongoose for MongoDB interaction
// import '../config/db.js'; //import database configuration to ensure connection
import bcrypt from 'bcryptjs'; //import bcrypt for password hashing
const Schema = mongoose.Schema; //create a Schema constructor

//define the User schema
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        validate: [
            {
                validator: function(v) {
                    return typeof v === 'string' && v.trim().length > 0;
                },
                message: 'Username must be a non-empty string'
            },
            {
                validator: function(v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format'
            }
        ]
    },

    roles: {
        type: [String],
        enum: ['staff', 'manager','admin'],
        required: true,
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0 && v.every(role => typeof role === 'string');
            },
            message: 'Roles must be a non-empty array of strings'
        }
    },
    department:{
        type: String,
        enum: ['hr','it','sales','consultancy','systems','engineering','finance','managing director'],
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Department must be a non-empty string'
        }
    },
    hashed_password:{
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Password must be a non-empty string'
        }
    },

});

userSchema.pre('save', async function(){
    try{
        // Hash the password before saving the user
        var user = this;
        const salt = await(bcrypt.genSalt(10))
        const hashedPassword = await bcrypt.hash(user.hashed_password, salt)

        // Store the hashed password
        user.hashed_password = hashedPassword; 


    } catch(err){
        throw err;
    }
})

const userModel = mongoose.models.users || mongoose.model('users', userSchema); //create or reuse the User model

export default userModel; //export the User model for use in other modules