import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Project name must be a non-empty string'
        },
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true

    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Archived'],
        default: 'Active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

projectSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const projectModel = mongoose.models.projects || mongoose.model('projects', projectSchema);

export default projectModel;