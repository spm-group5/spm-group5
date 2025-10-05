import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const taskSchema = new Schema({
    title: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Title must be a non-empty string'
        }
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 5
    },
    status: {
        type: String,
        enum: ['To Do', 'In Progress', 'Blocked', 'Done'],
        default: 'To Do',
        required: true
    },
    tags: {
        type: String,
        default: '',
        validate: {
            validator: function(v) {
                return typeof v === 'string';
            },
            message: 'Tags must be a string'
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    // Task assignee should be 1 or more 
    assignee: {
        type: [Schema.Types.ObjectId], 
        ref: 'users',
        default: [],
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'projects',
        default: null
    },
    dueDate: {
        type: Date,
        default: null,
        validate: {
            validator: function(v) {
                if (!v) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(v);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate >= today;
            },
            message: 'Due date cannot be in the past'
        }
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

taskSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;