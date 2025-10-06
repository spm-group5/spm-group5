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
        validate: {
            validator: function(v) {
                return v.length <= 5;
            },
            message: 'A task can have a maximum of 5 assignees'
        }
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'projects',
        required: true
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
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurrenceInterval: {
        type: Number,
        default: null,
        validate: {
            validator: function(v) {
                // If task is recurring, interval must be positive
                if (this.isRecurring && (!v || v <= 0)) {
                    return false;
                }
                // If not recurring, interval should be null or undefined
                if (!this.isRecurring && v) {
                    return false;
                }
                return true;
            },
            message: 'Recurrence interval must be a positive number for recurring tasks'
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